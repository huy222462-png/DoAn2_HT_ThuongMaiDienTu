/**
 * Product Controller
 * Controller xử lý các thao tác với sản phẩm
 */

const ProductModel = require('../models/ProductModel');
const ReviewModel = require('../models/ReviewModel');

/**
 * Lấy danh sách sản phẩm
 * GET /api/products
 */
const getAllProducts = async (req, res) => {
  try {
    const { page, limit, categoryId } = req.query;
    
    const result = await ProductModel.getAll({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 12,
      categoryId: categoryId ? parseInt(categoryId) : null
    });
    
    res.json({
      success: true,
      data: result.products,
      pagination: {
        total: result.totalCount,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        perPage: result.perPage
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách sản phẩm: ' + error.message
    });
  }
};

/**
 * Lấy chi tiết sản phẩm
 * GET /api/products/:id
 */
const getProductById = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    const product = await ProductModel.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }
    
    // Lấy đánh giá của sản phẩm
    const reviews = await ReviewModel.getByProductId(productId);
    product.Reviews = reviews;
    
    // Tính rating trung bình
    if (reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.Rating, 0) / reviews.length;
      product.AverageRating = Math.round(avgRating * 10) / 10;
    } else {
      product.AverageRating = 0;
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy sản phẩm: ' + error.message
    });
  }
};

/**
 * Tìm kiếm sản phẩm
 * GET /api/products/search
 */
const searchProducts = async (req, res) => {
  try {
    const { keyword } = req.query;
    
    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập từ khóa tìm kiếm'
      });
    }
    
    const products = await ProductModel.search(keyword);
    
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tìm kiếm: ' + error.message
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  searchProducts
};
