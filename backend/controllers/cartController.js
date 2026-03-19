/**
 * Cart Controller
 * Controller xử lý các thao tác với giỏ hàng
 */

const CartModel = require('../models/CartModel');
const ProductModel = require('../models/ProductModel');

/**
 * Lấy giỏ hàng của user
 * GET /api/cart
 */
const getCart = async (req, res) => {
  try {
    const userId = req.user.UserId;
    
    const cartItems = await CartModel.getCartByUserId(userId);
    
    // Tính tổng tiền
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.Subtotal || 0), 0);
    
    res.json({
      success: true,
      data: {
        items: cartItems,
        totalAmount,
        itemCount: cartItems.length
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy giỏ hàng: ' + error.message
    });
  }
};

/**
 * Thêm sản phẩm vào giỏ hàng
 * POST /api/cart/add
 */
const addToCart = async (req, res) => {
  try {
    const userId = req.user.UserId;
    const { productId, quantity, variantId } = req.body;
    const parsedProductId = parseInt(productId, 10);
    const parsedQuantity = parseInt(quantity, 10);
    const hasVariant = variantId !== undefined && variantId !== null && String(variantId).trim() !== '';
    const parsedVariantId = hasVariant ? parseInt(variantId, 10) : null;

    if (!Number.isInteger(parsedProductId) || parsedProductId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Product ID không hợp lệ'
      });
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng phải lớn hơn 0'
      });
    }

    if (hasVariant && (!Number.isInteger(parsedVariantId) || parsedVariantId < 1)) {
      return res.status(400).json({
        success: false,
        message: 'Variant ID không hợp lệ'
      });
    }
    
    // Kiểm tra sản phẩm có tồn tại không
    const product = await ProductModel.findById(parsedProductId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    let availableStock = Number(product.stock_quantity ?? product.Stock ?? 0);
    let selectedVariant = null;

    if (Number.isInteger(parsedVariantId)) {
      const variants = Array.isArray(product.variants) ? product.variants : [];
      selectedVariant = variants.find((item) => Number(item.variant_id) === parsedVariantId) || null;

      if (!selectedVariant) {
        return res.status(400).json({
          success: false,
          message: 'Biến thể không tồn tại hoặc không thuộc sản phẩm này'
        });
      }

      availableStock = Number(selectedVariant.stock || 0);
    }

    const existingItem = await CartModel.findCartItem(userId, parsedProductId, parsedVariantId);
    const existingQuantity = Number(existingItem?.Quantity || 0);
    const nextQuantity = existingQuantity + parsedQuantity;
    
    // Kiểm tra số lượng tồn kho
    if (availableStock < nextQuantity) {
      return res.status(400).json({
        success: false,
        message: `Chỉ còn ${availableStock} sản phẩm trong kho, hiện bạn đã có ${existingQuantity} trong giỏ`
      });
    }
    
    await CartModel.addToCart(userId, parsedProductId, parsedQuantity, parsedVariantId);
    
    res.json({
      success: true,
      message: 'Đã thêm sản phẩm vào giỏ hàng'
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi thêm vào giỏ hàng: ' + error.message
    });
  }
};

/**
 * Cập nhật số lượng sản phẩm trong giỏ
 * PUT /api/cart/update
 */
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.UserId;
    const { cartId, quantity } = req.body;

    const parsedCartId = parseInt(cartId, 10);
    const parsedQuantity = parseInt(quantity, 10);

    if (!Number.isInteger(parsedCartId) || parsedCartId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Cart ID không hợp lệ'
      });
    }
    
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng phải lớn hơn 0'
      });
    }
    
    const existingItem = await CartModel.findCartItemWithStock(parsedCartId, userId);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm trong giỏ hàng của bạn'
      });
    }

    const availableStock = Number(existingItem.Stock || 0);
    if (parsedQuantity > availableStock) {
      return res.status(400).json({
        success: false,
        message: `Chỉ còn ${availableStock} sản phẩm trong kho`
      });
    }

    const updatedItem = await CartModel.updateQuantity(parsedCartId, userId, parsedQuantity);
    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm trong giỏ hàng của bạn'
      });
    }
    
    res.json({
      success: true,
      message: 'Đã cập nhật giỏ hàng'
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật giỏ hàng: ' + error.message
    });
  }
};

/**
 * Xóa sản phẩm khỏi giỏ hàng
 * DELETE /api/cart/remove/:cartId
 */
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.UserId;
    const cartId = parseInt(req.params.cartId, 10);

    if (!Number.isInteger(cartId) || cartId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Cart ID không hợp lệ'
      });
    }
    
    const removed = await CartModel.removeFromCart(cartId, userId);

    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm trong giỏ hàng của bạn'
      });
    }
    
    res.json({
      success: true,
      message: 'Đã xóa sản phẩm khỏi giỏ hàng'
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa sản phẩm: ' + error.message
    });
  }
};

/**
 * Xóa toàn bộ giỏ hàng
 * DELETE /api/cart/clear
 */
const clearCart = async (req, res) => {
  try {
    const userId = req.user.UserId;
    
    await CartModel.clearCart(userId);
    
    res.json({
      success: true,
      message: 'Đã xóa toàn bộ giỏ hàng'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa giỏ hàng: ' + error.message
    });
  }
};

/**
 * Gợi ý sản phẩm liên quan theo giỏ hàng hiện tại
 * GET /api/cart/recommendations
 */
const getCartRecommendations = async (req, res) => {
  try {
    const userId = req.user.UserId;
    const cartItems = await CartModel.getCartByUserId(userId);

    const productIds = cartItems
      .map((item) => Number(item.ProductId || item.product_id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (!productIds.length) {
      return res.json({
        success: true,
        data: []
      });
    }

    const recommendations = await ProductModel.getRecommendationsByProductIds(productIds, { limit: 8 });

    return res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Get cart recommendations error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy sản phẩm gợi ý: ' + error.message
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartRecommendations
};
