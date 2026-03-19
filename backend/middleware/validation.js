/**
 * Validation Middleware
 * Middleware validate dữ liệu đầu vào
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware kiểm tra kết quả validation
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    console.log('Request body:', req.body);
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

/**
 * Validation rules cho đăng ký
 */
const registerValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username phải từ 3-50 ký tự')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username chỉ chứa chữ, số và dấu gạch dưới'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail()
    .custom((value) => {
      const disposableDomains = ['example.com', 'test.com', 'mailinator.com', 'tempmail.com'];
      const domain = String(value || '').split('@')[1] || '';
      if (disposableDomains.includes(domain.toLowerCase())) {
        throw new Error('Vui lòng dùng email thật để nhận thông báo đơn hàng');
      }
      return true;
    }),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password phải có ít nhất 6 ký tự'),
  
  // Accept both fullName and full_name
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Họ tên phải từ 2-100 ký tự'),
  
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Họ tên phải từ 2-100 ký tự'),
  
  body('phone')
    .optional()
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Số điện thoại không hợp lệ'),

  body('loginMethod')
    .optional()
    .isIn(['email', 'phone'])
    .withMessage('Lựa chọn tài khoản đăng nhập không hợp lệ'),
  
  // Custom validation to ensure at least one name field is provided
  body().custom((value, { req }) => {
    if (!req.body.fullName && !req.body.full_name) {
      throw new Error('Họ tên không được để trống');
    }

    const method = String(req.body.loginMethod || 'email').trim().toLowerCase();
    if (method === 'phone' && !req.body.phone) {
      throw new Error('Vui lòng nhập số điện thoại khi chọn đăng nhập bằng số điện thoại');
    }

    return true;
  }),
  
  validate
];

/**
 * Validation rules cho đăng nhập
 */
const loginValidation = [
  body('identifier')
    .optional()
    .trim(),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),

  body('phone')
    .optional()
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Số điện thoại không hợp lệ'),

  body('loginMethod')
    .optional()
    .isIn(['email', 'phone'])
    .withMessage('Lựa chọn tài khoản đăng nhập không hợp lệ'),

  body().custom((value, { req }) => {
    if (!req.body.identifier && !req.body.email && !req.body.phone) {
      throw new Error('Vui lòng nhập email hoặc số điện thoại để đăng nhập');
    }
    return true;
  }),
  
  body('password')
    .notEmpty()
    .withMessage('Password không được để trống'),
  
  validate
];

/**
 * Validation cho quên mật khẩu
 */
const forgotPasswordValidation = [
  body('identifier')
    .optional()
    .trim(),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),

  body('phone')
    .optional()
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Số điện thoại không hợp lệ'),

  body('loginMethod')
    .optional()
    .isIn(['email', 'phone'])
    .withMessage('Lựa chọn tài khoản quên mật khẩu không hợp lệ'),

  body().custom((value, { req }) => {
    if (!req.body.identifier && !req.body.email && !req.body.phone) {
      throw new Error('Vui lòng nhập email hoặc số điện thoại');
    }
    return true;
  }),

  validate
];

/**
 * Validation cho đặt lại mật khẩu
 */
const resetPasswordValidation = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Thiếu token đặt lại mật khẩu'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu mới phải có ít nhất 6 ký tự'),

  validate
];

/**
 * Validation rules cho sản phẩm
 */
const productValidation = [
  body('productName')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Tên sản phẩm phải từ 3-200 ký tự'),
  
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Giá phải là số dương'),
  
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Số lượng phải là số nguyên dương'),

  body('salePrice')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Giá sale phải là số dương'),
  
  body('categoryId')
    .isInt({ min: 1 })
    .withMessage('Category ID không hợp lệ'),

  body('variants')
    .optional({ nullable: true })
    .isArray()
    .withMessage('Danh sách biến thể không hợp lệ'),

  body('variants.*.name')
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Tên biến thể phải từ 1-120 ký tự'),

  body('variants.*.price')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Giá biến thể phải là số dương'),

  body('variants.*.stock')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage('Tồn kho biến thể phải là số nguyên dương'),

  body('variants.*.imageUrl')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Đường dẫn ảnh biến thể không được quá 500 ký tự'),

  body('variants.*.image_url')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Đường dẫn ảnh biến thể không được quá 500 ký tự'),

  body('variants.*.imageUrls')
    .optional({ nullable: true })
    .isArray({ max: 20 })
    .withMessage('Danh sách ảnh biến thể không hợp lệ (tối đa 20 ảnh)'),

  body('variants.*.imageUrls.*')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Mỗi đường dẫn ảnh biến thể không được quá 500 ký tự'),

  body('variants.*.image_urls')
    .optional({ nullable: true })
    .isArray({ max: 20 })
    .withMessage('Danh sách ảnh biến thể không hợp lệ (tối đa 20 ảnh)'),

  body('variants.*.image_urls.*')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Mỗi đường dẫn ảnh biến thể không được quá 500 ký tự'),

  body('variants').custom((value) => {
    if (!Array.isArray(value)) {
      return true;
    }

    for (const variant of value) {
      if (!variant) continue;

      const hasImageArray = Array.isArray(variant.imageUrls)
        ? variant.imageUrls.some((item) => String(item || '').trim() !== '')
        : (Array.isArray(variant.image_urls)
          ? variant.image_urls.some((item) => String(item || '').trim() !== '')
          : false);

      const hasAnyField = [variant.name, variant.price, variant.stock, variant.imageUrl, variant.image_url]
        .some((item) => item !== undefined && item !== null && String(item).trim() !== '') || hasImageArray;
      if (!hasAnyField) {
        continue;
      }

      const name = String(variant.name || '').trim();
      const priceValue = Number(variant.price);
      const stockValue = Number(variant.stock);

      if (!name || !Number.isFinite(priceValue) || priceValue < 0 || !Number.isInteger(stockValue) || stockValue < 0) {
        throw new Error('Mỗi biến thể cần có tên, giá và tồn kho hợp lệ');
      }
    }

    return true;
  }),

  body().custom((value, { req }) => {
    if (req.body.salePrice === undefined || req.body.salePrice === null || String(req.body.salePrice).trim() === '') {
      return true;
    }

    const price = Number(req.body.price);
    const salePrice = Number(req.body.salePrice);
    if (!Number.isFinite(price) || !Number.isFinite(salePrice)) {
      throw new Error('Giá sản phẩm và giá sale không hợp lệ');
    }

    if (salePrice >= price) {
      throw new Error('Giá sale phải nhỏ hơn giá gốc');
    }

    return true;
  }),
  
  validate
];

