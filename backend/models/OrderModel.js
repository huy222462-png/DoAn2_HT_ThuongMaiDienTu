/**
 * Order Model
 * Model để thao tác với bảng Orders và OrderItems
 */

const { sql, getPool } = require('../config/database');

class OrderModel {
  static returnColumnsEnsured = false;
  static orderItemVariantColumnsEnsured = false;

  static toValidVariantId(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  static async ensureReturnColumns(pool) {
    if (this.returnColumnsEnsured) {
      return;
    }

    await pool.request().query(`
      IF COL_LENGTH('Orders', 'ReturnReason') IS NULL
        ALTER TABLE Orders ADD ReturnReason NVARCHAR(1000) NULL;

      IF COL_LENGTH('Orders', 'ReturnRequestAt') IS NULL
        ALTER TABLE Orders ADD ReturnRequestAt DATETIME NULL;

      IF COL_LENGTH('Orders', 'ReturnShippedAt') IS NULL
        ALTER TABLE Orders ADD ReturnShippedAt DATETIME NULL;

      IF COL_LENGTH('Orders', 'ReturnDecision') IS NULL
        ALTER TABLE Orders ADD ReturnDecision NVARCHAR(30) NULL;

      IF COL_LENGTH('Orders', 'ReturnDecisionReason') IS NULL
        ALTER TABLE Orders ADD ReturnDecisionReason NVARCHAR(1000) NULL;

      IF COL_LENGTH('Orders', 'ReturnInspectedAt') IS NULL
        ALTER TABLE Orders ADD ReturnInspectedAt DATETIME NULL;

      IF COL_LENGTH('Orders', 'RefundStatus') IS NULL
        ALTER TABLE Orders ADD RefundStatus NVARCHAR(30) NULL;

      IF COL_LENGTH('Orders', 'RefundAmount') IS NULL
        ALTER TABLE Orders ADD RefundAmount DECIMAL(18,2) NULL;

      IF COL_LENGTH('Orders', 'RefundedAt') IS NULL
        ALTER TABLE Orders ADD RefundedAt DATETIME NULL;

      IF COL_LENGTH('Orders', 'PaymentMethod') IS NULL
        ALTER TABLE Orders ADD PaymentMethod NVARCHAR(40) NULL;

      IF COL_LENGTH('Orders', 'CouponCode') IS NULL
        ALTER TABLE Orders ADD CouponCode NVARCHAR(50) NULL;

      IF COL_LENGTH('Orders', 'DiscountAmount') IS NULL
        ALTER TABLE Orders ADD DiscountAmount DECIMAL(18,2) NULL;

      IF COL_LENGTH('Orders', 'CancelReason') IS NULL
        ALTER TABLE Orders ADD CancelReason NVARCHAR(500) NULL;

      IF COL_LENGTH('Orders', 'CancelledAt') IS NULL
        ALTER TABLE Orders ADD CancelledAt DATETIME NULL;
    `);

    this.returnColumnsEnsured = true;
  }

  static async ensureOrderItemVariantColumns(pool) {
    if (this.orderItemVariantColumnsEnsured) {
      return;
    }

    await pool.request().query(`
      IF COL_LENGTH('dbo.OrderItems', 'VariantId') IS NULL
        ALTER TABLE dbo.OrderItems ADD VariantId INT NULL;

      IF COL_LENGTH('dbo.OrderItems', 'VariantName') IS NULL
        ALTER TABLE dbo.OrderItems ADD VariantName NVARCHAR(200) NULL;
    `);

    this.orderItemVariantColumnsEnsured = true;
  }
  /**
   * Tạo đơn hàng mới
   * @param {Object} orderData
   * @returns {Promise<Object>}
   */
  static async create(orderData) {
    const pool = getPool();
    const transaction = pool.transaction();
    
    try {
      await this.ensureReturnColumns(pool);
      await this.ensureOrderItemVariantColumns(pool);
      await transaction.begin();
      
      const {
        userId,
        totalAmount,
        shippingAddress,
        phone,
        items,
        paymentMethod,
        couponCode,
        discountAmount
      } = orderData;
      
      // Tạo order
      const orderResult = await transaction.request()
        .input('userId', sql.Int, userId)
        .input('totalAmount', sql.Decimal(18, 2), totalAmount)
        .input('shippingAddress', sql.NVarChar, shippingAddress)
        .input('phone', sql.NVarChar, phone)
        .input('paymentMethod', sql.NVarChar, paymentMethod || 'cod')
        .input('couponCode', sql.NVarChar, couponCode || null)
        .input('discountAmount', sql.Decimal(18, 2), Number(discountAmount || 0))
        .query(`
          INSERT INTO Orders (UserId, TotalAmount, ShippingAddress, Phone, PaymentMethod, CouponCode, DiscountAmount, Status, OrderDate)
          OUTPUT INSERTED.*
          VALUES (@userId, @totalAmount, @shippingAddress, @phone, @paymentMethod, @couponCode, @discountAmount, N'Chờ xác nhận', GETDATE())
        `);
      
      const order = orderResult.recordset[0];
      const orderId = order.OrderId;
      
      // Thêm order details và cập nhật stock
      for (const item of items) {
        const subtotal = item.Quantity * item.Price;
        
        await transaction.request()
          .input('orderId', sql.Int, orderId)
          .input('productId', sql.Int, item.ProductId)
          .input('variantId', sql.Int, this.toValidVariantId(item.VariantId))
          .input('variantName', sql.NVarChar, item.VariantName || null)
          .input('quantity', sql.Int, item.Quantity)
          .input('price', sql.Decimal(18, 2), item.Price)
          .input('subtotal', sql.Decimal(18, 2), subtotal)
          .query(`
            INSERT INTO OrderItems (OrderId, ProductId, VariantId, VariantName, Quantity, Price, Subtotal)
            VALUES (@orderId, @productId, @variantId, @variantName, @quantity, @price, @subtotal)
          `);

        const variantId = this.toValidVariantId(item.VariantId);
        let stockUpdateResult;

        if (Number.isInteger(variantId)) {
          stockUpdateResult = await transaction.request()
            .input('productId', sql.Int, item.ProductId)
            .input('variantId', sql.Int, variantId)
            .input('quantity', sql.Int, item.Quantity)
            .query(`
              UPDATE ProductVariants
              SET Stock = Stock - @quantity
              WHERE ProductId = @productId
                AND VariantId = @variantId
                AND Stock >= @quantity
            `);
        } else {
          // Cập nhật stock sản phẩm gốc khi không chọn biến thể.
          stockUpdateResult = await transaction.request()
            .input('productId', sql.Int, item.ProductId)
            .input('quantity', sql.Int, item.Quantity)
            .query(`
              UPDATE Products
              SET Stock = Stock - @quantity
              WHERE ProductId = @productId
                AND Stock >= @quantity
            `);
        }

        // Nếu không update được stock, nghĩa là kho đã thay đổi do request khác.
        if ((stockUpdateResult.rowsAffected?.[0] || 0) === 0) {
          const stockError = new Error(
            Number.isInteger(variantId)
              ? `Biến thể #${variantId} của sản phẩm #${item.ProductId} không đủ tồn kho để hoàn tất đơn hàng`
              : `Sản phẩm #${item.ProductId} không đủ tồn kho để hoàn tất đơn hàng`
          );
          stockError.code = 'INSUFFICIENT_STOCK';
          throw stockError;
        }
      }
      
      await transaction.commit();
      return order;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  /**
   * Lấy đơn hàng theo ID
   * @param {number} orderId
   * @returns {Promise<Object>}
   */
  static async findById(orderId) {
    try {
      const pool = getPool();
      await this.ensureReturnColumns(pool);
      await this.ensureOrderItemVariantColumns(pool);
      
      // Lấy thông tin order
      const orderResult = await pool.request()
        .input('orderId', sql.Int, orderId)
        .query(`
          SELECT o.*, u.FullName, u.Email
          FROM Orders o
          INNER JOIN Users u ON o.UserId = u.UserId
          WHERE o.OrderId = @orderId
        `);
      
      if (orderResult.recordset.length === 0) {
        return null;
      }
      
      const order = orderResult.recordset[0];
      
      // Lấy chi tiết order
      const detailsResult = await pool.request()
        .input('orderId', sql.Int, orderId)
        .query(`
          SELECT od.*, 
                 p.ProductName, 
               od.VariantId,
               od.VariantName,
                 (SELECT TOP 1 ImageURL FROM ProductImages WHERE ProductId = p.ProductId) as ImageUrl
          FROM OrderItems od
          INNER JOIN Products p ON od.ProductId = p.ProductId
          WHERE od.OrderId = @orderId
        `);
      
      order.Items = detailsResult.recordset;
      
      return order;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Lấy lịch sử đơn hàng của user
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  static async getOrderHistory(userId) {
    try {
      const pool = getPool();
      await this.ensureReturnColumns(pool);
      await this.ensureOrderItemVariantColumns(pool);
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT o.OrderId, o.TotalAmount, o.Status, o.OrderDate, o.ShippingAddress,
               o.PaymentMethod, o.CouponCode, o.DiscountAmount,
                 o.CancelReason, o.CancelledAt,
                 o.ReturnReason, o.ReturnRequestAt, o.ReturnShippedAt,
                 o.ReturnDecision, o.ReturnDecisionReason, o.ReturnInspectedAt,
                 o.RefundStatus, o.RefundAmount, o.RefundedAt,
                 COUNT(od.OrderItemId) AS ItemCount
          FROM Orders o
          LEFT JOIN OrderItems od ON o.OrderId = od.OrderId
          WHERE o.UserId = @userId
          GROUP BY o.OrderId, o.TotalAmount, o.Status, o.OrderDate, o.ShippingAddress,
                   o.PaymentMethod, o.CouponCode, o.DiscountAmount,
                   o.CancelReason, o.CancelledAt,
                   o.ReturnReason, o.ReturnRequestAt, o.ReturnShippedAt,
                   o.ReturnDecision, o.ReturnDecisionReason, o.ReturnInspectedAt,
                   o.RefundStatus, o.RefundAmount, o.RefundedAt
          ORDER BY o.OrderDate DESC
        `);
      
      return result.recordset;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Lấy tất cả đơn hàng (cho admin)
   * @returns {Promise<Array>}
   */
  static async getAll() {
    try {
      const pool = getPool();
      await this.ensureReturnColumns(pool);
      await this.ensureOrderItemVariantColumns(pool);
      const result = await pool.request()
        .query(`
          SELECT o.OrderId, o.UserId, o.TotalAmount, o.ShippingAddress, o.Phone,
                 o.PaymentMethod, o.AddressId, o.Status, o.OrderDate, o.CreatedAt, o.UpdatedAt,
                 o.CouponCode, o.DiscountAmount,
                 o.CancelReason, o.CancelledAt,
                 o.ReturnReason, o.ReturnRequestAt, o.ReturnShippedAt,
                 o.ReturnDecision, o.ReturnDecisionReason, o.ReturnInspectedAt,
                 o.RefundStatus, o.RefundAmount, o.RefundedAt,
                 u.FullName, u.Email, u.Phone AS UserPhone,
                 COUNT(od.OrderItemId) AS ItemCount
          FROM Orders o
          INNER JOIN Users u ON o.UserId = u.UserId
          LEFT JOIN OrderItems od ON o.OrderId = od.OrderId
          GROUP BY o.OrderId, o.UserId, o.TotalAmount, o.ShippingAddress, o.Phone,
                   o.PaymentMethod, o.AddressId, o.Status, o.OrderDate, o.CreatedAt, o.UpdatedAt,
                   o.CouponCode, o.DiscountAmount,
                   o.CancelReason, o.CancelledAt,
                   o.ReturnReason, o.ReturnRequestAt, o.ReturnShippedAt,
                   o.ReturnDecision, o.ReturnDecisionReason, o.ReturnInspectedAt,
                   o.RefundStatus, o.RefundAmount, o.RefundedAt,
                   u.FullName, u.Email, u.Phone
          ORDER BY o.OrderDate DESC
        `);
      
      return result.recordset;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Cập nhật trạng thái đơn hàng
   * @param {number} orderId
   * @param {string} status
   * @returns {Promise<Object>}
   */
  static async updateStatus(orderId, status) {
    try {
      const pool = getPool();
      const result = await pool.request()
        .input('orderId', sql.Int, orderId)
        .input('status', sql.NVarChar, status)
        .query(`
          UPDATE Orders 
          SET Status = @status
          OUTPUT INSERTED.*
          WHERE OrderId = @orderId
        `);
      
      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }

  static async cancelOrder(orderId, reason) {
    try {
      const pool = getPool();
      await this.ensureReturnColumns(pool);

      const result = await pool.request()
        .input('orderId', sql.Int, orderId)
        .input('reason', sql.NVarChar, reason)
        .query(`
          UPDATE Orders
          SET Status = N'Đã hủy',
              CancelReason = @reason,
              CancelledAt = GETDATE()
          OUTPUT INSERTED.*
          WHERE OrderId = @orderId
        `);

      return result.recordset[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async createReturnRequest(orderId, reason) {
    try {
      const pool = getPool();
      await this.ensureReturnColumns(pool);

      const result = await pool.request()
        .input('orderId', sql.Int, orderId)
        .input('reason', sql.NVarChar, reason)
        .query(`
          UPDATE Orders
          SET Status = N'Yêu cầu trả hàng',
              ReturnReason = @reason,
              ReturnRequestAt = GETDATE(),
              ReturnShippedAt = NULL,
              ReturnDecision = NULL,
              ReturnDecisionReason = NULL,
              ReturnInspectedAt = NULL,
              RefundStatus = N'pending',
              RefundAmount = NULL,
              RefundedAt = NULL
          OUTPUT INSERTED.*
          WHERE OrderId = @orderId
        `);

      return result.recordset[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async markReturnShipped(orderId) {
    try {
      const pool = getPool();
      await this.ensureReturnColumns(pool);

      const result = await pool.request()
        .input('orderId', sql.Int, orderId)
        .query(`
          UPDATE Orders
          SET Status = N'Đã gửi trả hàng',
              ReturnShippedAt = GETDATE()
          OUTPUT INSERTED.*
          WHERE OrderId = @orderId
        `);

      return result.recordset[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async processReturnInspection(orderId, action, decisionReason, refundAmount) {
    try {
      const pool = getPool();
      await this.ensureReturnColumns(pool);

      const normalizedAction = String(action || '').trim().toLowerCase();

      if (normalizedAction === 'approve') {
        const result = await pool.request()
          .input('orderId', sql.Int, orderId)
          .input('decisionReason', sql.NVarChar, decisionReason || null)
          .input('refundAmount', sql.Decimal(18, 2), refundAmount)
          .query(`
            UPDATE Orders
            SET Status = N'Đã hoàn trả',
                ReturnDecision = N'approved',
                ReturnDecisionReason = @decisionReason,
                ReturnInspectedAt = GETDATE(),
                RefundStatus = N'refunded',
                RefundAmount = @refundAmount,
                RefundedAt = GETDATE()
            OUTPUT INSERTED.*
            WHERE OrderId = @orderId
          `);

        return result.recordset[0] || null;
      }

      const result = await pool.request()
        .input('orderId', sql.Int, orderId)
        .input('decisionReason', sql.NVarChar, decisionReason || null)
        .query(`
          UPDATE Orders
          SET Status = N'Từ chối hoàn trả',
              ReturnDecision = N'rejected',
              ReturnDecisionReason = @decisionReason,
              ReturnInspectedAt = GETDATE(),
              RefundStatus = N'rejected',
              RefundedAt = NULL
          OUTPUT INSERTED.*
          WHERE OrderId = @orderId
        `);

      return result.recordset[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async restoreVariantStock(productId, variantId, quantity) {
    try {
      const pool = getPool();
      await this.ensureOrderItemVariantColumns(pool);

      await pool.request()
        .input('productId', sql.Int, productId)
        .input('variantId', sql.Int, variantId)
        .input('quantity', sql.Int, quantity)
        .query(`
          UPDATE ProductVariants
          SET Stock = Stock + @quantity
          WHERE ProductId = @productId AND VariantId = @variantId
        `);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = OrderModel;
