/*
 * Image hardening smoke test suite
 *
 * Run:
 *   npm run test:image-hardening
 *
 * Env:
 *   API_BASE_URL=http://localhost:5000/api
 *   ADMIN_TEST_TOKEN=<jwt>
 *   OR ADMIN_TEST_EMAIL + ADMIN_TEST_PASSWORD
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

const assertCase = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const logStep = (message) => {
  console.log(`[STEP] ${message}`);
};

const logPass = (message) => {
  console.log(`[PASS] ${message}`);
};

const getAdminToken = async () => {
  if (process.env.ADMIN_TEST_TOKEN) {
    return process.env.ADMIN_TEST_TOKEN;
  }

  const email = process.env.ADMIN_TEST_EMAIL;
  const password = process.env.ADMIN_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('Thiếu ADMIN_TEST_TOKEN hoặc ADMIN_TEST_EMAIL + ADMIN_TEST_PASSWORD');
  }

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  if (!response.ok || !data?.data?.token) {
    throw new Error(`Không lấy được token admin: ${JSON.stringify(data)}`);
  }

  return data.data.token;
};

const getAnyCategoryId = async (token) => {
  const response = await fetch(`${API_BASE_URL}/categories`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok || !data?.data?.length) {
    throw new Error('Không lấy được category để test ảnh');
  }

  return data.data[0].category_id;
};

const createProductMultipart = async (token, categoryId, fileBuffer, filename, mimeType, productName) => {
  const formData = new FormData();
  formData.append('productName', productName);
  formData.append('price', '12345');
  formData.append('stock', '2');
  formData.append('categoryId', String(categoryId));
  formData.append('image', new Blob([fileBuffer], { type: mimeType }), filename);

  const response = await fetch(`${API_BASE_URL}/admin/products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json();
  return { response, data };
};

const createProductJson = async (token, payload) => {
  const response = await fetch(`${API_BASE_URL}/admin/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  return { response, data };
};

const deleteProduct = async (token, productId) => {
  await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

const run = async () => {
  const createdProductIds = [];
  const tempFiles = [];
  let adminToken = null;

  try {
    logStep('Lấy token admin và category test');
    const token = await getAdminToken();
    adminToken = token;
    const categoryId = await getAnyCategoryId(token);

    logStep('Case 1: Upload giả mạo MIME image phải bị chặn');
    const fakeImagePayload = Buffer.from('not an image, spoofed MIME', 'utf8');
    const spoofed = await createProductMultipart(
      token,
      categoryId,
      fakeImagePayload,
      'spoofed.jpg',
      'image/jpeg',
      `Security Spoof ${Date.now()}`
    );

    assertCase(
      spoofed.response.status === 400 && spoofed.data?.success === false,
      `Kỳ vọng case spoofed bị chặn 400, thực tế: HTTP ${spoofed.response.status} - ${JSON.stringify(spoofed.data)}`
    );
    logPass('Case 1 OK');

    logStep('Case 2: Upload ảnh vượt kích thước cho phép phải bị chặn');
    const oversizedBuffer = await sharp({
      create: {
        width: 5001,
        height: 200,
        channels: 3,
        background: { r: 220, g: 220, b: 220 }
      }
    })
      .png()
      .toBuffer();

    const oversized = await createProductMultipart(
      token,
      categoryId,
      oversizedBuffer,
      'oversized.png',
      'image/png',
      `Security Oversized ${Date.now()}`
    );

    assertCase(
      oversized.response.status === 400 && oversized.data?.success === false,
      `Kỳ vọng case oversized bị chặn 400, thực tế: HTTP ${oversized.response.status} - ${JSON.stringify(oversized.data)}`
    );
    logPass('Case 2 OK');

    logStep('Case 3: Upload ảnh hợp lệ phải thành công');
    const validBuffer = await sharp({
      create: {
        width: 1280,
        height: 720,
        channels: 3,
        background: { r: 90, g: 150, b: 240 }
      }
    })
      .jpeg({ quality: 92 })
      .toBuffer();

    const valid = await createProductMultipart(
      token,
      categoryId,
      validBuffer,
      'valid.jpg',
      'image/jpeg',
      `Security Valid ${Date.now()}`
    );

    assertCase(
      valid.response.status === 201 && valid.data?.success === true,
      `Kỳ vọng case valid thành công 201, thực tế: HTTP ${valid.response.status} - ${JSON.stringify(valid.data)}`
    );

    if (valid?.data?.data?.ProductId) {
      createdProductIds.push(valid.data.data.ProductId);
    }
    logPass('Case 3 OK');

    logStep('Case 4: Dùng đường dẫn local hợp lệ phải thành công');
    const tempPath = path.join(os.tmpdir(), `local-image-${Date.now()}.png`);
    tempFiles.push(tempPath);
    await sharp({
      create: {
        width: 900,
        height: 600,
        channels: 3,
        background: { r: 40, g: 200, b: 130 }
      }
    })
      .png()
      .toFile(tempPath);

    const localPathResult = await createProductJson(token, {
      productName: `Security LocalPath ${Date.now()}`,
      description: 'Local path image test',
      price: 67890,
      stock: 3,
      categoryId,
      imageUrl: tempPath
    });

    assertCase(
      localPathResult.response.status === 201 && localPathResult.data?.success === true,
      `Kỳ vọng case local path thành công 201, thực tế: HTTP ${localPathResult.response.status} - ${JSON.stringify(localPathResult.data)}`
    );

    if (localPathResult?.data?.data?.ProductId) {
      createdProductIds.push(localPathResult.data.data.ProductId);
    }
    logPass('Case 4 OK');

    console.log('\n[SUMMARY] Tất cả case image hardening đã PASS.');
    process.exit(0);
  } catch (error) {
    console.error('\n[FAIL]', error.message || String(error));
    process.exitCode = 1;
  } finally {
    for (const productId of createdProductIds) {
      try {
        if (adminToken) {
          await deleteProduct(adminToken, productId);
        }
      } catch (error) {
        console.warn(`[WARN] Không xóa được product test ID ${productId}: ${error.message}`);
      }
    }

    for (const tempPath of tempFiles) {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (error) {
        console.warn(`[WARN] Không xóa được file temp ${tempPath}: ${error.message}`);
      }
    }
  }
};

run();
