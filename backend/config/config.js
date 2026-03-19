/**
 * Server Configuration
 * Các cấu hình chung cho server
 */

require('dotenv').config();

module.exports = {
  // Server settings
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  
  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_key',
    expire: process.env.JWT_EXPIRE || '7d'
  },
  
  // Email settings
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@ecommerce.com'
  },

  // AI settings
  ai: {
    provider: process.env.AI_PROVIDER || 'gemini',
    geminiApiKey:
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini'
  },
  
  // Security settings
  security: {
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    lockTime: parseInt(process.env.LOCK_TIME) || 30, // phút
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 phút
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // Image security/optimization settings
  image: {
    maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH) || 4000,
    maxHeight: parseInt(process.env.IMAGE_MAX_HEIGHT) || 4000,
    jpegQuality: parseInt(process.env.IMAGE_JPEG_QUALITY) || 82,
    webpQuality: parseInt(process.env.IMAGE_WEBP_QUALITY) || 82
  },
  
  // CORS settings
  cors: {
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5500',
      'http://127.0.0.1:5500'
    ],
    credentials: true
  }
};
