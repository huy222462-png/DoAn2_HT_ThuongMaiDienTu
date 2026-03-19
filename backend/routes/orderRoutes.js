/**
 * Order Routes
 * Định tuyến cho đơn hàng
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const { orderValidation, idValidation, cancelOrderValidation, returnRequestValidation } = require('../middleware/validation');

/**
 * @route   POST /api/orders/create
 * @desc    Tạo đơn hàng mới
 * @access  Private
 */
router.post('/create', authenticate, orderValidation, orderController.createOrder);

/**
 * @route   POST /api/orders/preview-pricing
 * @desc    Xem trước giá đơn khi áp mã giảm giá
 * @access  Private
 */
router.post('/preview-pricing', authenticate, orderController.previewOrderPricing);

/**
 * @route   GET /api/orders/history
 * @desc    Lấy lịch sử đơn hàng
 * @access  Private
 */
router.get('/history', authenticate, orderController.getOrderHistory);

/**
 * @route   PUT /api/orders/:id/cancel
 * @desc    Hủy đơn hàng
 * @access  Private
 */
router.put('/:id/cancel', authenticate, idValidation, cancelOrderValidation, orderController.cancelOrder);

/**
 * @route   PUT /api/orders/:id/request-return
 * @desc    Gửi yêu cầu trả hàng
 * @access  Private
 */
router.put('/:id/request-return', authenticate, idValidation, returnRequestValidation, orderController.requestReturn);

/**
 * @route   PUT /api/orders/:id/return-shipped
 * @desc    Khách xác nhận đã gửi hàng trả về shop
 * @access  Private
 */
router.put('/:id/return-shipped', authenticate, idValidation, orderController.confirmReturnShipped);

/**
 * @route   GET /api/orders/:id
 * @desc    Lấy chi tiết đơn hàng
 * @access  Private
 */
router.get('/:id', authenticate, idValidation, orderController.getOrderById);

module.exports = router;
