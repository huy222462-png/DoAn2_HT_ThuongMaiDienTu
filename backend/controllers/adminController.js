
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

const normalizeInsightText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .trim();

const toSafeNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const estimateCostRateByCategory = (categoryName = '') => {
  const text = normalizeInsightText(categoryName);
  if (!text) {
    return 0.76;
  }

  if (/(cpu|vga|gpu|card|man hinh|monitor|laptop)/.test(text)) return 0.84;
  if (/(ram|ssd|o cung|main|mainboard|motherboard|nguon|psu|case)/.test(text)) return 0.8;
  if (/(chuot|ban phim|tai nghe|phu kien|loa|webcam)/.test(text)) return 0.68;
  return 0.76;
};

const computeRecommendedDiscount = (sold30, sold90, stock, lastSoldAt) => {
  const sold30Safe = toSafeNumber(sold30);
  const sold90Safe = toSafeNumber(sold90);
  const stockSafe = Math.max(0, toSafeNumber(stock));
  const noRecentSales = sold30Safe === 0;
  const staleDays = lastSoldAt ? Math.floor((Date.now() - new Date(lastSoldAt).getTime()) / 86400000) : null;

  if (stockSafe <= 0) return 0;
  if (sold30Safe <= 1 && sold90Safe <= 2) {
    if (staleDays !== null && staleDays >= 90) return 22;
    if (staleDays !== null && staleDays >= 45) return 16;
    return 12;
  }

  if (noRecentSales && stockSafe >= 10) return 10;
  return 0;
};
const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    let imageUrl = null;
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
    else if (productData.imageUrl && productData.imageUrl.startsWith('http')) {
      try {
        imageUrl = await downloadAndSaveImage(productData.imageUrl);
        await hardenImageByPublicPath(imageUrl);
      } catch (error) {
        deleteImage(imageUrl);
        console.warn('Download image failed, fallback to remote URL:', error.message);
        imageUrl = productData.imageUrl;
      }
    }
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
    else if (productData.imageUrl) {
      imageUrl = productData.imageUrl;
    }
    productData.imageUrl = imageUrl;

    const product = await ProductModel.create(productData);
    
    res.status(201).json({
      success: true,
      message: 'Tạo sản phẩm thành công',
      data: product
    });
  } catch (error) {
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
const updateProduct = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const productData = req.body;
    let imageUrl = null;
    const oldProduct = await ProductModel.findById(productId);
    const oldImageUrl = oldProduct?.image_url;
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
      if (oldImageUrl) {
        deleteImage(oldImageUrl);
      }
    } 
    else if (productData.imageUrl && productData.imageUrl.startsWith('http')) {
      try {
        imageUrl = await downloadAndSaveImage(productData.imageUrl);
        await hardenImageByPublicPath(imageUrl);
        if (oldImageUrl) {
          deleteImage(oldImageUrl);
        }
      } catch (error) {
        deleteImage(imageUrl);
        console.warn('Download image failed, fallback to remote URL:', error.message);
        imageUrl = productData.imageUrl;
        if (oldImageUrl && oldImageUrl !== imageUrl) {
          deleteImage(oldImageUrl);
        }
      }
    }
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
    else if (productData.imageUrl) {
      imageUrl = productData.imageUrl;
      if (oldImageUrl && oldImageUrl !== imageUrl) {
        deleteImage(oldImageUrl);
      }
    }
    else if (oldImageUrl) {
      imageUrl = oldImageUrl;
    }
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
const deleteProduct = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const product = await ProductModel.findById(productId);
    
    await ProductModel.delete(productId);
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


