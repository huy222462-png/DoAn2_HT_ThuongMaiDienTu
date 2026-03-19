/**
 * Admin Controller
 * Controller xử lý các chức năng admin
 */

const ProductModel = require('../models/ProductModel');
const CategoryModel = require('../models/CategoryModel');
const OrderModel = require('../models/OrderModel');
const UserModel = require('../models/UserModel');
const emailService = require('../services/emailService');
const config = require('../config/config');
const { sql, getPool } = require('../config/database');
const {
  downloadAndSaveImage,
  deleteImage,
  copyLocalImageToUploads,
  isValidImageSignature,
  resolveUploadFilePath,
  normalizeUploadedImage
} = require('../utils/imageUtils');
const { auditLogger } = require('../middleware/logger');

const isLocalDiskPath = (value) => {
  if (!value || typeof value !== 'string') return false;
  const normalized = value.trim();
  return /^[a-zA-Z]:\\/.test(normalized) || normalized.startsWith('\\\\') || /^file:\/\//i.test(normalized);
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

const normalizeShippingStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  const statusMap = {
    'created': 'created',
    'đã tạo vận đơn': 'created',
    'picked_up': 'picked_up',
    'đã lấy hàng': 'picked_up',
    'in_transit': 'in_transit',
    'đang vận chuyển': 'in_transit',
    'out_for_delivery': 'out_for_delivery',
    'đang giao': 'out_for_delivery',
    'delivered': 'delivered',
    'đã giao': 'delivered',
    'delivery_failed': 'delivery_failed',
    'giao thất bại': 'delivery_failed',
    'returned_to_sender': 'returned_to_sender',
    'hoàn về người gửi': 'returned_to_sender'
  };

  return statusMap[normalized] || normalized;
};

const hardenImageByPublicPath = async (publicPath) => {
  const absolutePath = resolveUploadFilePath(publicPath);
  if (!absolutePath) {
    throw new Error('Không xác định được file ảnh trong uploads');
  }

  if (!isValidImageSignature(absolutePath)) {
    throw new Error('Ảnh không hợp lệ (sai chữ ký file)');
  }

  await normalizeUploadedImage(absolutePath, {
    maxWidth: config.image.maxWidth,
    maxHeight: config.image.maxHeight,
    jpegQuality: config.image.jpegQuality,
    webpQuality: config.image.webpQuality
  });
};

/**
 * QUẢN LÝ SẢN PHẨM
 */

// Tạo sản phẩm mới
const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    let imageUrl = null;

    // Nếu upload file ảnh
    if (req.file) {
      imageUrl = `/uploads/images/${req.file.filename}`;
      try {
        await hardenImageByPublicPath(imageUrl);
      } catch (error) {
        deleteImage(imageUrl);
        return res.status(400).json({
          success: false,
          message: 'Ảnh upload không hợp lệ: ' + error.message
        });
      }
    } 
    // Nếu gửi URL ảnh từ internet, download và lưu
    else if (productData.imageUrl && productData.imageUrl.startsWith('http')) {
      try {
        imageUrl = await downloadAndSaveImage(productData.imageUrl);
        await hardenImageByPublicPath(imageUrl);
      } catch (error) {
        // Fallback: cho phép dùng trực tiếp URL ngoài để tránh chặn thao tác tạo/copy sản phẩm.
        deleteImage(imageUrl);
        console.warn('Download image failed, fallback to remote URL:', error.message);
        imageUrl = productData.imageUrl;
      }
    }
    // Nếu gửi đường dẫn ảnh local trên máy chủ, copy vào uploads
    else if (productData.imageUrl && isLocalDiskPath(productData.imageUrl)) {
      try {
        imageUrl = copyLocalImageToUploads(productData.imageUrl);
        await hardenImageByPublicPath(imageUrl);
      } catch (error) {
        deleteImage(imageUrl);
        return res.status(400).json({
          success: false,
          message: 'Không thể copy ảnh từ ổ đĩa: ' + error.message
        });
      }
    }
    // Nếu gửi URL ảnh từ server
    else if (productData.imageUrl) {
      imageUrl = productData.imageUrl;
    }

    // Gán ảnh vào productData
    productData.imageUrl = imageUrl;

    const product = await ProductModel.create(productData);
    
    res.status(201).json({
      success: true,
      message: 'Tạo sản phẩm thành công',
      data: product
    });
  } catch (error) {
    // Nếu lỗi, xóa file ảnh nếu có
    if (req.file) {
      deleteImage(req.file.filename);
    }
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo sản phẩm: ' + error.message
    });
  }
};

