/**
 * Category Controller
 * Controller xử lý các thao tác với danh mục
 */

const CategoryModel = require('../models/CategoryModel');

/**
 * Lấy tất cả danh mục
 * GET /api/categories
 */
const getAllCategories = async (req, res) => {
  try {
    const categories = await CategoryModel.getAll();
    
    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh mục: ' + error.message
    });
  }
};

/**
 * Lấy danh mục theo ID
 * GET /api/categories/:id
 */
const getCategoryById = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    const category = await CategoryModel.findById(categoryId);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục'
      });
    }
    
    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh mục: ' + error.message
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById
};
