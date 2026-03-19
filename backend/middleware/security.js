/**
 * Security Middleware
 * Các middleware bảo mật cho hệ thống
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const config = require('../config/config');

const isDevelopment = (config.env || process.env.NODE_ENV) === 'development';

/**
 * Rate limiting - Giới hạn số request
 * Chống spam và brute force attack
 */
const apiLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs, // 15 phút
  max: isDevelopment ? 1000 : config.security.rateLimitMaxRequests, // Dev nới hạn mức để tránh chặn local
  message: {
    success: false,
    message: 'Quá nhiều request từ IP này. Vui lòng thử lại sau.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limit riêng cho cụm auth
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 300 : 60,
  message: {
    success: false,
    message: 'Quá nhiều request đến nhóm xác thực. Vui lòng thử lại sau.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limit riêng cho chatbot
 */
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 120 : 25,
  message: {
    success: false,
    message: 'Bạn đang gửi quá nhiều câu hỏi trong thời gian ngắn. Vui lòng thử lại sau ít phút.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limit riêng cho admin actions
 */
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isDevelopment ? 600 : 120,
  message: {
    success: false,
    message: 'Quá nhiều thao tác quản trị trong thời gian ngắn. Vui lòng chờ và thử lại.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiting nghiêm ngặt cho login
 * Chống brute force đăng nhập
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10, // Chỉ cho phép 10 lần đăng nhập trong 15 phút
  message: {
    success: false,
    message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.'
  },
  skipSuccessfulRequests: true // Không đếm request thành công
});

/**
 * Helmet - Thiết lập HTTP security headers
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  // Cho phép frontend khác origin (localhost:3000/5500) tải ảnh từ backend static uploads.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * XSS Clean - Chống XSS attack
 * Làm sạch dữ liệu đầu vào
 */
const xssProtection = xss();

/**
 * HPP - HTTP Parameter Pollution protection
 * Chống tấn công thông qua duplicate parameters
 */
const hppProtection = hpp();

/**
 * CORS Configuration
 */
const corsOptions = {
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  optionsSuccessStatus: 200
};

module.exports = {
  apiLimiter,
  authLimiter,
  chatLimiter,
  adminLimiter,
  loginLimiter,
  securityHeaders,
  xssProtection,
  hppProtection,
  corsOptions
};