// Upload ảnh dùng chung (phục vụ ảnh biến thể hoặc ảnh sản phẩm)
const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn file ảnh để upload'
      });
    }

    const imageUrl = `/uploads/images/${req.file.filename}`;
    try {
      await hardenImageByPublicPath(imageUrl);
    } catch (error) {
      deleteImage(imageUrl);
      return res.status(400).json({
        success: false,
        message: 'Ảnh upload không hợp lệ: ' + error.message
      });
    }

    return res.json({
      success: true,
      message: 'Upload ảnh thành công',
      data: {
        imageUrl
      }
    });
  } catch (error) {
    if (req.file) {
      deleteImage(`/uploads/images/${req.file.filename}`);
    }
    console.error('Upload product image error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi upload ảnh: ' + error.message
    });
  }
};

// Cập nhật sản phẩm
const updateProduct = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const productData = req.body;
    let imageUrl = null;

    // Lấy ảnh cũ để có thể xóa nếu cần
    const oldProduct = await ProductModel.findById(productId);
    const oldImageUrl = oldProduct?.image_url;

    // Nếu upload file ảnh mới
    if (req.file) {
      imageUrl = `/uploads/images/${req.file.filename}`;
      try {
        await hardenImageByPublicPath(imageUrl);
      } catch (error) {
        deleteImage(imageUrl);
        return res.status(400).json({
          success: false,
          message: 'Ảnh upload không hợp lệ: ' + error.message
        });
      }
      // Xóa ảnh cũ nếu có
      if (oldImageUrl) {
        deleteImage(oldImageUrl);
      }
    } 
    // Nếu gửi URL ảnh từ internet, download và lưu
    else if (productData.imageUrl && productData.imageUrl.startsWith('http')) {
      try {
        imageUrl = await downloadAndSaveImage(productData.imageUrl);
        await hardenImageByPublicPath(imageUrl);
        // Xóa ảnh cũ nếu có
        if (oldImageUrl) {
          deleteImage(oldImageUrl);
        }
      } catch (error) {
        // Fallback: giữ URL ngoài để cập nhật vẫn thành công ngay cả khi không tải được ảnh về server.
        deleteImage(imageUrl);
        console.warn('Download image failed, fallback to remote URL:', error.message);
        imageUrl = productData.imageUrl;
        if (oldImageUrl && oldImageUrl !== imageUrl) {
          deleteImage(oldImageUrl);
        }
      }
    }
    // Nếu gửi đường dẫn ảnh local trên máy chủ, copy vào uploads
    else if (productData.imageUrl && isLocalDiskPath(productData.imageUrl)) {
      try {
        imageUrl = copyLocalImageToUploads(productData.imageUrl);
        await hardenImageByPublicPath(imageUrl);
        if (oldImageUrl) {
          deleteImage(oldImageUrl);
        }
      } catch (error) {
        deleteImage(imageUrl);
        return res.status(400).json({
          success: false,
          message: 'Không thể copy ảnh từ ổ đĩa: ' + error.message
        });
      }
    }
    // Nếu gửi URL ảnh từ server
    else if (productData.imageUrl) {
      imageUrl = productData.imageUrl;
      // Xóa ảnh cũ nếu có và ảnh mới khác ảnh cũ
      if (oldImageUrl && oldImageUrl !== imageUrl) {
        deleteImage(oldImageUrl);
      }
    }
    // Nếu không gửi imageUrl, giữ ảnh cũ
    else if (oldImageUrl) {
      imageUrl = oldImageUrl;
    }

    // Gán ảnh vào productData
    if (imageUrl) {
      productData.imageUrl = imageUrl;
    }

    const product = await ProductModel.update(productId, productData);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }
    
    res.json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
      data: product
    });
  } catch (error) {
    // Nếu lỗi, xóa file ảnh nếu có
    if (req.file) {
      deleteImage(req.file.filename);
    }
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật sản phẩm: ' + error.message
    });
  }
};

