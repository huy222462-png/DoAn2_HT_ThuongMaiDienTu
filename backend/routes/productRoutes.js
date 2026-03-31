/**
 * Product Routes
 * Định tuyến cho sản phẩm
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

/**
 * @route   GET /api/products/search
 * @desc    Tìm kiếm sản phẩm
 * @access  Public
 */
router.get('/search', productController.searchProducts);

/**
 * @route   GET /api/products/recommend-build
 * @desc    AI goi y bo cau hinh theo nhu cau su dung
 * @access  Public
 */
router.get('/recommend-build', productController.recommendBuild);

/**
 * @route   GET /api/products
 * @desc    Lấy danh sách sản phẩm
 * @access  Public
 */
router.get('/', productController.getAllProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Lấy chi tiết sản phẩm
 * @access  Public
 */
router.get('/:id', productController.getProductById);

/**
 * @route   POST /api/products/upload-image
 * @desc    Upload ảnh sản phẩm
 * @access  Private (Admin only)
 */
router.post('/upload-image', authenticate, upload.single('image'), productController.uploadImage);

module.exports = router;
