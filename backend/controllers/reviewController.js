/**
 * Review Controller
 * Controller xử lý đánh giá sản phẩm
 */

const ReviewModel = require('../models/ReviewModel');

/**
 * Tạo đánh giá sản phẩm
 * POST /api/reviews
 */
const createReview = async (req, res) => {
  try {
    const userId = req.user.UserId;
    const { productId, rating, comment } = req.body;
    
    // Kiểm tra user đã đánh giá chưa
    const hasReviewed = await ReviewModel.hasUserReviewed(userId, productId);
    
    if (hasReviewed) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã đánh giá sản phẩm này rồi'
      });
    }
    
    const review = await ReviewModel.create({
      userId,
      productId,
      rating,
      comment
    });
    
    res.status(201).json({
      success: true,
      message: 'Đánh giá thành công',
      data: review
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đánh giá: ' + error.message
    });
  }
};

/**
 * Lấy đánh giá theo sản phẩm
 * GET /api/reviews/:productId
 */
const getReviewsByProduct = async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    
    const reviews = await ReviewModel.getByProductId(productId);
    
    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy đánh giá: ' + error.message
    });
  }
};

module.exports = {
  createReview,
  getReviewsByProduct
};
