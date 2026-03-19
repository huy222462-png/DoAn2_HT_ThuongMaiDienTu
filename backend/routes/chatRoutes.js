/**
 * Chat Routes
 * Định tuyến chatbot
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

/**
 * @route   POST /api/chat/ask
 * @desc    Gửi câu hỏi cho chatbot
 * @access  Public
 */
router.post('/ask', chatController.askChatbot);

module.exports = router;
