/**
 * Review Routes
 * Định tuyến cho đánh giá
 */

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');
const { reviewValidation } = require('../middleware/validation');

/**
 * @route   POST /api/reviews
 * @desc    Tạo đánh giá sản phẩm
 * @access  Private
 */
router.post('/', authenticate, reviewValidation, reviewController.createReview);

/**
 * @route   GET /api/reviews/product/:productId
 * @desc    Lấy đánh giá theo sản phẩm
 * @access  Public
 */
router.get('/product/:productId', reviewController.getReviewsByProduct);

/**
 * @route   GET /api/reviews/:productId
 * @desc    Backward-compatible endpoint lấy đánh giá theo sản phẩm
 * @access  Public
 */
router.get('/:productId', reviewController.getReviewsByProduct);

module.exports = router;