// Xóa sản phẩm
const deleteProduct = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    // Lấy ảnh để xóa
    const product = await ProductModel.findById(productId);
    
    await ProductModel.delete(productId);
    
    // Xóa file ảnh nếu có
    if (product?.image_url) {
      deleteImage(product.image_url);
    }
    
    res.json({
      success: true,
      message: 'Xóa sản phẩm thành công'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa sản phẩm: ' + error.message
    });
  }
};

/**
 * QUẢN LÝ DANH MỤC
 */

// Tạo danh mục mới
const createCategory = async (req, res) => {
  try {
    const category = await CategoryModel.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Tạo danh mục thành công',
      data: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo danh mục: ' + error.message
    });
  }
};

// Cập nhật danh mục
const updateCategory = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    const category = await CategoryModel.update(categoryId, req.body);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục'
      });
    }
    
    res.json({
      success: true,
      message: 'Cập nhật danh mục thành công',
      data: category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật danh mục: ' + error.message
    });
  }
};

// Xóa danh mục
const deleteCategory = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    await CategoryModel.delete(categoryId);
    
    res.json({
      success: true,
      message: 'Xóa danh mục thành công'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa danh mục: ' + error.message
    });
  }
};

/**
 * QUẢN LÝ ĐỚN HÀNG
 */

// Lấy tất cả đơn hàng
const getAllOrders = async (req, res) => {
  try {
    const orders = await OrderModel.getAll();
    
    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy đơn hàng: ' + error.message
    });
  }
};

// Cập nhật trạng thái đơn hàng
const updateOrderStatus = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    const shippingCarrier = String(req.body.shippingCarrier || '').trim() || null;
    const shippingCarrierContact = String(req.body.shippingCarrierContact || '').trim() || null;
    const trackingCode = String(req.body.trackingCode || '').trim() || null;
    const shippingNote = String(req.body.shippingNote || '').trim() || null;

    const currentOrder = await OrderModel.findById(orderId);
    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    const previousStatus = normalizeOrderStatus(currentOrder.Status);
    const requestedStatus = normalizeOrderStatus(status);

    if (requestedStatus === 'shipping' && !shippingCarrier) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn đơn vị vận chuyển khi chuyển sang trạng thái đang giao'
      });
    }

    if (requestedStatus === 'shipping' && !shippingCarrierContact) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập thông tin liên hệ đơn vị vận chuyển'
      });
    }
    
    const order = await OrderModel.updateStatus(orderId, status, {
      shippingCarrier,
      shippingCarrierContact,
      trackingCode,
      shippingNote
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    const newStatus = normalizeOrderStatus(status || order.Status);
    let emailSent = false;

    // Chỉ gửi email khi đơn được xác nhận lần đầu
    if (previousStatus !== 'confirmed' && newStatus === 'confirmed') {
      try {
        const approvedOrder = await OrderModel.findById(orderId);
        if (approvedOrder?.Email) {
          emailService.enqueueOrderApprovedEmail(approvedOrder);
          emailSent = true;
        }
      } catch (emailError) {
        console.error('Send approved order email error:', emailError);
      }
    }
    
    res.json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: {
        ...order,
        emailSent
      }
    });

    auditLogger.logAdminAction(req, 'order_status_updated', {
      orderId,
      previousStatus,
      newStatus,
      emailSent,
      shippingCarrier,
      shippingCarrierContact,
      hasTrackingCode: Boolean(trackingCode)
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái: ' + error.message
    });
  }
};

