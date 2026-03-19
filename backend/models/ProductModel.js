/**
 * Product Model
 * Model để thao tác với bảng Products
 */

const { sql, getPool } = require('../config/database');

class ProductModel {
  static variantsTableAvailable = null;
  static saleColumnsEnsured = false;

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

  static normalizeVariants(rawVariants) {
    if (!Array.isArray(rawVariants)) {
      return [];
    }

    return rawVariants
      .map((variant) => {
        const name = String(variant?.name || variant?.variant_name || '').trim();
        const priceValue = Number(variant?.price);
        const stockValue = Number(variant?.stock);
        const imageUrl = String(variant?.imageUrl || variant?.image_url || '').trim();
        const imageListRaw = Array.isArray(variant?.imageUrls)
          ? variant.imageUrls
          : (Array.isArray(variant?.image_urls) ? variant.image_urls : []);

        const normalizedImageUrls = imageListRaw
          .map((item) => String(item || '').trim())
          .filter(Boolean)
          .slice(0, 20);

        if (imageUrl && !normalizedImageUrls.includes(imageUrl)) {
          normalizedImageUrls.unshift(imageUrl);
        }

        const finalImageUrls = normalizedImageUrls.filter(Boolean);

        if (!name || !Number.isFinite(priceValue) || priceValue < 0 || !Number.isInteger(stockValue) || stockValue < 0) {
          return null;
        }

        return {
          name,
          price: priceValue,
          stock: stockValue,
          imageUrl: finalImageUrls[0] || imageUrl || null,
          imageUrls: finalImageUrls
        };
      })
      .filter(Boolean);
  }

  static deriveBaseValues(price, stock, variants = []) {
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);
    const hasValidInputPrice = Number.isFinite(parsedPrice) && parsedPrice >= 0;
    const hasValidInputStock = Number.isInteger(parsedStock) && parsedStock >= 0;

    if (hasValidInputPrice && hasValidInputStock) {
      return {
        price: parsedPrice,
        stock: parsedStock
      };
    }

    if (variants.length > 0) {
      return {
        price: hasValidInputPrice ? parsedPrice : Math.min(...variants.map((item) => item.price)),
        stock: hasValidInputStock ? parsedStock : variants.reduce((sum, item) => sum + item.stock, 0)
      };
    }

