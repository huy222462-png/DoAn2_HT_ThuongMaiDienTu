/**
 * Review Model
 * Model để thao tác với bảng Reviews
 */

const { sql, getPool } = require('../config/database');

class ReviewModel {
  /**
   * Tạo đánh giá mới
   * @param {Object} reviewData
   * @returns {Promise<Object>}
   */
  static async create(reviewData) {
    try {
      const pool = getPool();
      const { userId, productId, rating, comment } = reviewData;
      
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('productId', sql.Int, productId)
        .input('rating', sql.Int, rating)
        .input('comment', sql.NVarChar, comment || null)
        .query(`
          INSERT INTO Reviews (UserId, ProductId, Rating, Comment, CreatedAt)
          OUTPUT INSERTED.*
          VALUES (@userId, @productId, @rating, @comment, GETDATE())
        `);
      
      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Lấy đánh giá theo sản phẩm
   * @param {number} productId
   * @returns {Promise<Array>}
   */
  static async getByProductId(productId) {
    try {
      const pool = getPool();
      const result = await pool.request()
        .input('productId', sql.Int, productId)
        .query(`
          SELECT 
            r.ReviewID,
            r.ProductID,
            r.UserID,
            r.Rating,
            r.Comment,
            r.CreatedAt,
            u.Username as UserName,
            u.Email
          FROM Reviews r
          INNER JOIN Users u ON r.UserId = u.UserId
          WHERE r.ProductId = @productId
          ORDER BY r.CreatedAt DESC
        `);
      
      return result.recordset;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Kiểm tra user đã đánh giá sản phẩm chưa
   * @param {number} userId
   * @param {number} productId
   * @returns {Promise<boolean>}
   */
  static async hasUserReviewed(userId, productId) {
    try {
      const pool = getPool();
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('productId', sql.Int, productId)
        .query('SELECT COUNT(*) AS Count FROM Reviews WHERE UserId = @userId AND ProductId = @productId');
      
      return result.recordset[0].Count > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ReviewModel;
