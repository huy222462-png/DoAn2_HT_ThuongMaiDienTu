/**
 * API Configuration
 */

// API Base URL - Update this to match your backend server
const API_BASE_URL = 'http://localhost:5000/api';
const SERVER_URL = 'http://localhost:5000';
const warnedLocalImagePaths = new Set();

const AUTH_ENDPOINTS = {
  forgotPassword: `${API_BASE_URL}/auth/forgot-password`,
  resetPassword: `${API_BASE_URL}/auth/reset-password`
};

// Bank transfer info used on checkout page.
// You can edit these values directly when changing receiving account details.
window.APP_CONFIG = window.APP_CONFIG || {};
window.APP_CONFIG.bankTransfer = {
  bankName: 'Agribank',
  bankCode: '970436',
  accountNo: '6704262188556',
  accountName: 'Nguyễn Võ Khánh Huy',
  bankLink: 'https://vcbdigibank.vietcombank.com.vn/'
};

// Common headers for API requests
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Chuẩn hóa đường dẫn ảnh về URL có thể truy cập từ trình duyệt
 * @param {string} imageUrl - URL ảnh từ database
 * @returns {string} - HTTP URL hợp lệ
 */
function getImageUrl(imageUrl) {
  if (!imageUrl) {
    return getPlaceholderImage(300, 200, 'Chưa có ảnh');
  }

  const normalized = String(imageUrl).trim();
  
  // Nếu là đường dẫn tương đối từ server (/uploads/images/...)
  if (normalized.startsWith('/uploads/')) {
    return SERVER_URL + normalized;
  }

  // Nếu là file:// hoặc đường dẫn ổ đĩa Windows, chỉ lấy tên file trong uploads
  if (normalized.startsWith('file://') || /^[a-zA-Z]:\\/.test(normalized)) {
    if (!warnedLocalImagePaths.has(normalized)) {
      warnedLocalImagePaths.add(normalized);
      console.warn('Ảnh local path chưa được migrate sang uploads:', normalized);
    }

    // Tránh request lỗi do browser không thể truy cập trực tiếp đường dẫn ổ đĩa.
    return getPlaceholderImage(300, 200, 'Anh chua migrate');
  }
  
  // Nếu là HTTP URL, giữ nguyên
  if (normalized.startsWith('http')) {
    return normalized;
  }
  
  // Mặc định: thêm /uploads/images/ nếu chỉ có tên file
  return `${SERVER_URL}/uploads/images/${normalized}`;
}
