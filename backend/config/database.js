/**
 * Database Configuration
 * Cấu hình kết nối SQL Server Database
 */

const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

// Cấu hình kết nối database với Windows Authentication sử dụng msnodesqlv8  
const config = {
  connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=localhost\\SQLEXPRESS;Database=${process.env.DB_NAME || 'TMDT'};Trusted_Connection=yes;TrustServerCertificate=yes;`,
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    useUTC: false
  }
};

// Connection pool
let pool = null;

/**
 * Kết nối tới database
 * @returns {Promise<sql.ConnectionPool>}
 */
const connectDB = async () => {
  try {
    if (pool) {
      return pool;
    }
    
    pool = await sql.connect(config);
    console.log('✓ Kết nối SQL Server thành công');
    
    return pool;
  } catch (error) {
    console.error('✗ Lỗi kết nối SQL Server:', error.message);
    throw error;
  }
};

/**
 * Lấy connection pool
 * @returns {sql.ConnectionPool}
 */
const getPool = () => {
  if (!pool) {
    throw new Error('Database chưa được kết nối. Gọi connectDB() trước.');
  }
  return pool;
};

/**
 * Đóng kết nối database
 */
const closeDB = async () => {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log('✓ Đã đóng kết nối SQL Server');
    }
  } catch (error) {
    console.error('✗ Lỗi khi đóng kết nối:', error.message);
  }
};

// Export các function và sql object
module.exports = {
  sql,
  connectDB,
  getPool,
  closeDB,
  config
};
