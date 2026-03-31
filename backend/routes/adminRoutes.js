/**
 * Admin Routes
 * Định tuyến cho admin
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');
const { productValidation, categoryValidation, idValidation, orderStatusValidation, returnProcessValidation, promotionEmailValidation } = require('../middleware/validation');
const upload = require('../middleware/upload');

// Áp dụng middleware xác thực và kiểm tra admin cho tất cả routes
router.use(authenticate, isAdmin);

/**
 * QUẢN LÝ SẢN PHẨM
 */

// Upload ảnh dùng chung cho sản phẩm/biến thể
router.post('/uploads/image', upload.single('image'), adminController.uploadProductImage);

// Tạo sản phẩm (với upload file hoặc URL ảnh)
router.post('/products', upload.single('image'), productValidation, adminController.createProduct);

// Cập nhật sản phẩm (với upload file hoặc URL ảnh)
router.put('/products/:id', upload.single('image'), idValidation, productValidation, adminController.updateProduct);

// Xóa sản phẩm
router.delete('/products/:id', idValidation, adminController.deleteProduct);

/**
 * QUẢN LÝ DANH MỤC
 */

// Tạo danh mục
router.post('/categories', categoryValidation, adminController.createCategory);

// Cập nhật danh mục
router.put('/categories/:id', idValidation, categoryValidation, adminController.updateCategory);

// Xóa danh mục
router.delete('/categories/:id', idValidation, adminController.deleteCategory);

/**
 * QUẢN LÝ ĐƠN HÀNG
 */

// Lấy tất cả đơn hàng
router.get('/orders', adminController.getAllOrders);

// Cập nhật trạng thái đơn hàng
router.put('/orders/:id', idValidation, orderStatusValidation, adminController.updateOrderStatus);

// Cập nhật trạng thái vận chuyển / mã vận đơn
router.put('/orders/:id/shipping', idValidation, adminController.updateShippingProgress);

// Xử lý yêu cầu hoàn trả sau khi shop kiểm hàng
router.put('/orders/:id/process-return', idValidation, returnProcessValidation, adminController.processReturnRequest);

// Gửi email khuyến mãi đến khách hàng
router.post('/marketing/promotions', promotionEmailValidation, adminController.sendPromotionCampaign);

/**
 * QUẢN LÝ NGƯỜI DÙNG
 */

// Lấy tất cả người dùng
router.get('/users', adminController.getAllUsers);

// Khóa/Mở khóa người dùng
router.put('/users/:id/toggle-lock', idValidation, adminController.toggleUserLock);

/**
 * THỐNG KÊ
 */

// Lấy thống kê
router.get('/statistics', adminController.getStatistics);

// AI phan tich doanh thu, loi nhuan, san pham ban cham
router.get('/ai-insights', adminController.getAiBusinessInsights);

module.exports = router;
