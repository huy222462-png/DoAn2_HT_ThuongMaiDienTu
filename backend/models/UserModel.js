/**
 * User Model
 * Model để thao tác với bảng Users
 */

const { sql, getPool } = require('../config/database');
const bcrypt = require('bcrypt');

class UserModel {
  /**
   * Tạo user mới
   * @param {Object} userData - Dữ liệu user
   * @returns {Promise<Object>}
   */
  static async create(userData) {
    try {
      const pool = getPool();
      const { username, email, password, fullName, phone, address } = userData;
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await pool.request()
        .input('username', sql.NVarChar, username)
        .input('email', sql.NVarChar, email)
        .input('password', sql.NVarChar, hashedPassword)
        .input('fullName', sql.NVarChar, fullName)
        .input('phone', sql.NVarChar, phone || null)
        .input('address', sql.NVarChar, address || null)
        .query(`
          INSERT INTO Users (Username, Email, Password, FullName, Phone, Address, IsAdmin, IsLocked, LoginAttempts, CreatedAt)
          OUTPUT INSERTED.*
          VALUES (@username, @email, @password, @fullName, @phone, @address, 0, 0, 0, GETDATE())
        `);
      
      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Tìm user theo email
   * @param {string} email
   * @returns {Promise<Object>}
   */
  static async findByEmail(email) {
    try {
      const pool = getPool();
      const result = await pool.request()
        .input('email', sql.NVarChar, email)
        .query('SELECT * FROM Users WHERE Email = @email');
      
      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Tìm user theo số điện thoại
   * @param {string} phone
   * @returns {Promise<Object>}
   */
  static async findByPhone(phone) {
    try {
      const pool = getPool();
      const normalizedPhone = String(phone || '').replace(/\D/g, '');
      const result = await pool.request()
        .input('phone', sql.NVarChar, normalizedPhone)
        .query("SELECT * FROM Users WHERE REPLACE(REPLACE(REPLACE(Phone, ' ', ''), '.', ''), '-', '') = @phone");

      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Tìm user bằng định danh đăng nhập (email hoặc số điện thoại)
   * @param {string} identifier
   * @param {string} loginMethod
   * @returns {Promise<Object>}
   */
  static async findByLoginIdentifier(identifier, loginMethod = 'auto') {
    const normalizedIdentifier = String(identifier || '').trim();
    if (!normalizedIdentifier) {
      return null;
    }

    const method = String(loginMethod || 'auto').trim().toLowerCase();

    if (method === 'email') {
      return this.findByEmail(normalizedIdentifier.toLowerCase());
    }

    if (method === 'phone') {
      return this.findByPhone(normalizedIdentifier);
    }

    const isEmailFormat = normalizedIdentifier.includes('@');
    if (isEmailFormat) {
      return this.findByEmail(normalizedIdentifier.toLowerCase());
    }

    const byPhone = await this.findByPhone(normalizedIdentifier);
    if (byPhone) {
      return byPhone;
    }

    return this.findByEmail(normalizedIdentifier.toLowerCase());
  }
  
  /**
   * Tìm user theo username
   * @param {string} username
   * @returns {Promise<Object>}
   */
  static async findByUsername(username) {
    try {
      const pool = getPool();
      const result = await pool.request()
        .input('username', sql.NVarChar, username)
        .query('SELECT * FROM Users WHERE Username = @username');
      
      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Tìm user theo ID
   * @param {number} userId
   * @returns {Promise<Object>}
   */
  static async findById(userId) {
    try {
      const pool = getPool();
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query('SELECT UserId, Username, Email, FullName, Phone, Address, IsAdmin, IsLocked, CreatedAt FROM Users WHERE UserId = @userId');
      
      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Tìm user theo ID kèm password hash
   * @param {number} userId
   * @returns {Promise<Object>}
   */
  static async findByIdWithPassword(userId) {
    try {
      const pool = getPool();
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query('SELECT * FROM Users WHERE UserId = @userId');

      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * So sánh password
   * @param {string} candidatePassword
   * @param {string} hashedPassword
   * @returns {Promise<boolean>}
   */
  static async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }
  
  /**
   * Tăng số lần đăng nhập sai
   * @param {number} userId
   * @returns {Promise}
   */
  static async incrementLoginAttempts(userId) {
    try {
      const pool = getPool();
      await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          UPDATE Users 
          SET LoginAttempts = LoginAttempts + 1,
              LockedUntil = CASE 
                WHEN LoginAttempts + 1 >= 5 THEN DATEADD(MINUTE, 30, GETDATE())
                ELSE LockedUntil
              END,
              IsLocked = CASE 
                WHEN LoginAttempts + 1 >= 5 THEN 1
                ELSE IsLocked
              END
          WHERE UserId = @userId
        `);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Reset số lần đăng nhập sai
   * @param {number} userId
   * @returns {Promise}
   */
  static async resetLoginAttempts(userId) {
    try {
      const pool = getPool();
      await pool.request()
        .input('userId', sql.Int, userId)
        .query('UPDATE Users SET LoginAttempts = 0, LockedUntil = NULL, IsLocked = 0 WHERE UserId = @userId');
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Lấy tất cả users (cho admin)
   * @returns {Promise<Array>}
   */
  static async getAll() {
    try {
      const pool = getPool();
      const result = await pool.request()
        .query('SELECT UserId, Username, Email, FullName, Phone, Address, IsAdmin, IsLocked, CreatedAt FROM Users ORDER BY CreatedAt DESC');
      
      return result.recordset;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy danh sách người nhận email marketing
   * @returns {Promise<Array>}
   */
  static async getMarketingRecipients() {
    try {
      const pool = getPool();
      const result = await pool.request().query(`
        SELECT UserId, FullName, Email
        FROM Users
        WHERE Email IS NOT NULL
          AND LTRIM(RTRIM(Email)) <> ''
          AND IsLocked = 0
        ORDER BY CreatedAt DESC
      `);

      return result.recordset;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Cập nhật user
   * @param {number} userId
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  static async update(userId, updateData) {
    try {
      const pool = getPool();
      const { fullName, phone, address } = updateData;
      
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('fullName', sql.NVarChar, fullName)
        .input('phone', sql.NVarChar, phone)
        .input('address', sql.NVarChar, address)
        .query(`
          UPDATE Users 
          SET FullName = @fullName, Phone = @phone, Address = @address
          OUTPUT INSERTED.UserId, INSERTED.Username, INSERTED.Email, INSERTED.FullName, INSERTED.Phone, INSERTED.Address
          WHERE UserId = @userId
        `);
      
      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cập nhật mật khẩu
   * @param {number} userId
   * @param {string} newPassword
   * @returns {Promise}
   */
  static async updatePassword(userId, newPassword) {
    try {
      const pool = getPool();
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await pool.request()
        .input('userId', sql.Int, userId)
        .input('password', sql.NVarChar, hashedPassword)
        .query('UPDATE Users SET Password = @password WHERE UserId = @userId');
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Khóa/Mở khóa user (cho admin)
   * @param {number} userId
   * @param {boolean} isLocked
   * @returns {Promise}
   */
  static async toggleLock(userId, isLocked) {
    try {
      const pool = getPool();
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('isLocked', sql.Bit, isLocked)
        .query(`
          UPDATE Users 
          SET IsLocked = @isLocked, 
              LoginAttempts = 0,
              LockedUntil = NULL
          WHERE UserId = @userId
        `);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserModel;
