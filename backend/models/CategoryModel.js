/**
 * Category Model
 * Model để thao tác với bảng Categories
 */

const { sql, getPool } = require('../config/database');

class CategoryModel {
  /**
   * Lấy tất cả danh mục
   * @returns {Promise<Array>}
   */
  static async getAll() {
    try {
      const pool = getPool();
      const result = await pool.request()
        .query(`
          SELECT 
            CategoryId as category_id,
            CategoryName as category_name,
            Description as description
          FROM Categories 
          ORDER BY CategoryName
        `);
      
      return result.recordset;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Tìm danh mục theo ID
   * @param {number} categoryId
   * @returns {Promise<Object>}
   */
  static async findById(categoryId) {
    try {
      const pool = getPool();
      const result = await pool.request()
        .input('categoryId', sql.Int, categoryId)
        .query(`
          SELECT 
            CategoryId as category_id,
            CategoryName as category_name,
            Description as description
          FROM Categories 
          WHERE CategoryId = @categoryId
        `);
      
      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Tạo danh mục mới
   * @param {Object} categoryData
   * @returns {Promise<Object>}
   */
  static async create(categoryData) {
    try {
      const pool = getPool();
      const { categoryName, description } = categoryData;
      
      const result = await pool.request()
        .input('categoryName', sql.NVarChar, categoryName)
        .input('description', sql.NVarChar, description || null)
        .query(`
          INSERT INTO Categories (CategoryName, Description)
          OUTPUT INSERTED.*
          VALUES (@categoryName, @description)
        `);
      
      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Cập nhật danh mục
   * @param {number} categoryId
   * @param {Object} categoryData
   * @returns {Promise<Object>}
   */
  static async update(categoryId, categoryData) {
    try {
      const pool = getPool();
      const { categoryName, description } = categoryData;
      
      const result = await pool.request()
        .input('categoryId', sql.Int, categoryId)
        .input('categoryName', sql.NVarChar, categoryName)
        .input('description', sql.NVarChar, description)
        .query(`
          UPDATE Categories 
          SET CategoryName = @categoryName, Description = @description
          OUTPUT INSERTED.*
          WHERE CategoryId = @categoryId
        `);
      
      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Xóa danh mục
   * @param {number} categoryId
   * @returns {Promise}
   */
  static async delete(categoryId) {
    try {
      const pool = getPool();
      await pool.request()
        .input('categoryId', sql.Int, categoryId)
        .query('DELETE FROM Categories WHERE CategoryId = @categoryId');
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CategoryModel;
