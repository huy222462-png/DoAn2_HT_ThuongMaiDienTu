/**
 * Order Controller
 * Controller xử lý các thao tác với đơn hàng
 */

const OrderModel = require('../models/OrderModel');
const CartModel = require('../models/CartModel');
const UserModel = require('../models/UserModel');
const ProductModel = require('../models/ProductModel');
const emailService = require('../services/emailService');

const COUPON_RULES = {
  SAVE10: {
    code: 'SAVE10',
    type: 'percent',
    value: 10,
    minOrder: 200000,
    maxDiscount: 150000,
    description: 'Giảm 10% tối đa 150.000đ cho đơn từ 200.000đ'
  },
  SAVE50K: {
    code: 'SAVE50K',
    type: 'fixed',
    value: 50000,
    minOrder: 500000,
    description: 'Giảm trực tiếp 50.000đ cho đơn từ 500.000đ'
  },
  FREESHIP30: {
    code: 'FREESHIP30',
    type: 'fixed',
    value: 30000,
    minOrder: 150000,
    description: 'Hỗ trợ 30.000đ phí vận chuyển cho đơn từ 150.000đ'
  }
};

const calculatePricingByCoupon = (subtotal, couponCode) => {
  const normalizedSubtotal = Number(subtotal || 0);
  const rawCode = String(couponCode || '').trim().toUpperCase();

  if (!rawCode) {
    return {
      subtotal: normalizedSubtotal,
      discountAmount: 0,
      finalAmount: normalizedSubtotal,
      couponCode: null,
      couponDescription: null
    };
  }

  const coupon = COUPON_RULES[rawCode];
  if (!coupon) {
    const error = new Error('Mã giảm giá không hợp lệ');
    error.code = 'INVALID_COUPON';
    throw error;
  }

  if (normalizedSubtotal < Number(coupon.minOrder || 0)) {
    const error = new Error(`Đơn tối thiểu ${Number(coupon.minOrder || 0).toLocaleString('vi-VN')}đ mới dùng được mã ${coupon.code}`);
    error.code = 'COUPON_MIN_ORDER';
    throw error;
  }

  let discountAmount = 0;
  if (coupon.type === 'percent') {
    discountAmount = normalizedSubtotal * (Number(coupon.value || 0) / 100);
    if (Number.isFinite(coupon.maxDiscount)) {
      discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
    }
  } else {
    discountAmount = Number(coupon.value || 0);
  }

  discountAmount = Math.max(0, Math.min(discountAmount, normalizedSubtotal));
  const finalAmount = Math.max(0, normalizedSubtotal - discountAmount);

  return {
    subtotal: normalizedSubtotal,
    discountAmount,
    finalAmount,
    couponCode: coupon.code,
    couponDescription: coupon.description
  };
};

const normalizeOrderStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  const statusMap = {
    'pending': 'pending',
    'chờ xác nhận': 'pending',
    'confirmed': 'confirmed',
    'đã xác nhận': 'confirmed',
    'shipping': 'shipping',
    'đang giao': 'shipping',
    'completed': 'completed',
    'hoàn thành': 'completed',
    'cancelled': 'cancelled',
    'đã hủy': 'cancelled',
    'return_requested': 'return_requested',
    'yêu cầu trả hàng': 'return_requested',
    'returned_shipping': 'returned_shipping',
    'đã gửi trả hàng': 'returned_shipping',
    'returned_approved': 'returned_approved',
    'đã hoàn trả': 'returned_approved',
    'returned_rejected': 'returned_rejected',
    'từ chối hoàn trả': 'returned_rejected'
  };

  return statusMap[normalized] || normalized;
};

const toValidVariantId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Tạo đơn hàng
 * POST /api/orders/create
 */