    return {
      price: hasValidInputPrice ? parsedPrice : 0,
      stock: hasValidInputStock ? parsedStock : 0
    };
  }

  static async hasVariantsTable(pool) {
    if (this.variantsTableAvailable !== null) {
      return this.variantsTableAvailable;
    }

    const result = await pool.request().query(`
      SELECT 1 AS has_table
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'ProductVariants'
    `);

    this.variantsTableAvailable = result.recordset.length > 0;
    return this.variantsTableAvailable;
  }

  static async ensureVariantsTable(pool) {
    const hasTable = await this.hasVariantsTable(pool);
    if (!hasTable) {
      await pool.request().query(`
        IF OBJECT_ID('dbo.ProductVariants', 'U') IS NULL
        BEGIN
          CREATE TABLE dbo.ProductVariants (
            VariantId INT IDENTITY(1,1) PRIMARY KEY,
            ProductId INT NOT NULL,
            VariantName NVARCHAR(120) NOT NULL,
            Price DECIMAL(18,2) NOT NULL,
            Stock INT NOT NULL DEFAULT 0,
            VariantImageUrl NVARCHAR(500) NULL,
            VariantImagesJson NVARCHAR(MAX) NULL,
            CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
            CONSTRAINT FK_ProductVariants_Products FOREIGN KEY (ProductId)
              REFERENCES dbo.Products(ProductId)
              ON DELETE CASCADE
          );

          CREATE INDEX IX_ProductVariants_ProductId ON dbo.ProductVariants(ProductId);
        END
      `);
    }

    await pool.request().query(`
      IF COL_LENGTH('dbo.ProductVariants', 'VariantImageUrl') IS NULL
        ALTER TABLE dbo.ProductVariants ADD VariantImageUrl NVARCHAR(500) NULL;
    `);

    await pool.request().query(`
      IF COL_LENGTH('dbo.ProductVariants', 'VariantImagesJson') IS NULL
        ALTER TABLE dbo.ProductVariants ADD VariantImagesJson NVARCHAR(MAX) NULL;
    `);

    this.variantsTableAvailable = true;
  }

  static async getVariantsByProductIds(pool, productIds = []) {
    if (!productIds.length) {
      return new Map();
    }

    const hasTable = await this.hasVariantsTable(pool);
    if (!hasTable) {
      return new Map();
    }

    // Ensure latest optional columns exist for backward-compatible reads on older DB schema.
    await this.ensureVariantsTable(pool);

    const request = pool.request();
    const placeholders = productIds.map((id, index) => {
      const paramName = `productId${index}`;
      request.input(paramName, sql.Int, id);
      return `@${paramName}`;
    });

    let result;
    try {
      result = await request.query(`
        SELECT
          VariantId AS variant_id,
          ProductId AS product_id,
          VariantName AS variant_name,
          Price AS price,
          Stock AS stock,
          VariantImageUrl AS image_url,
          VariantImagesJson AS image_urls_json
        FROM ProductVariants
        WHERE ProductId IN (${placeholders.join(', ')})
        ORDER BY VariantId ASC
      `);
    } catch (error) {
      // Fallback for legacy schema that still misses VariantImagesJson.
      result = await request.query(`
        SELECT
          VariantId AS variant_id,
          ProductId AS product_id,
          VariantName AS variant_name,
          Price AS price,
          Stock AS stock,
          VariantImageUrl AS image_url,
          NULL AS image_urls_json
        FROM ProductVariants
        WHERE ProductId IN (${placeholders.join(', ')})
        ORDER BY VariantId ASC
      `);
    }

    const variantMap = new Map();
    for (const row of result.recordset) {
      const productId = Number(row.product_id);
      if (!variantMap.has(productId)) {
        variantMap.set(productId, []);
      }

      let imageUrls = [];
      if (row.image_urls_json) {
        try {
          const parsed = JSON.parse(row.image_urls_json);
          if (Array.isArray(parsed)) {
            imageUrls = parsed
              .map((item) => String(item || '').trim())
              .filter(Boolean)
              .slice(0, 20);
          }
        } catch (error) {
          imageUrls = [];
        }
      }

      if (!imageUrls.length && row.image_url) {
        imageUrls = [row.image_url];
      }

      variantMap.get(productId).push({
        variant_id: row.variant_id,
        variant_name: row.variant_name,
        price: Number(row.price),
        stock: Number(row.stock),
        image_url: imageUrls[0] || row.image_url || null,
        image_urls: imageUrls
      });
    }

    return variantMap;
  }

  static async attachVariants(pool, products = []) {
    if (!products.length) {
      return products;
    }

    const productIds = products.map((item) => Number(item.product_id));
    const variantMap = await this.getVariantsByProductIds(pool, productIds);

    return products.map((item) => ({
      ...item,
      variants: variantMap.get(Number(item.product_id)) || []
    }));
  }

  static async syncVariants(pool, productId, variants = []) {
    const hasTable = await this.hasVariantsTable(pool);
    if (!hasTable && variants.length > 0) {
      await this.ensureVariantsTable(pool);
    }

    const finalHasTable = await this.hasVariantsTable(pool);
    if (!finalHasTable) {
      return;
    }

    await pool.request()
      .input('productId', sql.Int, productId)
      .query('DELETE FROM ProductVariants WHERE ProductId = @productId');

    for (const variant of variants) {
      await pool.request()
        .input('productId', sql.Int, productId)
        .input('variantName', sql.NVarChar, variant.name)
        .input('price', sql.Decimal(18, 2), variant.price)
        .input('stock', sql.Int, variant.stock)
        .input('variantImageUrl', sql.NVarChar, variant.imageUrl || null)
        .input('variantImagesJson', sql.NVarChar(sql.MAX), JSON.stringify(Array.isArray(variant.imageUrls) ? variant.imageUrls.slice(0, 20) : []))
        .query(`
          INSERT INTO ProductVariants (ProductId, VariantName, Price, Stock, VariantImageUrl, VariantImagesJson)
          VALUES (@productId, @variantName, @price, @stock, @variantImageUrl, @variantImagesJson)
        `);
    }
  }

  /**
   * Lấy tất cả sản phẩm
   * @param {Object} options - Tùy chọn phân trang và filter
   * @returns {Promise<Array>}
   */
  static async getAll(options = {}) {
    try {
      const pool = getPool();
      await this.ensureSaleColumns(pool);
      const { page = 1, limit = 12, categoryId } = options;
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE 1=1';
      
      // Count total query
      let countQuery = `
        SELECT COUNT(*) as total
        FROM Products p
        ${whereClause}
      `;
      
      // Data query
      let query = `
        SELECT 
          p.ProductId as product_id,
          p.ProductName as product_name,
          p.Description as description,
          CASE
            WHEN p.SalePrice IS NOT NULL AND p.SalePrice > 0 AND p.SalePrice < p.Price THEN p.SalePrice
            ELSE p.Price
          END as price,
          p.Price as base_price,
          p.SalePrice as sale_price,
          CASE
            WHEN p.SalePrice IS NOT NULL AND p.SalePrice > 0 AND p.SalePrice < p.Price THEN CAST(1 AS BIT)
            ELSE CAST(0 AS BIT)
          END as is_on_sale,
          p.Stock as stock_quantity,
          p.CategoryId as category_id,
          p.CreatedAt as created_at,
          c.CategoryName as category_name,
          ( SELECT TOP 1 ImageURL FROM ProductImages WHERE ProductID = p.ProductID ) as image_url
        FROM Products p
        LEFT JOIN Categories c ON p.CategoryId = c.CategoryId
        ${whereClause}
      `;
      
      const request = pool.request();
      
      if (categoryId) {
        countQuery = countQuery.replace('WHERE 1=1', 'WHERE p.CategoryId = @categoryId');
        query += ' AND p.CategoryId = @categoryId';
        request.input('categoryId', sql.Int, categoryId);
      }
      
      query += ' ORDER BY p.CreatedAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      
      request.input('offset', sql.Int, offset);
      request.input('limit', sql.Int, limit);
      
      // Execute both queries
      const countResult = await pool.request()
        .input('categoryId', sql.Int, categoryId)
        .query(countQuery);
      const totalCount = countResult.recordset[0].total;
      
      const result = await request.query(query);
      const products = await this.attachVariants(pool, result.recordset || []);
      
      return {
        products,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        perPage: limit
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Tìm sản phẩm theo ID
   * @param {number} productId
   * @returns {Promise<Object>}
   */
  static async findById(productId) {
    try {
      const pool = getPool();
      await this.ensureSaleColumns(pool);
      const result = await pool.request()
        .input('productId', sql.Int, productId)
        .query(`
          SELECT 
            p.ProductId as product_id,
            p.ProductName as product_name,
            p.Description as description,
            CASE
              WHEN p.SalePrice IS NOT NULL AND p.SalePrice > 0 AND p.SalePrice < p.Price THEN p.SalePrice
              ELSE p.Price
            END as price,
            p.Price as base_price,
            p.SalePrice as sale_price,
            CASE
              WHEN p.SalePrice IS NOT NULL AND p.SalePrice > 0 AND p.SalePrice < p.Price THEN CAST(1 AS BIT)
              ELSE CAST(0 AS BIT)
            END as is_on_sale,
            p.Stock as stock_quantity,
            p.CategoryId as category_id,
            p.CreatedAt as created_at,
            c.CategoryName as category_name,
            ( SELECT TOP 1 ImageURL FROM ProductImages WHERE ProductID = p.ProductID ) as image_url
          FROM Products p
          LEFT JOIN Categories c ON p.CategoryId = c.CategoryId
          WHERE p.ProductId = @productId
        `);
      
      const records = await this.attachVariants(pool, result.recordset || []);
      return records[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Tìm kiếm sản phẩm
   * @param {string} keyword
   * @returns {Promise<Array>}
   */
  static async search(keyword) {
    try {
      const pool = getPool();
      await this.ensureSaleColumns(pool);
      const result = await pool.request()
        .input('keyword', sql.NVarChar, `%${keyword}%`)
        .query(`
          SELECT 
            p.ProductId as product_id,
            p.ProductName as product_name,
            p.Description as description,
            CASE
              WHEN p.SalePrice IS NOT NULL AND p.SalePrice > 0 AND p.SalePrice < p.Price THEN p.SalePrice
              ELSE p.Price
            END as price,
            p.Price as base_price,
            p.SalePrice as sale_price,
            CASE
              WHEN p.SalePrice IS NOT NULL AND p.SalePrice > 0 AND p.SalePrice < p.Price THEN CAST(1 AS BIT)
              ELSE CAST(0 AS BIT)
            END as is_on_sale,
            p.Stock as stock_quantity,
            p.CategoryId as category_id,
            p.CreatedAt as created_at,
            c.CategoryName as category_name,
            ( SELECT TOP 1 ImageURL FROM ProductImages WHERE ProductID = p.ProductID ) as image_url
          FROM Products p
          LEFT JOIN Categories c ON p.CategoryId = c.CategoryId
          WHERE p.ProductName LIKE @keyword 
             OR p.Description LIKE @keyword
          ORDER BY p.CreatedAt DESC
        `);
      
      return this.attachVariants(pool, result.recordset || []);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Tạo sản phẩm mới
   * @param {Object} productData
   * @returns {Promise<Object>}
   */
  static async create(productData) {
    try {
      const pool = getPool();
      await this.ensureSaleColumns(pool);
      const { productName, description, price, stock, categoryId, imageUrl } = productData;
      const variants = this.normalizeVariants(productData.variants);
      const baseValues = this.deriveBaseValues(price, stock, variants);
      const requestedSalePrice = Number(productData.salePrice);
      const salePrice = Number.isFinite(requestedSalePrice) && requestedSalePrice > 0 && requestedSalePrice < baseValues.price
        ? requestedSalePrice
        : null;
      
      const result = await pool.request()
        .input('productName', sql.NVarChar, productName)
        .input('description', sql.NVarChar, description || null)
        .input('price', sql.Decimal(18, 2), baseValues.price)
        .input('salePrice', sql.Decimal(18, 2), salePrice)
        .input('stock', sql.Int, baseValues.stock)
        .input('categoryId', sql.Int, categoryId)
        .query(`
          INSERT INTO Products (ProductName, Description, Price, SalePrice, Stock, CategoryId, CreatedAt)
          OUTPUT INSERTED.*
          VALUES (@productName, @description, @price, @salePrice, @stock, @categoryId, GETDATE())
        `);

      const newProductId = result.recordset[0].ProductId;

      await this.syncVariants(pool, newProductId, variants);

      if (imageUrl) {
        await pool.request()
          .input('productId', sql.Int, newProductId)
          .input('imageUrl', sql.NVarChar, imageUrl)
          .query(`
            INSERT INTO ProductImages (ProductID, ImageURL)
            VALUES (@productId, @imageUrl)
          `);
      }
      
      return this.findById(newProductId);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Cập nhật sản phẩm
   * @param {number} productId
   * @param {Object} productData
   * @returns {Promise<Object>}
   */
  static async update(productId, productData) {
    try {
      const pool = getPool();
      await this.ensureSaleColumns(pool);
      const { productName, description, price, stock, categoryId, imageUrl } = productData;
      const variants = this.normalizeVariants(productData.variants);
      const baseValues = this.deriveBaseValues(price, stock, variants);
      const requestedSalePrice = Number(productData.salePrice);
      const salePrice = Number.isFinite(requestedSalePrice) && requestedSalePrice > 0 && requestedSalePrice < baseValues.price
        ? requestedSalePrice
        : null;
      
      const result = await pool.request()
        .input('productId', sql.Int, productId)
        .input('productName', sql.NVarChar, productName)
        .input('description', sql.NVarChar, description)
        .input('price', sql.Decimal(18, 2), baseValues.price)
        .input('salePrice', sql.Decimal(18, 2), salePrice)
        .input('stock', sql.Int, baseValues.stock)
        .input('categoryId', sql.Int, categoryId)
        .query(`
          UPDATE Products 
          SET ProductName = @productName, 
              Description = @description, 
              Price = @price, 
              SalePrice = @salePrice,
              Stock = @stock, 
              CategoryId = @categoryId
          OUTPUT INSERTED.*
          WHERE ProductId = @productId
        `);

      if (!result.recordset.length) {
        return null;
      }

      await this.syncVariants(pool, productId, variants);

      if (imageUrl) {
        await pool.request()
          .input('productId', sql.Int, productId)
          .input('imageUrl', sql.NVarChar, imageUrl)
          .query(`
            IF EXISTS (SELECT 1 FROM ProductImages WHERE ProductID = @productId)
              UPDATE ProductImages
              SET ImageURL = @imageUrl
              WHERE ProductID = @productId;
            ELSE
              INSERT INTO ProductImages (ProductID, ImageURL)
              VALUES (@productId, @imageUrl);
          `);
      }
      
      return this.findById(productId);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Xóa sản phẩm
   * @param {number} productId
   * @returns {Promise}
   */
  static async delete(productId) {
    try {
      const pool = getPool();

      const hasTable = await this.hasVariantsTable(pool);
      if (hasTable) {
        await pool.request()
          .input('productId', sql.Int, productId)
          .query('DELETE FROM ProductVariants WHERE ProductId = @productId');
      }

      await pool.request()
        .input('productId', sql.Int, productId)
        .query('DELETE FROM Products WHERE ProductId = @productId');
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Cập nhật số lượng tồn kho
   * @param {number} productId
   * @param {number} quantity
   * @returns {Promise}
   */
  static async updateStock(productId, quantity) {
    try {
      const pool = getPool();
      await pool.request()
        .input('productId', sql.Int, productId)
        .input('quantity', sql.Int, quantity)
        .query('UPDATE Products SET Stock = Stock - @quantity WHERE ProductId = @productId');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Hoàn lại tồn kho cho sản phẩm
   * @param {number} productId
   * @param {number} quantity
   * @returns {Promise}
   */
  static async restoreStock(productId, quantity) {
    try {
      const pool = getPool();
      await pool.request()
        .input('productId', sql.Int, productId)
        .input('quantity', sql.Int, quantity)
        .query('UPDATE Products SET Stock = Stock + @quantity WHERE ProductId = @productId');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Gợi ý sản phẩm liên quan theo danh mục của các sản phẩm trong giỏ
   * @param {number[]} productIds
   * @param {{limit?: number}} options
   * @returns {Promise<Array>}
   */
  static async getRecommendationsByProductIds(productIds = [], options = {}) {
    try {
      const uniqueProductIds = [...new Set((productIds || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
      if (!uniqueProductIds.length) {
        return [];
      }

      const pool = getPool();
      await this.ensureSaleColumns(pool);
      const categoryRequest = pool.request();
      const productPlaceholders = uniqueProductIds.map((id, index) => {
        const param = `productId${index}`;
        categoryRequest.input(param, sql.Int, id);
        return `@${param}`;
      });

      const categoryResult = await categoryRequest.query(`
        SELECT DISTINCT CategoryId
        FROM Products
        WHERE ProductId IN (${productPlaceholders.join(', ')})
          AND CategoryId IS NOT NULL
      `);

      const categoryIds = categoryResult.recordset
        .map((row) => Number(row.CategoryId))
        .filter((id) => Number.isInteger(id) && id > 0);

      if (!categoryIds.length) {
        return [];
      }

      const limit = Math.min(Math.max(parseInt(options.limit, 10) || 8, 1), 24);
      const request = pool.request();

      const categoryPlaceholders = categoryIds.map((id, index) => {
        const param = `categoryId${index}`;
        request.input(param, sql.Int, id);
        return `@${param}`;
      });

      const excludePlaceholders = uniqueProductIds.map((id, index) => {
        const param = `excludeProductId${index}`;
        request.input(param, sql.Int, id);
        return `@${param}`;
      });

      request.input('limit', sql.Int, limit);

      const result = await request.query(`
        SELECT TOP (@limit)
          p.ProductId as product_id,
          p.ProductName as product_name,
          p.Description as description,
          CASE
            WHEN p.SalePrice IS NOT NULL AND p.SalePrice > 0 AND p.SalePrice < p.Price THEN p.SalePrice
            ELSE p.Price
          END as price,
          p.Price as base_price,
          p.SalePrice as sale_price,
          CASE
            WHEN p.SalePrice IS NOT NULL AND p.SalePrice > 0 AND p.SalePrice < p.Price THEN CAST(1 AS BIT)
            ELSE CAST(0 AS BIT)
          END as is_on_sale,
          p.Stock as stock_quantity,
          p.CategoryId as category_id,
          p.CreatedAt as created_at,
          c.CategoryName as category_name,
          (SELECT TOP 1 ImageURL FROM ProductImages WHERE ProductID = p.ProductID) as image_url
        FROM Products p
        LEFT JOIN Categories c ON p.CategoryId = c.CategoryId
        WHERE p.CategoryId IN (${categoryPlaceholders.join(', ')})
          AND p.ProductId NOT IN (${excludePlaceholders.join(', ')})
          AND p.Stock > 0
        ORDER BY p.Stock DESC, p.CreatedAt DESC
      `);

      return this.attachVariants(pool, result.recordset || []);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ProductModel;
