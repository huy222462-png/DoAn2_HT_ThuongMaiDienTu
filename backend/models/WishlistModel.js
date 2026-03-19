/**
 * Wishlist Model
 * Model thao tác bảng Wishlist
 */

const { sql, getPool } = require('../config/database');

class WishlistModel {
  static tableEnsured = false;

  static async ensureTable(pool) {
    if (this.tableEnsured) {
      return;
    }

    await pool.request().query(`
      IF OBJECT_ID('dbo.Wishlist', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.Wishlist (
          WishlistId INT IDENTITY(1,1) PRIMARY KEY,
          UserId INT NOT NULL,
          ProductId INT NOT NULL,
          CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
          CONSTRAINT FK_Wishlist_Users FOREIGN KEY (UserId)
            REFERENCES dbo.Users(UserId)
            ON DELETE CASCADE,
          CONSTRAINT FK_Wishlist_Products FOREIGN KEY (ProductId)
            REFERENCES dbo.Products(ProductId)
            ON DELETE CASCADE
        );

        CREATE UNIQUE INDEX UX_Wishlist_User_Product ON dbo.Wishlist(UserId, ProductId);
        CREATE INDEX IX_Wishlist_UserId ON dbo.Wishlist(UserId);
      END
    `);

    this.tableEnsured = true;
  }

  static async getByUserId(userId) {
    const pool = getPool();
    await this.ensureTable(pool);

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT
          w.WishlistId,
          w.UserId,
          w.ProductId,
          w.CreatedAt,
          p.ProductName AS product_name,
          p.Price AS price,
          p.Stock AS stock_quantity,
          c.CategoryName AS category_name,
          (SELECT TOP 1 ImageURL FROM ProductImages WHERE ProductID = p.ProductID) AS image_url
        FROM Wishlist w
        INNER JOIN Products p ON w.ProductId = p.ProductId
        LEFT JOIN Categories c ON p.CategoryId = c.CategoryId
        WHERE w.UserId = @userId
        ORDER BY w.CreatedAt DESC
      `);

    return result.recordset;
  }

  static async exists(userId, productId) {
    const pool = getPool();
    await this.ensureTable(pool);

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('productId', sql.Int, productId)
      .query(`
        SELECT TOP 1 WishlistId
        FROM Wishlist
        WHERE UserId = @userId AND ProductId = @productId
      `);

    return result.recordset.length > 0;
  }

  static async add(userId, productId) {
    const pool = getPool();
    await this.ensureTable(pool);

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('productId', sql.Int, productId)
      .query(`
        IF NOT EXISTS (
          SELECT 1 FROM Wishlist WHERE UserId = @userId AND ProductId = @productId
        )
        BEGIN
          INSERT INTO Wishlist (UserId, ProductId)
          OUTPUT INSERTED.*
          VALUES (@userId, @productId)
        END
        ELSE
        BEGIN
          SELECT TOP 1 * FROM Wishlist WHERE UserId = @userId AND ProductId = @productId
        END
      `);

    return result.recordset[0] || null;
  }

  static async remove(userId, productId) {
    const pool = getPool();
    await this.ensureTable(pool);

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('productId', sql.Int, productId)
      .query('DELETE FROM Wishlist WHERE UserId = @userId AND ProductId = @productId');

    return (result.rowsAffected?.[0] || 0) > 0;
  }
}

module.exports = WishlistModel;
