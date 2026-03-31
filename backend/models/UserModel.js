
const { sql, getPool } = require('../config/database');
const bcrypt = require('bcrypt');

class UserModel {
    static async create(userData) {
    try {
      const pool = getPool();
      const { username, email, password, fullName, phone, address } = userData;
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
  
    static async findById(userId) {
    try {
      const pool = getPool();
      try {
        const result = await pool.request()
          .input('userId', sql.Int, userId)
          .query('SELECT UserId, Username, Email, FullName, Phone, Address, IsAdmin, IsLocked, CreatedAt, ProfileImage FROM Users WHERE UserId = @userId');

        return result.recordset[0];
      } catch (error) {
        // Keep auth working on older databases that do not have ProfileImage yet.
        if (!String(error.message || '').includes('ProfileImage')) {
          throw error;
        }

        const fallbackResult = await pool.request()
          .input('userId', sql.Int, userId)
          .query('SELECT UserId, Username, Email, FullName, Phone, Address, IsAdmin, IsLocked, CreatedAt, NULL AS ProfileImage FROM Users WHERE UserId = @userId');

        return fallbackResult.recordset[0];
      }
    } catch (error) {
      throw error;
    }
  }

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
  
    static async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }
  
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

    static async updateProfileImage(userId, profileImage) {
    try {
      const pool = getPool();

      await pool.request()
        .input('userId', sql.Int, userId)
        .input('profileImage', sql.NVarChar(500), profileImage)
        .query('UPDATE Users SET ProfileImage = @profileImage WHERE UserId = @userId');
    } catch (error) {
      throw error;
    }
  }
  
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