const getAiBusinessInsights = async (req, res) => {
  try {
    const pool = getPool();
    await ProductModel.ensureSaleColumns(pool);

    const lookbackDays = Math.min(365, Math.max(30, parseInt(req.query.lookbackDays || '90', 10)));

    let productStatsResult;
    try {
      productStatsResult = await pool.request()
        .input('lookbackDays', sql.Int, lookbackDays)
        .query(`
          SELECT
            p.ProductId,
            p.ProductName,
            p.Price,
            p.SalePrice,
            p.Stock,
            p.CreatedAt,
            c.CategoryName,
            (SELECT TOP 1 ImageURL FROM ProductImages WHERE ProductID = p.ProductID) AS ImageUrl,
            SUM(CASE
                  WHEN o.Status IN (N'Chờ xác nhận', N'Đã xác nhận', N'Đang giao', N'Hoàn thành', N'pending', N'confirmed', N'shipping', N'completed')
                    AND o.OrderDate >= DATEADD(DAY, -30, GETDATE())
                  THEN od.Quantity ELSE 0 END
            ) AS Sold30,
            SUM(CASE
                  WHEN o.Status IN (N'Chờ xác nhận', N'Đã xác nhận', N'Đang giao', N'Hoàn thành', N'pending', N'confirmed', N'shipping', N'completed')
                    AND o.OrderDate >= DATEADD(DAY, -90, GETDATE())
                  THEN od.Quantity ELSE 0 END
            ) AS Sold90,
            SUM(CASE
                  WHEN o.Status IN (N'Chờ xác nhận', N'Đã xác nhận', N'Đang giao', N'Hoàn thành', N'pending', N'confirmed', N'shipping', N'completed')
                    AND o.OrderDate >= DATEADD(DAY, -@lookbackDays, GETDATE())
                  THEN od.Quantity ELSE 0 END
            ) AS SoldLookback,
            MAX(CASE
                  WHEN o.Status IN (N'Chờ xác nhận', N'Đã xác nhận', N'Đang giao', N'Hoàn thành', N'pending', N'confirmed', N'shipping', N'completed')
                  THEN o.OrderDate ELSE NULL END
            ) AS LastSoldAt
          FROM Products p
          LEFT JOIN Categories c ON p.CategoryId = c.CategoryId
          LEFT JOIN OrderItems od ON p.ProductId = od.ProductId
          LEFT JOIN Orders o ON od.OrderId = o.OrderId
          GROUP BY p.ProductId, p.ProductName, p.Price, p.SalePrice, p.Stock, p.CreatedAt, c.CategoryName
        `);
    } catch (imageQueryError) {
      console.warn('AI insights image query fallback:', imageQueryError.message);
      productStatsResult = await pool.request()
        .input('lookbackDays', sql.Int, lookbackDays)
        .query(`
          SELECT
            p.ProductId,
            p.ProductName,
            p.Price,
            p.SalePrice,
            p.Stock,
            p.CreatedAt,
            c.CategoryName,
            NULL AS ImageUrl,
            SUM(CASE
                  WHEN o.Status IN (N'Chờ xác nhận', N'Đã xác nhận', N'Đang giao', N'Hoàn thành', N'pending', N'confirmed', N'shipping', N'completed')
                    AND o.OrderDate >= DATEADD(DAY, -30, GETDATE())
                  THEN od.Quantity ELSE 0 END
            ) AS Sold30,
            SUM(CASE
                  WHEN o.Status IN (N'Chờ xác nhận', N'Đã xác nhận', N'Đang giao', N'Hoàn thành', N'pending', N'confirmed', N'shipping', N'completed')
                    AND o.OrderDate >= DATEADD(DAY, -90, GETDATE())
                  THEN od.Quantity ELSE 0 END
            ) AS Sold90,
            SUM(CASE
                  WHEN o.Status IN (N'Chờ xác nhận', N'Đã xác nhận', N'Đang giao', N'Hoàn thành', N'pending', N'confirmed', N'shipping', N'completed')
                    AND o.OrderDate >= DATEADD(DAY, -@lookbackDays, GETDATE())
                  THEN od.Quantity ELSE 0 END
            ) AS SoldLookback,
            MAX(CASE
                  WHEN o.Status IN (N'Chờ xác nhận', N'Đã xác nhận', N'Đang giao', N'Hoàn thành', N'pending', N'confirmed', N'shipping', N'completed')
                  THEN o.OrderDate ELSE NULL END
            ) AS LastSoldAt
          FROM Products p
          LEFT JOIN Categories c ON p.CategoryId = c.CategoryId
          LEFT JOIN OrderItems od ON p.ProductId = od.ProductId
          LEFT JOIN Orders o ON od.OrderId = o.OrderId
          GROUP BY p.ProductId, p.ProductName, p.Price, p.SalePrice, p.Stock, p.CreatedAt, c.CategoryName
        `);
    }

    const rows = productStatsResult.recordset || [];
    const analyzedRows = rows.map((row) => {
      const basePrice = toSafeNumber(row.Price);
      const salePrice = toSafeNumber(row.SalePrice);
      const effectivePrice = salePrice > 0 && salePrice < basePrice ? salePrice : basePrice;
      const sold30 = toSafeNumber(row.Sold30);
      const sold90 = toSafeNumber(row.Sold90);
      const soldLookback = toSafeNumber(row.SoldLookback);
      const stock = Math.max(0, toSafeNumber(row.Stock));
      const costRate = estimateCostRateByCategory(row.CategoryName);
      const estimatedCostPerUnit = effectivePrice * costRate;
      const estimatedProfitPerUnit = Math.max(0, effectivePrice - estimatedCostPerUnit);
      const estimatedProfit30 = sold30 * estimatedProfitPerUnit;
      const estimatedRevenue30 = sold30 * effectivePrice;

      const coverageDays = sold30 > 0 ? Math.round((stock / sold30) * 30) : null;
      const discountSuggestion = computeRecommendedDiscount(sold30, sold90, stock, row.LastSoldAt);

      return {
        productId: row.ProductId,
        productName: row.ProductName,
        categoryName: row.CategoryName || 'Chua phan loai',
        imageUrl: row.ImageUrl || null,
        price: effectivePrice,
        stock,
        sold30,
        sold90,
        soldLookback,
        estimatedProfitPerUnit,
        estimatedProfit30,
        estimatedRevenue30,
        coverageDays,
        lastSoldAt: row.LastSoldAt || null,
        discountSuggestion
      };
    });

    const shouldPromote = analyzedRows
      .filter((item) => item.sold30 >= 3 && item.estimatedProfitPerUnit > 0)
      .sort((a, b) => {
        const scoreA = a.estimatedProfit30 + (a.sold30 * 10000);
        const scoreB = b.estimatedProfit30 + (b.sold30 * 10000);
        return scoreB - scoreA;
      })
      .slice(0, 8)
      .map((item) => ({
        ...item,
        recommendation: item.coverageDays !== null && item.coverageDays < 20
          ? 'Ban dang ban tot va sap can hang, nen tang ton kho + day manh quang cao.'
          : 'Ban dang tao bien loi nhuan tot, nen uu tien truyen thong va cross-sell.'
      }));

    const shouldDiscount = analyzedRows
      .filter((item) => item.stock > 0 && (item.sold30 <= 1 || item.discountSuggestion >= 10))
      .sort((a, b) => {
        const urgencyA = (a.stock * 3) + (a.discountSuggestion * 10) - (a.sold30 * 5);
        const urgencyB = (b.stock * 3) + (b.discountSuggestion * 10) - (b.sold30 * 5);
        return urgencyB - urgencyA;
      })
      .slice(0, 8)
      .map((item) => ({
        ...item,
        recommendation: item.discountSuggestion > 0
          ? `De xuat giam ${item.discountSuggestion}% trong 7-14 ngay de xoa ton.`
          : 'Nen gom combo hoac tang uu dai freeship de kich cau nhe.'
      }));

    const totalRevenue30 = analyzedRows.reduce((sum, item) => sum + item.estimatedRevenue30, 0);
    const totalProfit30 = analyzedRows.reduce((sum, item) => sum + item.estimatedProfit30, 0);
    const slowMovingStockValue = shouldDiscount.reduce((sum, item) => sum + (item.price * item.stock), 0);

    const summary = {
      lookbackDays,
      productAnalyzed: analyzedRows.length,
      estimatedRevenue30: Math.round(totalRevenue30),
      estimatedProfit30: Math.round(totalProfit30),
      estimatedProfitMargin30: totalRevenue30 > 0 ? Number(((totalProfit30 / totalRevenue30) * 100).toFixed(2)) : 0,
      slowMovingStockValue: Math.round(slowMovingStockValue)
    };

    const actions = [
      shouldPromote.length
        ? `Tap trung ngan sach quang cao cho ${Math.min(3, shouldPromote.length)} san pham dau nhom loi nhuan cao.`
        : 'Chua co san pham ban chay ro rang, nen chay campaign test theo danh muc.',
      shouldDiscount.length
        ? `Lap chuong trinh xa ton cho ${Math.min(5, shouldDiscount.length)} san pham ban cham voi muc giam de xuat.`
        : 'Ton kho hien tai khong co nhom ban cham dang ke.',
      'Theo doi lai sau 7 ngay de danh gia hieu qua va dieu chinh muc giam gia.'
    ];

    return res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        summary,
        shouldPromote,
        shouldDiscount,
        actions
      }
    });
  } catch (error) {
    console.error('Get AI business insights error:', error);
    return res.status(500).json({
      success: false,
      message: 'Loi khi phan tich AI cho admin: ' + error.message
    });
  }
};
const getStatistics = async (req, res) => {
  try {
    const pool = getPool();
    const requestedRevenueView = String(req.query.revenueView || 'day').trim().toLowerCase();
    const revenueView = ['day', 'month', 'quarter'].includes(requestedRevenueView) ? requestedRevenueView : 'day';
    const userCountResult = await pool.request()
      .query('SELECT COUNT(*) AS Count FROM Users');
    const userCount = userCountResult.recordset[0].Count;
    const productCountResult = await pool.request()
      .query('SELECT COUNT(*) AS Count FROM Products');
    const productCount = productCountResult.recordset[0].Count;
    const orderCountResult = await pool.request()
      .query('SELECT COUNT(*) AS Count FROM Orders');
    const orderCount = orderCountResult.recordset[0].Count;
    const revenueResult = await pool.request()
      .query("SELECT SUM(TotalAmount) AS Revenue FROM Orders WHERE Status != N'Đã hủy'");
    const revenue = revenueResult.recordset[0].Revenue || 0;
    let ordersByStatus = [];
    try {
      const ordersByStatusResult = await pool.request()
        .query('SELECT Status, COUNT(*) AS Count FROM Orders GROUP BY Status');
      ordersByStatus = ordersByStatusResult.recordset;
    } catch (error) {
      console.warn('Statistics ordersByStatus query warning:', error.message);
    }
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
  uploadProductImage,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllOrders,
  updateOrderStatus,
  updateShippingProgress,
  processReturnRequest,
  sendPromotionCampaign,
  getAllUsers,
  toggleUserLock,
  getStatistics,
  getAiBusinessInsights
};
