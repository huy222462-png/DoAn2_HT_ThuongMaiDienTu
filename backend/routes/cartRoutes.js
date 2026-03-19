/**
 * Cart Routes
 * Định tuyến cho giỏ hàng
 */

const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticate } = require('../middleware/auth');
const { cartValidation } = require('../middleware/validation');

/**
 * @route   GET /api/cart
 * @desc    Lấy giỏ hàng
 * @access  Private
 */
router.get('/', authenticate, cartController.getCart);

/**
 * @route   GET /api/cart/recommendations
 * @desc    Gợi ý sản phẩm liên quan theo giỏ hàng
 * @access  Private
 */
router.get('/recommendations', authenticate, cartController.getCartRecommendations);

/**
 * @route   POST /api/cart/add
 * @desc    Thêm sản phẩm vào giỏ
 * @access  Private
 */
router.post('/add', authenticate, cartValidation, cartController.addToCart);

/**
 * @route   PUT /api/cart/update
 * @desc    Cập nhật số lượng sản phẩm
 * @access  Private
 */
router.put('/update', authenticate, cartController.updateCartItem);

/**
 * @route   DELETE /api/cart/remove/:cartId
 * @desc    Xóa sản phẩm khỏi giỏ
 * @access  Private
 */
router.delete('/remove/:cartId', authenticate, cartController.removeFromCart);

/**
 * @route   DELETE /api/cart/clear
 * @desc    Xóa toàn bộ giỏ hàng
 * @access  Private
 */
router.delete('/clear', authenticate, cartController.clearCart);

module.exports = router;
