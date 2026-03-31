/**
 * Database Configuration
 * Cấu hình kết nối SQL Server Database
 */

const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

const dbServer = process.env.DB_SERVER || 'localhost';
const dbPort = (process.env.DB_PORT || '').trim();
const dbName = process.env.DB_NAME || 'TMDT';
const dbUser = (process.env.DB_USER || '').trim();
const dbPassword = (process.env.DB_PASSWORD || '').trim();
const dbInstance = (process.env.DB_INSTANCE || '').trim();

function buildServerAddress() {
  if (dbServer.includes('\\') || dbServer.includes(',')) {
    return dbServer;
  }

  if (dbInstance) {
    return `${dbServer}\\${dbInstance}`;
  }

  if (dbPort) {
    return `${dbServer},${dbPort}`;
  }

  return dbServer;
}

const serverAddress = buildServerAddress();
const useSqlAuth = Boolean(dbUser && dbPassword);
const authSegment = useSqlAuth
  ? `Uid=${dbUser};Pwd=${dbPassword};`
  : 'Trusted_Connection=yes;';


const config = {
  connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${serverAddress};Database=${dbName};${authSegment}TrustServerCertificate=yes;`,
  connectionTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '15000', 10),
  requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT_MS || '30000', 10),
  options: {
    trustedConnection: !useSqlAuth,
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

    console.log(`- Dang ket noi SQL Server: ${serverAddress} | DB: ${dbName} | Auth: ${useSqlAuth ? 'SQL Login' : 'Windows'}`);
    
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