// Cập nhật trạng thái vận chuyển / mã vận đơn (admin hoặc callback giả lập từ đơn vị vận chuyển)
const updateShippingProgress = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const shippingCarrier = String(req.body.shippingCarrier || '').trim() || null;
    const shippingCarrierContact = String(req.body.shippingCarrierContact || '').trim() || null;
    const trackingCode = String(req.body.trackingCode || '').trim() || null;
    const shippingNote = String(req.body.shippingNote || '').trim() || null;
    const shippingStatus = normalizeShippingStatus(req.body.shippingStatus);

    const allowedShippingStatuses = [
      'created',
      'picked_up',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'delivery_failed',
      'returned_to_sender'
    ];

    if (!allowedShippingStatuses.includes(shippingStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái vận chuyển không hợp lệ'
      });
    }

    const currentOrder = await OrderModel.findById(orderId);
    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    if (!trackingCode && !currentOrder.TrackingCode) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã vận đơn trước khi cập nhật trạng thái vận chuyển'
      });
    }

    const updatedOrder = await OrderModel.updateShippingProgress(orderId, {
      shippingCarrier,
      shippingCarrierContact,
      trackingCode,
      shippingStatus,
      shippingNote
    });

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật vận chuyển thành công',
      data: updatedOrder
    });

    auditLogger.logAdminAction(req, 'order_shipping_progress_updated', {
      orderId,
      shippingStatus,
      shippingCarrier,
      hasTrackingCode: Boolean(trackingCode || currentOrder.TrackingCode)
    });
  } catch (error) {
    console.error('Update shipping progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật vận chuyển: ' + error.message
    });
  }
};

// Duyệt / từ chối yêu cầu hoàn trả sau khi shop kiểm tra hàng nhận về
const processReturnRequest = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const action = String(req.body.action || '').trim().toLowerCase();
    const decisionReason = String(req.body.decisionReason || '').trim();
    const refundAmount = Number(req.body.refundAmount || 0);

    const currentOrder = await OrderModel.findById(orderId);
    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    const currentStatus = normalizeOrderStatus(currentOrder.Status);
    if (currentStatus !== 'returned_shipping') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ xử lý hoàn trả khi khách đã gửi hàng về shop'
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Hành động xử lý không hợp lệ'
      });
    }

    const maxRefund = Number(currentOrder.TotalAmount || 0);
    if (action === 'approve' && (refundAmount < 0 || refundAmount > maxRefund)) {
      return res.status(400).json({
        success: false,
        message: `Số tiền hoàn phải trong khoảng 0 - ${maxRefund}`
      });
    }

    const updatedOrder = await OrderModel.processReturnInspection(
      orderId,
      action,
      decisionReason || null,
      action === 'approve' ? refundAmount : null
    );

    res.json({
      success: true,
      message: action === 'approve' ? 'Đã duyệt hoàn trả và hoàn tiền' : 'Đã từ chối hoàn trả',
      data: updatedOrder
    });

    auditLogger.logAdminAction(req, 'order_return_processed', {
      orderId,
      action,
      refundAmount: action === 'approve' ? refundAmount : null,
      hasDecisionReason: Boolean(decisionReason)
    });
  } catch (error) {
    console.error('Process return request error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý hoàn trả: ' + error.message
    });
  }
};

