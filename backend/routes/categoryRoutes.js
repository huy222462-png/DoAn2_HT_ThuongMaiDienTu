/**
 * Category Routes
 * Định tuyến cho danh mục
 */

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

/**
 * @route   GET /api/categories
 * @desc    Lấy tất cả danh mục
 * @access  Public
 */
router.get('/', categoryController.getAllCategories);

/**
 * @route   GET /api/categories/:id
 * @desc    Lấy danh mục theo ID
 * @access  Public
 */
router.get('/:id', categoryController.getCategoryById);

module.exports = router;
