/**
 * Image Utils
 * Tải ảnh từ internet và lưu vào ổ đĩa
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, '../uploads/images');

const IMAGE_SIGNATURES = [
  { type: 'jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: 'gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { type: 'webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, extra: [0x57, 0x45, 0x42, 0x50], extraOffset: 8 }
];

/**
 * Download ảnh từ URL và lưu vào disk
 * @param {string} imageUrl - URL của ảnh
 * @returns {Promise<string>} - Đường dẫn file được lưu (relative)
 */
const downloadAndSaveImage = (imageUrl) => {
  return new Promise((resolve, reject) => {
    try {
      // Tạo tên file
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const urlPath = new URL(imageUrl).pathname;
      const ext = path.extname(urlPath) || '.jpg';
      const filename = `downloaded-${uniqueSuffix}${ext}`;
      const filepath = path.join(uploadDir, filename);

      const requestHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.youtube.com/'
      };

      const cleanupFile = () => {
        fs.unlink(filepath, () => {});
      };

      const download = (targetUrl, redirectCount = 0) => {
        const protocol = targetUrl.startsWith('https') ? https : http;
        const request = protocol.get(targetUrl, { headers: requestHeaders }, (response) => {
          const statusCode = response.statusCode || 0;

          // Follow redirect tối đa 5 lần
          if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
            response.resume();
            if (redirectCount >= 5) {
              reject(new Error('Redirect quá nhiều lần khi tải ảnh'));
              return;
            }

            const nextUrl = new URL(response.headers.location, targetUrl).toString();
            download(nextUrl, redirectCount + 1);
            return;
          }

          if (statusCode !== 200) {
            response.resume();
            reject(new Error(`Failed to download image: ${statusCode}`));
            return;
          }

          const contentType = String(response.headers['content-type'] || '').toLowerCase();
          if (contentType && !contentType.startsWith('image/')) {
            response.resume();
            reject(new Error(`URL không trả về ảnh hợp lệ (content-type: ${contentType})`));
            return;
          }

          const file = fs.createWriteStream(filepath);

          response.pipe(file);

          file.on('finish', () => {
            // Trên Windows cần đợi close callback để đảm bảo file không còn bị lock.
            file.close((closeError) => {
              if (closeError) {
                cleanupFile();
                reject(closeError);
                return;
              }

              resolve(`/uploads/images/${filename}`);
            });
          });

          file.on('error', (fileError) => {
            file.destroy();
            cleanupFile();
            reject(fileError);
          });

          response.on('error', (streamError) => {
            file.destroy();
            cleanupFile();
            reject(streamError);
          });
        });

        request.setTimeout(20000, () => {
          request.destroy(new Error('Timeout khi tải ảnh từ URL'));
        });

        request.on('error', (requestError) => {
          cleanupFile();
          reject(requestError);
        });
      };

      download(imageUrl, 0);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Xóa file ảnh
 * @param {string} imagePath - Đường dẫn file ảnh (relative hoặc absolute)
 */
const deleteImage = (imagePath) => {
  try {
    if (!imagePath) return;
    
    // Xử lý nếu imagePath là URL path (/uploads/images/...)
    const filename = imagePath.includes('/uploads/images/') 
      ? imagePath.split('/uploads/images/')[1]
      : path.basename(imagePath);
    
    const filepath = path.join(uploadDir, filename);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (error) {
    console.error('Lỗi xóa ảnh:', error);
  }
};

/**
 * Copy ảnh từ đường dẫn local vào thư mục uploads/images
 * @param {string} localPath - Đường dẫn tuyệt đối trên máy chủ
 * @returns {string} Đường dẫn public tương đối
 */
const copyLocalImageToUploads = (localPath) => {
  if (!localPath || typeof localPath !== 'string') {
    throw new Error('Đường dẫn ảnh local không hợp lệ');
  }

  const normalizedPath = localPath.trim().replace(/^file:\/\//i, '');

  if (!fs.existsSync(normalizedPath)) {
    throw new Error('Không tìm thấy file ảnh tại đường dẫn local');
  }

  const stats = fs.statSync(normalizedPath);
  if (!stats.isFile()) {
    throw new Error('Đường dẫn local phải trỏ tới file ảnh');
  }

  const ext = (path.extname(normalizedPath) || '.jpg').toLowerCase();
  const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  if (!allowedExt.includes(ext)) {
    throw new Error('Chỉ hỗ trợ ảnh .jpg, .jpeg, .png, .webp, .gif');
  }

  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const filename = `local-${uniqueSuffix}${ext}`;
  const destinationPath = path.join(uploadDir, filename);

  fs.copyFileSync(normalizedPath, destinationPath);
  return `/uploads/images/${filename}`;
};

/**
 * Kiểm tra chữ ký file ảnh (magic bytes)
 * @param {string} filePath - Đường dẫn file cần kiểm tra
 * @returns {boolean}
 */
const isValidImageSignature = (filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return false;
    }

    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(16);
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    return IMAGE_SIGNATURES.some((signature) => {
      const offset = signature.offset || 0;
      const matchedMain = signature.bytes.every((value, index) => buffer[offset + index] === value);
      if (!matchedMain) return false;

      if (!signature.extra) return true;
      const extraOffset = signature.extraOffset || 0;
      return signature.extra.every((value, index) => buffer[extraOffset + index] === value);
    });
  } catch (error) {
    return false;
  }
};

/**
 * Chuyển public path (/uploads/images/...) thành absolute path
 * @param {string} publicPath
 * @returns {string|null}
 */
const resolveUploadFilePath = (publicPath) => {
  if (!publicPath || typeof publicPath !== 'string') {
    return null;
  }

  const marker = '/uploads/images/';
  if (!publicPath.includes(marker)) {
    return null;
  }

  const filename = publicPath.split(marker)[1];
  if (!filename) {
    return null;
  }

  return path.join(uploadDir, filename);
};

/**
 * Kiểm tra kích thước và re-encode ảnh upload để loại payload ẩn
 * @param {string} filePath
 * @param {Object} options
 * @returns {Promise<Object>}
 */
const normalizeUploadedImage = async (filePath, options = {}) => {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('Không tìm thấy file ảnh để chuẩn hóa');
  }

  const {
    maxWidth = 4000,
    maxHeight = 4000,
    jpegQuality = 82,
    webpQuality = 82
  } = options;

  const sourceBuffer = fs.readFileSync(filePath);
  const image = sharp(sourceBuffer, { failOn: 'none' });
  const metadata = await image.metadata();

  if (!metadata?.width || !metadata?.height) {
    throw new Error('Không đọc được metadata ảnh');
  }

  if (metadata.width > maxWidth || metadata.height > maxHeight) {
    throw new Error(`Kích thước ảnh vượt giới hạn ${maxWidth}x${maxHeight}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  const pipeline = sharp(sourceBuffer).rotate();

  if (ext === '.jpg' || ext === '.jpeg') {
    const outputBuffer = await pipeline.jpeg({ quality: jpegQuality, mozjpeg: true }).toBuffer();
    fs.writeFileSync(filePath, outputBuffer);
    return { width: metadata.width, height: metadata.height, format: 'jpeg', normalized: true };
  }

  if (ext === '.png') {
    const outputBuffer = await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer();
    fs.writeFileSync(filePath, outputBuffer);
    return { width: metadata.width, height: metadata.height, format: 'png', normalized: true };
  }

  if (ext === '.webp') {
    const outputBuffer = await pipeline.webp({ quality: webpQuality }).toBuffer();
    fs.writeFileSync(filePath, outputBuffer);
    return { width: metadata.width, height: metadata.height, format: 'webp', normalized: true };
  }

  // GIF: giữ nguyên nội dung (không re-encode để tránh mất animation), chỉ validate metadata
  return { width: metadata.width, height: metadata.height, format: metadata.format || ext.replace('.', ''), normalized: false };
};

module.exports = {
  downloadAndSaveImage,
  deleteImage,
  copyLocalImageToUploads,
  isValidImageSignature,
  resolveUploadFilePath,
  normalizeUploadedImage
};