/**
 * Validation rules cho category
 */
const categoryValidation = [
  body('categoryName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Tên danh mục phải từ 2-100 ký tự'),
  
  validate
];

/**
 * Validation rules cho giỏ hàng
 */
const cartValidation = [
  body('productId')
    .isInt({ min: 1 })
    .withMessage('Product ID không hợp lệ'),

  body('variantId')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Variant ID không hợp lệ'),
  
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Số lượng phải là số nguyên dương'),
  
  validate
];

/**
 * Validation rules cho đơn hàng
 */
const orderValidation = [
  body('shippingAddress')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Địa chỉ giao hàng phải từ 5-500 ký tự'),
  
  body('phone')
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Số điện thoại không hợp lệ'),

  body('paymentMethod')
    .trim()
    .isIn(['cod', 'bank_transfer'])
    .withMessage('Phương thức thanh toán không hợp lệ'),

  body('couponCode')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Mã giảm giá không được quá 50 ký tự'),
  
  validate
];

/**
 * Validation trạng thái đơn hàng (admin)
 */
const orderStatusValidation = [
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Trạng thái đơn hàng không được để trống')
    .custom((value) => {
      const normalized = String(value).trim().toLowerCase();
      const allowedStatuses = [
        'pending',
        'chờ xác nhận',
        'confirmed',
        'đã xác nhận',
        'shipping',
        'đang giao',
        'completed',
        'hoàn thành',
        'cancelled',
        'đã hủy',
        'return_requested',
        'yêu cầu trả hàng',
        'returned_shipping',
        'đã gửi trả hàng',
        'returned_approved',
        'đã hoàn trả',
        'returned_rejected',
        'từ chối hoàn trả'
      ];

      if (!allowedStatuses.includes(normalized)) {
        throw new Error('Trạng thái đơn hàng không hợp lệ');
      }

      return true;
    }),

  validate
];

/**
 * Validation yêu cầu trả hàng từ khách
 */
const returnRequestValidation = [
  body('reason')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Lý do trả hàng phải từ 10-1000 ký tự'),

  validate
];

/**
 * Validation hủy đơn hàng từ khách
 */
const cancelOrderValidation = [
  body('reason')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Lý do hủy đơn phải từ 5-500 ký tự'),

  validate
];

/**
 * Validation xử lý hoàn trả từ admin
 */
const returnProcessValidation = [
  body('action')
    .trim()
    .custom((value) => {
      const normalized = String(value || '').trim().toLowerCase();
      if (!['approve', 'reject'].includes(normalized)) {
        throw new Error('Hành động xử lý trả hàng không hợp lệ');
      }
      return true;
    }),

  body('decisionReason')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Ghi chú xử lý không được quá 1000 ký tự'),

  body('refundAmount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Số tiền hoàn phải là số dương'),

  body().custom((value, { req }) => {
    const action = String(req.body.action || '').trim().toLowerCase();
    if (action === 'approve') {
      const amount = Number(req.body.refundAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        throw new Error('Duyệt hoàn trả cần có refundAmount hợp lệ');
      }
    }
    return true;
  }),

  validate
];

/**
 * Validation gửi email khuyến mãi
 */
const promotionEmailValidation = [
  body('subject')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Tiêu đề email phải từ 3-200 ký tự'),

  body('content')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Nội dung email phải từ 10-5000 ký tự'),

  body('couponCode')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Mã khuyến mãi không được quá 50 ký tự'),

  body('ctaUrl')
    .optional({ nullable: true, checkFalsy: true })
    .isURL()
    .withMessage('Đường dẫn CTA không hợp lệ'),

  body('ctaText')
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage('Nhãn CTA không được quá 60 ký tự'),

  body('expiresAt')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Ngày hết hạn không hợp lệ (ISO8601)'),

  validate
];

/**
 * Validation rules cho đánh giá
 */
const reviewValidation = [
  body('productId')
    .isInt({ min: 1 })
    .withMessage('Product ID không hợp lệ'),
  
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating phải từ 1-5'),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment không được quá 1000 ký tự'),
  
  validate
];

/**
 * Validation cho ID parameter
 */
const idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID không hợp lệ'),
  
  validate
];

module.exports = {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  productValidation,
  categoryValidation,
  cartValidation,
  orderValidation,
  orderStatusValidation,
  cancelOrderValidation,
  returnRequestValidation,
  returnProcessValidation,
  promotionEmailValidation,
  reviewValidation,
  idValidation,
  validate
};
