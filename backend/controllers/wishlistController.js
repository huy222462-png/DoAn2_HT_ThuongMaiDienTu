/**
 * Wishlist Controller
 * Controller xử lý các thao tác yêu thích sản phẩm
 */

const WishlistModel = require('../models/WishlistModel');
const ProductModel = require('../models/ProductModel');

const getWishlist = async (req, res) => {
  try {
    const userId = req.user.UserId;
    const wishlistItems = await WishlistModel.getByUserId(userId);

    return res.json({
      success: true,
      data: {
        items: wishlistItems,
        itemCount: wishlistItems.length
      }
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách yêu thích: ' + error.message
    });
  }
};

const addWishlistItem = async (req, res) => {
  try {
    const userId = req.user.UserId;
    const productId = parseInt(req.body.productId, 10);

    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Product ID không hợp lệ'
      });
    }

    const product = await ProductModel.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    await WishlistModel.add(userId, productId);

    return res.json({
      success: true,
      message: 'Đã thêm sản phẩm vào yêu thích'
    });
  } catch (error) {
    console.error('Add wishlist item error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi thêm yêu thích: ' + error.message
    });
  }
};

const removeWishlistItem = async (req, res) => {
  try {
    const userId = req.user.UserId;
    const productId = parseInt(req.params.productId, 10);

    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Product ID không hợp lệ'
      });
    }

    const removed = await WishlistModel.remove(userId, productId);
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại trong yêu thích'
      });
    }

    return res.json({
      success: true,
      message: 'Đã xóa sản phẩm khỏi yêu thích'
    });
  } catch (error) {
    console.error('Remove wishlist item error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa yêu thích: ' + error.message
    });
  }
};

const checkWishlistItem = async (req, res) => {
  try {
    const userId = req.user.UserId;
    const productId = parseInt(req.params.productId, 10);

    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Product ID không hợp lệ'
      });
    }

    const inWishlist = await WishlistModel.exists(userId, productId);
    return res.json({
      success: true,
      data: {
        inWishlist
      }
    });
  } catch (error) {
    console.error('Check wishlist item error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra yêu thích: ' + error.message
    });
  }
};

module.exports = {
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  checkWishlistItem
};