const createOrder = async (req, res) => {
  try {
    const userId = req.user.UserId;
    const { shippingAddress, phone, paymentMethod, couponCode } = req.body;
    
    // Lấy giỏ hàng
    const cartItems = await CartModel.getCartByUserId(userId);
    
    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Giỏ hàng trống'
      });
    }
    
    // Kiểm tra tồn kho
    for (const item of cartItems) {
      if (item.Stock < item.Quantity) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ${item.ProductName} không đủ hàng`
        });
      }
    }
    
    // Tính tổng tiền và giảm giá ở server để tránh client sửa dữ liệu.
    const subtotal = cartItems.reduce((sum, item) => sum + item.Subtotal, 0);
    const pricing = calculatePricingByCoupon(subtotal, couponCode);
    
    // Chuẩn bị dữ liệu order
    const orderData = {
      userId,
      totalAmount: pricing.finalAmount,
      shippingAddress,
      phone,
      paymentMethod,
      couponCode: pricing.couponCode,
      discountAmount: pricing.discountAmount,
      items: cartItems.map(item => ({
        ProductId: item.ProductId,
        VariantId: toValidVariantId(item.VariantId),
        VariantName: item.VariantName || null,
        Quantity: item.Quantity,
        Price: item.Price
      }))
    };
    
    // Tạo order
    const order = await OrderModel.create(orderData);
    
    // Xóa giỏ hàng
    await CartModel.clearCart(userId);
    
    // Lấy thông tin đầy đủ đơn hàng để gửi email
    const fullOrder = await OrderModel.findById(order.OrderId);
    
    // Đưa email xác nhận vào queue (không block response)
    try {
      emailService.enqueueOrderConfirmation(fullOrder);
    } catch (emailError) {
      console.error('Email error:', emailError);
      // Không báo lỗi cho user nếu email thất bại
    }
    
    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công',
      data: {
        ...order,
        pricing
      }
    });
  } catch (error) {
    console.error('Create order error:', error);

    if (error.code === 'INSUFFICIENT_STOCK' || error.code === 'INVALID_COUPON' || error.code === 'COUPON_MIN_ORDER') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi khi đặt hàng: ' + error.message
    });
  }
};

/**
 * Xem trước giá đơn hàng (áp mã giảm giá)
 * POST /api/orders/preview-pricing
 */
const previewOrderPricing = async (req, res) => {
  try {
    const userId = req.user.UserId;
    const { couponCode } = req.body;

    const cartItems = await CartModel.getCartByUserId(userId);
    if (!cartItems.length) {
      return res.status(400).json({
        success: false,
        message: 'Giỏ hàng trống'
      });
    }

    const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.Subtotal) || 0), 0);
    const pricing = calculatePricingByCoupon(subtotal, couponCode);

    res.json({
      success: true,
      data: pricing
    });
  } catch (error) {
    if (error.code === 'INVALID_COUPON' || error.code === 'COUPON_MIN_ORDER') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error('Preview pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tính khuyến mãi: ' + error.message
    });
  }
};

/**
 * Lấy lịch sử đơn hàng
 * GET /api/orders/history
 */
const getOrderHistory = async (req, res) => {
  try {
    const userId = req.user.UserId;
    
    const orders = await OrderModel.getOrderHistory(userId);
    
    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get order history error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử đơn hàng: ' + error.message
    });
  }
};

/**
 * Lấy chi tiết đơn hàng
 * GET /api/orders/:id
 */
const getOrderById = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user.UserId;
    
    const order = await OrderModel.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }
    
    // Kiểm tra quyền truy cập (chỉ user sở hữu hoặc admin)
    if (order.UserId !== userId && !req.user.IsAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập đơn hàng này'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy đơn hàng: ' + error.message
    });
  }
};

/**
 * Hủy đơn hàng
 * PUT /api/orders/:id/cancel
 */
const cancelOrder = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user.UserId;
    const cancelReason = String(req.body.reason || '').trim();

    const order = await OrderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    if (order.UserId !== userId && !req.user.IsAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền hủy đơn hàng này'
      });
    }

    if (normalizeOrderStatus(order.Status) !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hủy đơn hàng đang chờ xác nhận'
      });
    }

    if (!cancelReason || cancelReason.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập lý do hủy đơn tối thiểu 5 ký tự'
      });
    }

    if (Array.isArray(order.Items)) {
      for (const item of order.Items) {
        const variantId = Number(item.VariantId);
        if (Number.isInteger(variantId) && variantId > 0) {
          await OrderModel.restoreVariantStock(item.ProductId, variantId, item.Quantity);
        } else {
          await ProductModel.restoreStock(item.ProductId, item.Quantity);
        }
      }
    }

    const cancelledOrder = await OrderModel.cancelOrder(orderId, cancelReason);

    res.json({
      success: true,
      message: 'Đã hủy đơn hàng thành công',
      data: cancelledOrder
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi hủy đơn hàng: ' + error.message
    });
  }
};

/**
 * Khách gửi yêu cầu trả hàng
 * PUT /api/orders/:id/request-return
 */
const requestReturn = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user.UserId;
    const reason = String(req.body.reason || '').trim();

    const order = await OrderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    if (order.UserId !== userId && !req.user.IsAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền gửi yêu cầu trả hàng cho đơn này'
      });
    }

    if (!reason || reason.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập lý do trả hàng tối thiểu 10 ký tự'
      });
    }

    const statusKey = normalizeOrderStatus(order.Status);
    if (statusKey !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ đơn hàng đã hoàn thành mới được yêu cầu trả hàng'
      });
    }

    const updated = await OrderModel.createReturnRequest(orderId, reason);
    return res.json({
      success: true,
      message: 'Đã gửi yêu cầu trả hàng. Vui lòng gửi hàng về shop để được kiểm tra.',
      data: updated
    });
  } catch (error) {
    console.error('Request return error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi yêu cầu trả hàng: ' + error.message
    });
  }
};

/**
 * Khách xác nhận đã gửi hàng trả về shop
 * PUT /api/orders/:id/return-shipped
 */
const confirmReturnShipped = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user.UserId;

    const order = await OrderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    if (order.UserId !== userId && !req.user.IsAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền cập nhật đơn hàng này'
      });
    }

    const statusKey = normalizeOrderStatus(order.Status);
    if (statusKey !== 'return_requested') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng chưa ở trạng thái chờ gửi trả hàng'
      });
    }

    const updated = await OrderModel.markReturnShipped(orderId);
    return res.json({
      success: true,
      message: 'Đã xác nhận gửi hàng trả về shop. Shop sẽ kiểm tra và phản hồi.',
      data: updated
    });
  } catch (error) {
    console.error('Confirm return shipped error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xác nhận gửi trả hàng: ' + error.message
    });
  }
};

module.exports = {
  createOrder,
  previewOrderPricing,
  getOrderHistory,
  getOrderById,
  cancelOrder,
  requestReturn,
  confirmReturnShipped
};
