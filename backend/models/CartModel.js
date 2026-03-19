/**
 * Cart Model
 * Model để thao tác với bảng Cart
 */

const { sql, getPool } = require('../config/database');
const ProductModel = require('./ProductModel');

class CartModel {
  static saleColumnsEnsured = false;
  static cartVariantColumnEnsured = false;

  static async ensureSaleColumns(pool) {
    if (this.saleColumnsEnsured) {
      return;
    }

    await pool.request().query(`
      IF COL_LENGTH('dbo.Products', 'SalePrice') IS NULL
        ALTER TABLE dbo.Products ADD SalePrice DECIMAL(18,2) NULL;
    `);

    this.saleColumnsEnsured = true;
  }

  static async ensureCartVariantColumn(pool) {
    if (this.cartVariantColumnEnsured) {
      return;
    }

    await pool.request().query(`
      IF COL_LENGTH('dbo.Cart', 'VariantId') IS NULL
        ALTER TABLE dbo.Cart ADD VariantId INT NULL;
    `);

    this.cartVariantColumnEnsured = true;
  }

  /**
   * Lấy item giỏ theo user + product
   * @param {number} userId
   * @param {number} productId
   * @returns {Promise<Object|null>}
   */
  static async findCartItem(userId, productId, variantId = null) {
    try {
      const pool = getPool();
      await this.ensureCartVariantColumn(pool);
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('productId', sql.Int, productId)
        .input('variantId', sql.Int, Number.isInteger(variantId) ? variantId : null)
        .query(`
          SELECT TOP 1 CartId, UserId, ProductId, VariantId, Quantity
          FROM Cart
          WHERE UserId = @userId
            AND ProductId = @productId
            AND ((VariantId = @variantId) OR (VariantId IS NULL AND @variantId IS NULL))
        `);

      return result.recordset[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy item giỏ theo cartId kèm tồn kho sản phẩm
   * @param {number} cartId
   * @param {number} userId
   * @returns {Promise<Object|null>}
   */
  static async findCartItemWithStock(cartId, userId) {
    try {
      const pool = getPool();
      await this.ensureCartVariantColumn(pool);
      await ProductModel.ensureVariantsTable(pool);
      const result = await pool.request()
        .input('cartId', sql.Int, cartId)
        .input('userId', sql.Int, userId)
        .query(`
          SELECT TOP 1
            c.CartId,
            c.UserId,
            c.ProductId,
            c.VariantId,
            c.Quantity,
            CASE
              WHEN c.VariantId IS NOT NULL THEN ISNULL(pv.Stock, 0)
              ELSE p.Stock
            END AS Stock,
            pv.VariantName
          FROM Cart c
          INNER JOIN Products p ON c.ProductId = p.ProductId
          LEFT JOIN ProductVariants pv ON c.VariantId = pv.VariantId AND pv.ProductId = p.ProductId
          WHERE c.CartId = @cartId AND c.UserId = @userId
        `);

      return result.recordset[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy giỏ hàng của user
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  static async getCartByUserId(userId) {
    try {
      const pool = getPool();
      await this.ensureCartVariantColumn(pool);
      await this.ensureSaleColumns(pool);
      await ProductModel.ensureVariantsTable(pool);
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT 
            c.CartId, 
            c.UserId, 
            c.ProductId, 
            c.VariantId,
            c.Quantity,
            p.ProductName, 
            CASE
              WHEN c.VariantId IS NOT NULL AND pv.VariantId IS NOT NULL THEN pv.Price
              WHEN p.SalePrice IS NOT NULL AND p.SalePrice > 0 AND p.SalePrice < p.Price THEN p.SalePrice
              ELSE p.Price
            END AS Price,
            CASE
              WHEN c.VariantId IS NOT NULL AND pv.VariantId IS NOT NULL THEN pv.Price
              ELSE p.Price
            END AS OriginalPrice,
            CASE
              WHEN c.VariantId IS NOT NULL THEN NULL
              ELSE p.SalePrice
            END AS SalePrice,
            CASE
              WHEN c.VariantId IS NOT NULL THEN CAST(0 AS BIT)
              WHEN p.SalePrice IS NOT NULL AND p.SalePrice > 0 AND p.SalePrice < p.Price THEN CAST(1 AS BIT)
              ELSE CAST(0 AS BIT)
            END AS IsOnSale,
            pv.VariantName,
            COALESCE(pv.VariantImageUrl, ( SELECT TOP 1 ImageURL FROM ProductImages WHERE ProductID = p.ProductID )) as ImageUrl,
            CASE
              WHEN c.VariantId IS NOT NULL THEN ISNULL(pv.Stock, 0)
              ELSE p.Stock
            END AS Stock,
            (c.Quantity * (
              CASE
                WHEN c.VariantId IS NOT NULL AND pv.VariantId IS NOT NULL THEN pv.Price
                WHEN p.SalePrice IS NOT NULL AND p.SalePrice > 0 AND p.SalePrice < p.Price THEN p.SalePrice
                ELSE p.Price
              END
            )) AS Subtotal
          FROM Cart c
          INNER JOIN Products p ON c.ProductId = p.ProductId
          LEFT JOIN ProductVariants pv ON c.VariantId = pv.VariantId AND pv.ProductId = p.ProductId
          WHERE c.UserId = @userId
        `);
      
      return result.recordset;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Thêm sản phẩm vào giỏ hàng
   * @param {number} userId
   * @param {number} productId
   * @param {number} quantity
   * @returns {Promise<Object>}
   */
  static async addToCart(userId, productId, quantity, variantId = null) {
    try {
      const pool = getPool();
      await this.ensureCartVariantColumn(pool);
      const normalizedVariantId = Number.isInteger(variantId) ? variantId : null;
      
      // Kiểm tra xem sản phẩm đã có trong giỏ chưa
      const existingItem = await pool.request()
        .input('userId', sql.Int, userId)
        .input('productId', sql.Int, productId)
        .input('variantId', sql.Int, normalizedVariantId)
        .query(`
          SELECT TOP 1 *
          FROM Cart
          WHERE UserId = @userId
            AND ProductId = @productId
            AND ((VariantId = @variantId) OR (VariantId IS NULL AND @variantId IS NULL))
        `);
      
      if (existingItem.recordset.length > 0) {
        // Cập nhật số lượng
        const result = await pool.request()
          .input('userId', sql.Int, userId)
          .input('productId', sql.Int, productId)
          .input('variantId', sql.Int, normalizedVariantId)
          .input('quantity', sql.Int, quantity)
          .query(`
            UPDATE Cart 
            SET Quantity = Quantity + @quantity
            OUTPUT INSERTED.*
            WHERE UserId = @userId
              AND ProductId = @productId
              AND ((VariantId = @variantId) OR (VariantId IS NULL AND @variantId IS NULL))
          `);
        
        return result.recordset[0];
      } else {
        // Thêm mới
        const result = await pool.request()
          .input('userId', sql.Int, userId)
          .input('productId', sql.Int, productId)
          .input('variantId', sql.Int, normalizedVariantId)
          .input('quantity', sql.Int, quantity)
          .query(`
            INSERT INTO Cart (UserId, ProductId, VariantId, Quantity)
            OUTPUT INSERTED.*
            VALUES (@userId, @productId, @variantId, @quantity)
          `);
        
        return result.recordset[0];
      }
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Cập nhật số lượng sản phẩm trong giỏ
   * @param {number} cartId
   * @param {number} userId
   * @param {number} quantity
   * @returns {Promise<Object>}
   */
  static async updateQuantity(cartId, userId, quantity) {
    try {
      const pool = getPool();
      const result = await pool.request()
        .input('cartId', sql.Int, cartId)
        .input('userId', sql.Int, userId)
        .input('quantity', sql.Int, quantity)
        .query(`
          UPDATE Cart 
          SET Quantity = @quantity
          OUTPUT INSERTED.*
          WHERE CartId = @cartId AND UserId = @userId
        `);
      
      return result.recordset[0] || null;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Xóa sản phẩm khỏi giỏ
   * @param {number} cartId
   * @param {number} userId
   * @returns {Promise<boolean>}
   */
  static async removeFromCart(cartId, userId) {
    try {
      const pool = getPool();
      const result = await pool.request()
        .input('cartId', sql.Int, cartId)
        .input('userId', sql.Int, userId)
        .query('DELETE FROM Cart WHERE CartId = @cartId AND UserId = @userId');

      return (result.rowsAffected?.[0] || 0) > 0;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Xóa toàn bộ giỏ hàng của user
   * @param {number} userId
   * @returns {Promise}
   */
  static async clearCart(userId) {
    try {
      const pool = getPool();
      await pool.request()
        .input('userId', sql.Int, userId)
        .query('DELETE FROM Cart WHERE UserId = @userId');
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CartModel;
