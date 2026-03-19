/**
 * Error Handler Middleware
 * Middleware xử lý lỗi tập trung
 */

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // SQL Server errors
  if (err.name === 'ConnectionError' || err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      message: 'Lỗi kết nối database'
    });
  }
  
  // Duplicate key error (SQL Server)
  if (err.number === 2627 || err.number === 2601) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu đã tồn tại'
    });
  }
  
  // Foreign key constraint
  if (err.number === 547) {
    return res.status(400).json({
      success: false,
      message: 'Vi phạm ràng buộc dữ liệu'
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token đã hết hạn'
    });
  }
  
  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Lỗi server',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Middleware xử lý 404 Not Found
 */
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} không tồn tại`
  });
};

module.exports = {
  errorHandler,
  notFound
};
