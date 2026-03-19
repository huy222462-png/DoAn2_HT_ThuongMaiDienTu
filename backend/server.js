/**
 * Server Entry Point
 * File khởi động server Express
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { connectDB, closeDB, getPool } = require('./config/database');
const config = require('./config/config');
const emailService = require('./services/emailService');

// Import middleware
const { securityHeaders, xssProtection, hppProtection, apiLimiter, authLimiter, chatLimiter, adminLimiter, corsOptions } = require('./middleware/security');
const { requestIdMiddleware, requestLogger } = require('./middleware/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Khởi tạo Express app
const app = express();

const AUTO_PORT_FALLBACK = String(process.env.AUTO_PORT_FALLBACK || 'false').toLowerCase() === 'true';
const PORT_FALLBACK_LIMIT = Math.max(1, parseInt(process.env.PORT_FALLBACK_LIMIT || '5', 10));

function validateStartupConfig() {
  const warnings = [];

  if (!config.jwt.secret || config.jwt.secret === 'default_secret_key') {
    warnings.push('JWT_SECRET dang dung gia tri mac dinh. Nen dat bien moi truong JWT_SECRET de bao mat hon.');
  }

  if (String(config.env).toLowerCase() === 'production') {
    if (!config.email.user || !config.email.password) {
      warnings.push('Moi truong production chua cau hinh EMAIL_USER/EMAIL_PASSWORD. Chuc nang gui mail co the khong hoat dong.');
    }
  }

  if (warnings.length) {
    console.warn('! Startup configuration warnings:');
    warnings.forEach((item, index) => {
      console.warn(`  ${index + 1}. ${item}`);
    });
  }
}

function listenOnPort(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server));
    server.on('error', (error) => reject(error));
  });
}

async function startHttpServer(preferredPort) {
  let attempt = 0;
  let currentPort = Number(preferredPort);

  while (attempt < PORT_FALLBACK_LIMIT) {
    try {
      const server = await listenOnPort(currentPort);
      return { server, port: currentPort };
    } catch (error) {
      const isPortInUse = error && error.code === 'EADDRINUSE';
      if (!isPortInUse || !AUTO_PORT_FALLBACK) {
        throw error;
      }

      console.warn(`! Port ${currentPort} dang duoc su dung, thu port tiep theo...`);
      currentPort += 1;
      attempt += 1;
    }
  }

  const startupError = new Error(`Khong tim duoc port trong dai ${preferredPort}-${preferredPort + PORT_FALLBACK_LIMIT - 1}`);
  startupError.code = 'PORT_FALLBACK_EXHAUSTED';
  throw startupError;
}

/**
 * MIDDLEWARE SETUP
 */

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request id middleware
app.use(requestIdMiddleware);

// CORS middleware
app.use(cors(corsOptions));

// Security middleware
app.use(securityHeaders); // Helmet - HTTP security headers
app.use(xssProtection);   // XSS protection
app.use(hppProtection);   // HTTP Parameter Pollution protection

// Logger middleware
app.use(requestLogger);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/**
 * ROUTES
 */

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'E-Commerce API Server đang hoạt động',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Detailed health check for ops monitoring
app.get('/health', async (req, res) => {
  const startedAt = Date.now();
  const checks = {};
  let overallStatus = 'ok';

  // DB check
  try {
    await getPool().request().query('SELECT 1 as ok');
    checks.database = { status: 'up' };
  } catch (error) {
    overallStatus = 'down';
    checks.database = { status: 'down', message: error.message };
  }

  // Upload directory check
  try {
    const uploadsDir = path.join(__dirname, 'uploads', 'images');
    fs.accessSync(uploadsDir, fs.constants.R_OK | fs.constants.W_OK);
    checks.storage = { status: 'up', uploadDir: uploadsDir };
  } catch (error) {
    overallStatus = overallStatus === 'down' ? 'down' : 'degraded';
    checks.storage = { status: 'degraded', message: error.message };
  }

  // Email config check
  const emailConfigured = Boolean(config.email.host && config.email.user && config.email.password);
  checks.email = {
    status: emailConfigured ? 'configured' : 'not-configured',
    queue: emailService.getEmailQueueMetrics()
  };

  const response = {
    success: overallStatus !== 'down',
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    requestId: req.requestId,
    responseTimeMs: Date.now() - startedAt,
    process: {
      pid: process.pid,
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      env: config.env
    },
    checks
  };

  return res.status(overallStatus === 'down' ? 503 : 200).json(response);
});

// API routes
app.use('/api/auth', authLimiter, authRoutes); // Authentication routes
app.use('/api/products', apiLimiter, productRoutes);     // Product routes
app.use('/api/categories', apiLimiter, categoryRoutes);  // Category routes
app.use('/api/cart', cartRoutes);            // Cart routes
app.use('/api/wishlist', wishlistRoutes);    // Wishlist routes
app.use('/api/orders', orderRoutes);         // Order routes
app.use('/api/reviews', apiLimiter, reviewRoutes);       // Review routes
app.use('/api/admin', adminLimiter, adminRoutes); // Admin routes
app.use('/api/chat', chatLimiter, chatRoutes);    // Chatbot routes

/**
 * ERROR HANDLING
 */

// 404 Not Found handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

/**
 * SERVER STARTUP
 */

const PORT = config.port || 5000;

const startServer = async () => {
  try {
    validateStartupConfig();

    // Kết nối database
    await connectDB();
    console.log('✓ Database connected successfully');
    
    // Khởi động server
    const { server, port: activePort } = await startHttpServer(PORT);

    if (activePort !== Number(PORT)) {
      console.warn(`! Server da chuyen sang port ${activePort} do port ${PORT} dang ban.`);
    }

    console.log('='.repeat(50));
    console.log(`✓ Server đang chạy ở chế độ ${config.env}`);
    console.log(`✓ Server URL: http://localhost:${activePort}`);
    console.log(`✓ API Base URL: http://localhost:${activePort}/api`);
    console.log('='.repeat(50));
    console.log('\nAPI Endpoints:');
    console.log('  Auth:       http://localhost:' + activePort + '/api/auth');
    console.log('  Products:   http://localhost:' + activePort + '/api/products');
    console.log('  Categories: http://localhost:' + activePort + '/api/categories');
    console.log('  Cart:       http://localhost:' + activePort + '/api/cart');
    console.log('  Orders:     http://localhost:' + activePort + '/api/orders');
    console.log('  Reviews:    http://localhost:' + activePort + '/api/reviews');
    console.log('  Admin:      http://localhost:' + activePort + '/api/admin');
    console.log('='.repeat(50));

    if (!AUTO_PORT_FALLBACK) {
      console.log('Tip: dat AUTO_PORT_FALLBACK=true de tu dong thu port tiep theo khi bi trung port.');
    }

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      
      server.close(async () => {
        console.log('✓ HTTP server closed');
        
        // Đóng kết nối database
        await closeDB();
        console.log('✓ Database connection closed');
        
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('✗ Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    if (error && error.code === 'EADDRINUSE') {
      console.error(`✗ Port ${PORT} dang duoc su dung. Hay dong process dang chiem port hoac dat PORT khac.`);
      console.error('  Goi y: dat AUTO_PORT_FALLBACK=true de server tu dong thu port tiep theo.');
    } else {
      console.error('✗ Lỗi khi khởi động server:', error);
    }
    process.exit(1);
  }
};

// Bắt lỗi unhandled promise rejection
process.on('unhandledRejection', (err) => {
  console.error('✗ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Khởi động server
startServer();

module.exports = app;
