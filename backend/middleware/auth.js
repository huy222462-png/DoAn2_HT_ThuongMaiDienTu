/**
 * Authentication Middleware
 * Middleware xác thực JWT token
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const UserModel = require('../models/UserModel');

/**
 * Middleware xác thực token
 * Kiểm tra và verify JWT token từ header
 */
const authenticate = async (req, res, next) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    
    const token = authHeader?.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy token xác thực'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Lấy thông tin user
    const user = await UserModel.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User không tồn tại'
      });
    }
    
    // Kiểm tra tài khoản có bị khóa không
    if (user.IsLocked) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khóa. Vui lòng liên hệ admin.'
      });
    }

    // Gắn user vào request
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth error:', error.name, error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Lỗi xác thực: ' + error.message
    });
  }
};

/**
 * Middleware kiểm tra quyền admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Chưa xác thực'
    });
  }
  
  if (!req.user.IsAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập. Chỉ admin mới có thể thực hiện.'
    });
  }
  
  next();
};

module.exports = {
  authenticate,
  isAdmin
};