// Gửi email khuyến mãi hàng loạt
const sendPromotionCampaign = async (req, res) => {
  try {
    const {
      subject,
      content,
      couponCode,
      ctaUrl,
      ctaText,
      expiresAt
    } = req.body;

    const recipients = await UserModel.getMarketingRecipients();

    if (!recipients || recipients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không có khách hàng hợp lệ để gửi email khuyến mãi'
      });
    }

    const campaignResult = emailService.enqueuePromotionCampaign(recipients, {
      subject,
      content,
      couponCode,
      ctaUrl,
      ctaText,
      expiresAt
    });

    res.json({
      success: true,
      message: 'Đã xử lý gửi email khuyến mãi',
      data: campaignResult
    });

    auditLogger.logAdminAction(req, 'promotion_campaign_sent', {
      subject,
      recipients: recipients.length,
      successCount: campaignResult.successCount,
      failedCount: campaignResult.failedCount,
      hasCouponCode: Boolean(couponCode),
      hasCtaUrl: Boolean(ctaUrl),
      expiresAt: expiresAt || null
    });
  } catch (error) {
    console.error('Send promotion campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi email khuyến mãi: ' + error.message
    });
  }
};

/**
 * QUẢN LÝ NGƯỜI DÙNG
 */

// Lấy tất cả người dùng
const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.getAll();
    
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy người dùng: ' + error.message
    });
  }
};

// Khóa/Mở khóa người dùng
const toggleUserLock = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { isLocked } = req.body;
    
    await UserModel.toggleLock(userId, isLocked);
    
    res.json({
      success: true,
      message: isLocked ? 'Đã khóa người dùng' : 'Đã mở khóa người dùng'
    });

    auditLogger.logAdminAction(req, 'user_lock_toggled', {
      targetUserId: userId,
      isLocked: Boolean(isLocked)
    });
  } catch (error) {
    console.error('Toggle user lock error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái: ' + error.message
    });
  }
};

/**
 * THỐNG KÊ
 */

