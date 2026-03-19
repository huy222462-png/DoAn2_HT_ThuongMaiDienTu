/**
 * Pre-demo health & readiness check
 * Run: npm run demo:check
 */

require('dotenv').config();
const http = require('http');
const net = require('net');
const config = require('../config/config');
const { connectDB, closeDB, getPool } = require('../config/database');

const checks = [];

function addCheck(name, status, detail) {
  checks.push({ name, status, detail });
}

function printSummary() {
  const icon = {
    pass: '[PASS]',
    warn: '[WARN]',
    fail: '[FAIL]'
  };

  console.log('\n=== PRE-DEMO CHECK SUMMARY ===');
  checks.forEach((item) => {
    console.log(`${icon[item.status] || '[INFO]'} ${item.name}: ${item.detail}`);
  });

  const failCount = checks.filter((item) => item.status === 'fail').length;
  const warnCount = checks.filter((item) => item.status === 'warn').length;

  console.log('-------------------------------');
  console.log(`Fail: ${failCount} | Warn: ${warnCount} | Total: ${checks.length}`);

  if (failCount > 0) {
    console.log('Result: NOT READY for stable demo yet.');
    process.exitCode = 1;
    return;
  }

  if (warnCount > 0) {
    console.log('Result: READY with warnings (acceptable for demo, but should improve).');
    process.exitCode = 0;
    return;
  }

  console.log('Result: READY for demo.');
  process.exitCode = 0;
}

async function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: '127.0.0.1' });
    socket.setTimeout(1500);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      resolve(false);
    });
  });
}

async function fetchHealth(port) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/health',
        method: 'GET',
        timeout: 2500
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ ok: res.statusCode === 200, code: res.statusCode, parsed });
          } catch (_error) {
            resolve({ ok: false, code: res.statusCode, parsed: null });
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, code: 0, parsed: null });
    });

    req.on('error', () => {
      resolve({ ok: false, code: 0, parsed: null });
    });

    req.end();
  });
}

function validateEnv() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'default_secret_key') {
    addCheck('JWT secret', 'warn', 'JWT_SECRET is missing or default-like; set a strong secret before production.');
  } else {
    addCheck('JWT secret', 'pass', 'JWT_SECRET is configured.');
  }

  if (!process.env.DB_NAME) {
    addCheck('Database env', 'warn', 'DB_NAME is missing in .env; current config may fallback.');
  } else {
    addCheck('Database env', 'pass', `DB_NAME=${process.env.DB_NAME}`);
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    addCheck('Email config', 'warn', 'EMAIL_USER/EMAIL_PASSWORD missing, email features may fail.');
  } else {
    addCheck('Email config', 'pass', 'Email credentials are present.');
  }
}

async function validateDatabase() {
  try {
    await connectDB();
    addCheck('Database connection', 'pass', 'Connected to SQL Server.');

    const pool = getPool();
    const users = await pool.request().query('SELECT COUNT(*) AS total FROM Users');
    const categories = await pool.request().query('SELECT COUNT(*) AS total FROM Categories');
    const products = await pool.request().query('SELECT COUNT(*) AS total FROM Products');

    addCheck('Core data', 'pass', `Users=${users.recordset[0].total}, Categories=${categories.recordset[0].total}, Products=${products.recordset[0].total}`);

    const columns = await pool.request().query(`
      SELECT
        COL_LENGTH('dbo.Products', 'SalePrice') AS SalePriceCol,
        OBJECT_ID('dbo.ProductVariants', 'U') AS ProductVariantsTable
    `);

    const row = columns.recordset[0] || {};
    if (!row.SalePriceCol) {
      addCheck('Sale schema', 'warn', 'Products.SalePrice not found yet (auto-added when related model runs).');
    } else {
      addCheck('Sale schema', 'pass', 'Products.SalePrice exists.');
    }

    if (!row.ProductVariantsTable) {
      addCheck('Variant schema', 'warn', 'ProductVariants table is missing.');
    } else {
      addCheck('Variant schema', 'pass', 'ProductVariants table exists.');
    }
  } catch (error) {
    addCheck('Database connection', 'fail', error.message || 'Cannot connect to SQL Server.');
  } finally {
    await closeDB();
  }
}

async function validateApiStatus() {
  const port = Number(config.port || 5000);
  const open = await isPortOpen(port);
  if (!open) {
    addCheck('API runtime', 'warn', `No server listening on port ${port}. Start backend before live demo.`);
    return;
  }

  const health = await fetchHealth(port);
  if (!health.ok) {
    addCheck('API runtime', 'warn', `Server responds on port ${port} but /health is not OK.`);
    return;
  }

  const status = health.parsed?.status || 'unknown';
  addCheck('API runtime', 'pass', `Server is live on port ${port} with /health=${status}.`);
}

async function run() {
  console.log('Running pre-demo checks...');
  validateEnv();
  await validateDatabase();
  await validateApiStatus();
  printSummary();
}

run().catch((error) => {
  addCheck('Unexpected error', 'fail', error.message || String(error));
  printSummary();
});
