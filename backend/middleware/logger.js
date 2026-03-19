/**
 * Logger Middleware
 * Middleware ghi log request
 */

const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// Tạo thư mục logs nếu chưa có
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Tạo write stream cho log file
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

// Custom format log
morgan.token('request-id', (req) => req.requestId || '-');
morgan.token('body', (req) => {
  // Không log password
  if (req.body && req.body.password) {
    const body = { ...req.body };
    body.password = '***';
    return JSON.stringify(body);
  }
  return JSON.stringify(req.body);
});

// Format log
const logFormat = '[req::request-id] :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :body';

/**
 * Gắn request id cho mỗi request để trace log dễ hơn
 */
const requestIdMiddleware = (req, res, next) => {
  const incomingRequestId = req.headers['x-request-id'];
  req.requestId = typeof incomingRequestId === 'string' && incomingRequestId.trim()
    ? incomingRequestId.trim()
    : randomUUID();

  res.setHeader('X-Request-Id', req.requestId);
  next();
};

// Development logger - console
const devLogger = morgan('dev');

// Production logger - file
const prodLogger = morgan(logFormat, {
  stream: accessLogStream
});

// Request logger tùy theo môi trường
const requestLogger = process.env.NODE_ENV === 'production' 
  ? prodLogger 
  : devLogger;

/**
 * Custom logger cho security events
 */
const securityLogger = {
  logLoginAttempt: (req, success, message) => {
    const log = {
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      email: req.body.email,
      success,
      message,
      userAgent: req.get('user-agent')
    };
    
    const logFile = path.join(logsDir, 'security.log');
    fs.appendFileSync(logFile, JSON.stringify(log) + '\n');
  },
  
  logSuspiciousActivity: (req, activity) => {
    const log = {
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      activity,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('user-agent')
    };
    
    const logFile = path.join(logsDir, 'suspicious.log');
    fs.appendFileSync(logFile, JSON.stringify(log) + '\n');
  }
};

/**
 * Audit logger cho thao tác nhạy cảm phía admin
 */
const auditLogger = {
  logAdminAction: (req, action, metadata = {}) => {
    try {
      const sanitize = (value) => {
        if (value === null || value === undefined) return value;
        if (Array.isArray(value)) return value.slice(0, 30).map(sanitize);
        if (typeof value === 'object') {
          const clone = {};
          for (const [key, val] of Object.entries(value)) {
            if (/password|token|secret|api[_-]?key/i.test(key)) {
              clone[key] = '***';
            } else {
              clone[key] = sanitize(val);
            }
          }
          return clone;
        }
        if (typeof value === 'string' && value.length > 300) {
          return value.slice(0, 300) + '...';
        }
        return value;
      };

      const log = {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || null,
        action,
        admin: {
          userId: req.user?.UserId || null,
          email: req.user?.Email || null,
          isAdmin: !!req.user?.IsAdmin
        },
        request: {
          ip: req.ip || req.connection?.remoteAddress,
          method: req.method,
          url: req.originalUrl,
          userAgent: req.get('user-agent')
        },
        metadata: sanitize(metadata)
      };

      const logFile = path.join(logsDir, 'admin-audit.log');
      fs.appendFileSync(logFile, JSON.stringify(log) + '\n');
    } catch (error) {
      console.error('Audit logger error:', error.message);
    }
  }
};

module.exports = {
  requestIdMiddleware,
  requestLogger,
  securityLogger,
  auditLogger
};