// Lấy thống kê tổng quan
const getStatistics = async (req, res) => {
  try {
    const pool = getPool();
    const requestedRevenueView = String(req.query.revenueView || 'day').trim().toLowerCase();
    const revenueView = ['day', 'month', 'quarter'].includes(requestedRevenueView) ? requestedRevenueView : 'day';
    
    // Đếm tổng số người dùng
    const userCountResult = await pool.request()
      .query('SELECT COUNT(*) AS Count FROM Users');
    const userCount = userCountResult.recordset[0].Count;
    
    // Đếm tổng số sản phẩm
    const productCountResult = await pool.request()
      .query('SELECT COUNT(*) AS Count FROM Products');
    const productCount = productCountResult.recordset[0].Count;
    
    // Đếm tổng số đơn hàng
    const orderCountResult = await pool.request()
      .query('SELECT COUNT(*) AS Count FROM Orders');
    const orderCount = orderCountResult.recordset[0].Count;
    
    // Tổng doanh thu
    const revenueResult = await pool.request()
      .query("SELECT SUM(TotalAmount) AS Revenue FROM Orders WHERE Status != N'Đã hủy'");
    const revenue = revenueResult.recordset[0].Revenue || 0;
    
    // Đơn hàng theo trạng thái
    let ordersByStatus = [];
    try {
      const ordersByStatusResult = await pool.request()
        .query('SELECT Status, COUNT(*) AS Count FROM Orders GROUP BY Status');
      ordersByStatus = ordersByStatusResult.recordset;
    } catch (error) {
      console.warn('Statistics ordersByStatus query warning:', error.message);
    }
    
    // Top 5 sản phẩm bán chạy
    // Tránh phụ thuộc vào ProductImages/OrderItems.Price để không lỗi khi schema lệch.
    let topProducts = [];
    try {
      const topProductsResult = await pool.request()
        .query(`
          SELECT TOP 5
            p.ProductId,
            p.ProductName,
            (SELECT TOP 1 ImageURL FROM ProductImages WHERE ProductID = p.ProductID) AS ImageUrl,
            SUM(od.Quantity) AS TotalSold,
            SUM(od.Quantity * p.Price) AS Revenue
          FROM Products p
          INNER JOIN OrderItems od ON p.ProductId = od.ProductId
          GROUP BY p.ProductId, p.ProductName, p.Price
          ORDER BY TotalSold DESC
        `);
      topProducts = topProductsResult.recordset;
    } catch (error) {
      console.warn('Statistics topProducts query warning:', error.message);
    }
    
    // Doanh thu theo kỳ (ngày/tháng/quý)
    let revenueSeries = [];
    try {
      let revenueQuery = '';

      if (revenueView === 'month') {
        revenueQuery = `
          SELECT
            CONCAT(YEAR(OrderDate), '-', RIGHT(CONCAT('0', MONTH(OrderDate)), 2)) AS PeriodKey,
            CONCAT('Thang ', RIGHT(CONCAT('0', MONTH(OrderDate)), 2), '/', YEAR(OrderDate)) AS PeriodLabel,
            SUM(TotalAmount) AS Revenue,
            COUNT(*) AS OrderCount,
            MIN(CAST(OrderDate AS DATE)) AS SortDate
          FROM Orders
          WHERE OrderDate >= DATEADD(MONTH, -11, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
            AND Status != N'Đã hủy'
          GROUP BY YEAR(OrderDate), MONTH(OrderDate)
          ORDER BY SortDate
        `;
      } else if (revenueView === 'quarter') {
        revenueQuery = `
          SELECT
            CONCAT(YEAR(OrderDate), '-Q', DATEPART(QUARTER, OrderDate)) AS PeriodKey,
            CONCAT('Q', DATEPART(QUARTER, OrderDate), '/', YEAR(OrderDate)) AS PeriodLabel,
            SUM(TotalAmount) AS Revenue,
            COUNT(*) AS OrderCount,
            MIN(CAST(OrderDate AS DATE)) AS SortDate
          FROM Orders
          WHERE OrderDate >= DATEADD(QUARTER, -7, DATEADD(QUARTER, DATEDIFF(QUARTER, 0, GETDATE()), 0))
            AND Status != N'Đã hủy'
          GROUP BY YEAR(OrderDate), DATEPART(QUARTER, OrderDate)
          ORDER BY SortDate
        `;
      } else {
        revenueQuery = `
          SELECT
            CONVERT(VARCHAR(10), CAST(OrderDate AS DATE), 23) AS PeriodKey,
            CONVERT(VARCHAR(10), CAST(OrderDate AS DATE), 23) AS PeriodLabel,
            SUM(TotalAmount) AS Revenue,
            COUNT(*) AS OrderCount,
            CAST(OrderDate AS DATE) AS SortDate
          FROM Orders
          WHERE OrderDate >= DATEADD(DAY, -29, CAST(GETDATE() AS DATE))
            AND Status != N'Đã hủy'
          GROUP BY CAST(OrderDate AS DATE)
          ORDER BY SortDate
        `;
      }

      const revenueResult = await pool.request().query(revenueQuery);
      revenueSeries = revenueResult.recordset;
    } catch (error) {
      console.warn('Statistics revenueSeries query warning:', error.message);
    }
    
    res.json({
      success: true,
      data: {
        overview: {
          userCount,
          productCount,
          orderCount,
          revenue
        },
        ordersByStatus,
        topProducts,
        revenueView,
        revenueSeries,
        // backward-compatible key cho frontend cũ
        last7Days: revenueSeries
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê: ' + error.message
    });
  }
};

module.exports = {
  // Sản phẩm
  uploadProductImage,
  createProduct,
  updateProduct,
  deleteProduct,
  
  // Danh mục
  createCategory,
  updateCategory,
  deleteCategory,
  
  // Đơn hàng
  getAllOrders,
  updateOrderStatus,
  updateShippingProgress,
  processReturnRequest,
  sendPromotionCampaign,
  
  // Người dùng
  getAllUsers,
  toggleUserLock,
  
  // Thống kê
  getStatistics
};
