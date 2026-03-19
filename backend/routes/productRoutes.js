/**
 * Product Routes
 * Định tuyến cho sản phẩm
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

/**
 * @route   GET /api/products/search
 * @desc    Tìm kiếm sản phẩm
 * @access  Public
 */
router.get('/search', productController.searchProducts);

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

module.exports = router;
