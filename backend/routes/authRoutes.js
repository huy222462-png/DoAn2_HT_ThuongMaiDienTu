/**
 * Auth Routes
 * Định tuyến cho authentication
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/security');
const upload = require('../middleware/upload');
const {
	registerValidation,
	loginValidation,
	forgotPasswordValidation,
	resetPasswordValidation
} = require('../middleware/validation');

/**
 * @route   POST /api/auth/register
 * @desc    Đăng ký tài khoản mới
 * @access  Public
 */
router.post('/register', registerValidation, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Đăng nhập
 * @access  Public
 */
router.post('/login', loginLimiter, loginValidation, authController.login);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Gửi email đặt lại mật khẩu
 * @access  Public
 */
router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword);

/**
 * @route   GET /api/auth/forgot-password
 * @desc    Hướng dẫn method cho endpoint quên mật khẩu
 * @access  Public
 */
router.get('/forgot-password', (req, res) => {
	res.json({
		success: true,
		message: 'Endpoint này dùng method POST. Vui lòng gửi { email } lên /api/auth/forgot-password'
	});
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Đặt lại mật khẩu bằng token
 * @access  Public
 */
router.post('/reset-password', resetPasswordValidation, authController.resetPassword);

/**
 * @route   GET /api/auth/reset-password-page
 * @desc    Trang đặt lại mật khẩu do backend phục vụ
 * @access  Public
 */
router.get('/reset-password-page', authController.getResetPasswordPage);

/**
 * @route   GET /api/auth/reset-password
 * @desc    Hướng dẫn method cho endpoint đặt lại mật khẩu
 * @access  Public
 */
router.get('/reset-password', (req, res) => {
	res.json({
		success: true,
		message: 'Endpoint này dùng method POST. Vui lòng gửi { token, newPassword } lên /api/auth/reset-password'
	});
});

/**
 * @route   GET /api/auth/profile
 * @desc    Lấy thông tin profile
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Cập nhật profile
 * @access  Private
 */
router.put('/profile', authenticate, authController.updateProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Đổi mật khẩu
 * @access  Private
 */
router.put('/change-password', authenticate, authController.changePassword);

/**
 * @route   POST /api/auth/logout
 * @desc    Đăng xuất
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/auth/upload-avatar
 * @desc    Upload ảnh đại diện
 * @access  Private
 */
router.post('/upload-avatar', authenticate, upload.single('avatar'), authController.uploadAvatar);

module.exports = router;
