/**
 * Auth Controller
 * Controller xử lý đăng ký, đăng nhập và xác thực
 */

const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const config = require('../config/config');
const { securityLogger } = require('../middleware/logger');
const emailService = require('../services/emailService');

const buildUsernameSeed = ({ loginMethod, email, phone }) => {
  if (loginMethod === 'phone') {
    return `u${String(phone || '').replace(/\D/g, '')}`;
  }

  const emailPrefix = String(email || '').split('@')[0] || 'user';
  const normalized = emailPrefix
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || 'user';
};

const getFrontendBaseUrl = () => {
  const raw = process.env.FRONTEND_URL || 'http://localhost:3000';
  return String(raw).replace(/\/$/, '');
};

const getBackendBaseUrl = () => {
  const raw = process.env.BACKEND_URL || `http://localhost:${config.port || 5000}`;
  return String(raw).replace(/\/$/, '');
};

const buildResetPasswordLink = (token) => {
  // Default to backend-hosted page so reset works even when frontend static server is not running.
  const backendBase = getBackendBaseUrl();
  return `${backendBase}/api/auth/reset-password-page?token=${encodeURIComponent(token)}`;
};

const generateResetPasswordEmail = ({ fullName, resetUrl }) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937; line-height: 1.6;">
      <h2 style="margin: 0; padding: 16px 20px; background: #2563eb; color: #fff; border-radius: 8px 8px 0 0;">
        Yeu cau dat lai mat khau
      </h2>
      <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 20px;">
        <p>Chao <strong>${fullName || 'ban'}</strong>,</p>
        <p>He thong da nhan yeu cau dat lai mat khau cho tai khoan cua ban.</p>
        <p>Vui long bam nut duoi day de tao mat khau moi (link co hieu luc trong 15 phut):</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block; background:#2563eb; color:#fff; text-decoration:none; padding:10px 16px; border-radius:6px;">Dat lai mat khau</a>
        </p>
        <p>Neu ban khong yeu cau dat lai mat khau, co the bo qua email nay.</p>
      </div>
    </div>
  `;
};

/**
 * Đăng ký tài khoản mới
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    let { username, email, password, fullName, full_name, phone, address, loginMethod } = req.body;
    loginMethod = String(loginMethod || 'email').trim().toLowerCase();
    
    // Handle both fullName and full_name
    fullName = fullName || full_name;
    
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = String(phone || '').replace(/\D/g, '');

    if (loginMethod === 'phone' && !normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập số điện thoại để dùng làm tài khoản đăng nhập'
      });
    }

    // Auto-generate username from selected login method if not provided
    if (!username) {
      username = buildUsernameSeed({
        loginMethod,
        email: normalizedEmail,
        phone: normalizedPhone
      });
    }
    
    // Kiểm tra email đã tồn tại
    const existingEmail = await UserModel.findByEmail(normalizedEmail);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được sử dụng'
      });
    }

    const existingPhone = await UserModel.findByPhone(normalizedPhone);
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại đã được sử dụng'
      });
    }
    
    // Kiểm tra username đã tồn tại (và thêm số nếu trùng)
    let checkUsername = username;
    let counter = 1;
    while (await UserModel.findByUsername(checkUsername)) {
      checkUsername = `${username}${counter}`;
      counter++;
    }
    username = checkUsername;
    
    // Tạo user mới
    const user = await UserModel.create({
      username,
      email: normalizedEmail,
      password,
      fullName,
      phone: normalizedPhone,
      address
    });
    
    // Log security event
    securityLogger.logLoginAttempt(req, true, 'User registered successfully');
    
    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        userId: user.UserId,
        username: user.Username,
        email: user.Email,
        fullName: user.FullName
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đăng ký: ' + error.message
    });
  }
};

/**
 * Đăng nhập
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { identifier, email, phone, loginMethod, password } = req.body;
    const loginIdentifier = String(identifier || email || phone || '').trim();
    const preferredMethod = String(loginMethod || '').trim().toLowerCase();
    req.body.email = loginIdentifier;

    const user = await UserModel.findByLoginIdentifier(loginIdentifier, preferredMethod || 'auto');
    
    if (!user) {
      securityLogger.logLoginAttempt(req, false, 'User not found');
      return res.status(401).json({
        success: false,
        message: 'Email/SĐT hoặc mật khẩu không đúng'
      });
    }
    
    // Kiểm tra tài khoản có bị khóa không
    if (user.IsLocked) {
      // Kiểm tra xem đã hết thời gian khóa chưa
      if (user.LockedUntil && new Date() < new Date(user.LockedUntil)) {
        securityLogger.logLoginAttempt(req, false, 'Account locked');
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau hoặc liên hệ admin.'
        });
      } else {
        // Mở khóa tài khoản nếu đã hết thời gian
        await UserModel.resetLoginAttempts(user.UserId);
        user.IsLocked = false;
        user.LoginAttempts = 0;
      }
    }
    
    // So sánh password
    const isMatch = await UserModel.comparePassword(password, user.Password);
    
    if (!isMatch) {
      // Tăng số lần đăng nhập sai
      await UserModel.incrementLoginAttempts(user.UserId);
      
      const remainingAttempts = config.security.maxLoginAttempts - (user.LoginAttempts + 1);
      
      securityLogger.logLoginAttempt(req, false, `Wrong password. Remaining attempts: ${remainingAttempts}`);
      
      if (remainingAttempts <= 0) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 30 phút.'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: `Email/SĐT hoặc mật khẩu không đúng. Còn ${remainingAttempts} lần thử.`
      });
    }
    
    // Reset login attempts khi đăng nhập thành công
    if (user.LoginAttempts > 0) {
      await UserModel.resetLoginAttempts(user.UserId);
    }
    
    // Tạo JWT token
    const token = jwt.sign(
      { 
        userId: user.UserId,
        email: user.Email,
        isAdmin: user.IsAdmin
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expire }
    );
    
    securityLogger.logLoginAttempt(req, true, 'Login successful');
    
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: {
          userId: user.UserId,
          username: user.Username,
          email: user.Email,
          fullName: user.FullName,
          phone: user.Phone,
          address: user.Address,
          isAdmin: user.IsAdmin
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đăng nhập: ' + error.message
    });
  }
};

/**
 * Lấy thông tin profile
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      data: {
        userId: user.UserId,
        username: user.Username,
        email: user.Email,
        fullName: user.FullName,
        phone: user.Phone,
        address: user.Address,
        isAdmin: user.IsAdmin,
        createdAt: user.CreatedAt,
        avatar_url: user.ProfileImage || null,
        profileImage: user.ProfileImage || null
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin: ' + error.message
    });
  }
};

/**
 * Cập nhật profile
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.UserId;
    let { fullName, full_name, phone, address } = req.body;

    fullName = fullName || full_name;
    
    const updatedUser = await UserModel.update(userId, {
      fullName,
      phone,
      address
    });
    
    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật: ' + error.message
    });
  }
};

/**
 * Đổi mật khẩu
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.UserId;
    let { currentPassword, current_password, newPassword, new_password } = req.body;

    currentPassword = currentPassword || current_password;
    newPassword = newPassword || new_password;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    const user = await UserModel.findByIdWithPassword(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const isMatch = await UserModel.comparePassword(currentPassword, user.Password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }

    const isSamePassword = await UserModel.comparePassword(newPassword, user.Password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải khác mật khẩu hiện tại'
      });
    }

    await UserModel.updatePassword(userId, newPassword);

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đổi mật khẩu: ' + error.message
    });
  }
};

/**
 * Quên mật khẩu
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const { identifier, email, phone, loginMethod } = req.body;
    const lookupIdentifier = String(identifier || email || phone || '').trim();
    const preferredMethod = String(loginMethod || '').trim().toLowerCase();

    // Trả về chung 1 thông điệp để tránh lộ thông tin tài khoản.
    const genericResponse = {
      success: true,
      message: 'Neu email ton tai trong he thong, chung toi da gui link dat lai mat khau.'
    };

    const user = await UserModel.findByLoginIdentifier(lookupIdentifier, preferredMethod || 'auto');
    if (!user) {
      console.warn('Forgot password requested for unknown identifier:', lookupIdentifier);
      return res.json(genericResponse);
    }

    const targetEmail = String(user.Email || '').trim().toLowerCase();
    if (!targetEmail) {
      console.warn('Forgot password account has no email:', { userId: user.UserId });
      return res.json(genericResponse);
    }

    const token = jwt.sign(
      {
        userId: user.UserId,
        purpose: 'reset-password'
      },
      config.jwt.secret,
      { expiresIn: '15m' }
    );

    const resetUrl = buildResetPasswordLink(token);
    const html = generateResetPasswordEmail({
      fullName: user.FullName,
      resetUrl
    });

    try {
      await emailService.sendEmail(targetEmail, 'Dat lai mat khau tai khoan', html);
      console.log('Forgot password email sent:', { userId: user.UserId, email: targetEmail });
    } catch (emailError) {
      console.error('Forgot password email error:', emailError);
    }

    return res.json(genericResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Loi khi xu ly yeu cau quen mat khau: ' + error.message
    });
  }
};

/**
 * Đặt lại mật khẩu bằng token
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    const newPassword = String(req.body.newPassword || req.body.new_password || '');

    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.purpose !== 'reset-password' || !decoded.userId) {
      return res.status(400).json({
        success: false,
        message: 'Token dat lai mat khau khong hop le'
      });
    }

    const user = await UserModel.findByIdWithPassword(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay tai khoan'
      });
    }

    const isSamePassword = await UserModel.comparePassword(newPassword, user.Password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'Mat khau moi phai khac mat khau hien tai'
      });
    }

    await UserModel.updatePassword(decoded.userId, newPassword);

    return res.json({
      success: true,
      message: 'Dat lai mat khau thanh cong'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Link dat lai mat khau da het han'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        message: 'Token dat lai mat khau khong hop le'
      });
    }

    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Loi khi dat lai mat khau: ' + error.message
    });
  }
};

/**
 * Trang đặt lại mật khẩu do backend phục vụ
 * GET /api/auth/reset-password-page?token=...
 */
const getResetPasswordPage = async (req, res) => {
  const token = String(req.query.token || '').trim();

  const escapedToken = token
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dat lai mat khau</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: linear-gradient(120deg, #f0f9ff, #ecfeff 45%, #f8fafc);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .card {
      width: 100%;
      max-width: 440px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .head {
      background: #0ea5e9;
      color: #fff;
      padding: 16px 18px;
      font-size: 20px;
      font-weight: 700;
    }
    .body { padding: 18px; }
    .hint { color: #475569; margin-top: 0; }
    label { display: block; font-weight: 600; margin: 10px 0 6px; }
    input {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
      outline: none;
    }
    input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15); }
    .btn {
      margin-top: 14px;
      width: 100%;
      border: none;
      border-radius: 8px;
      background: #0284c7;
      color: #fff;
      padding: 11px 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn:disabled { opacity: 0.7; cursor: default; }
    .msg {
      margin-top: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 14px;
      display: none;
    }
    .msg.ok { display: block; background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .msg.err { display: block; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .small { font-size: 12px; color: #64748b; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="head">Dat lai mat khau</div>
    <div class="body">
      <p class="hint">Nhap mat khau moi cho tai khoan cua ban.</p>
      <form id="resetForm">
        <label for="newPassword">Mat khau moi</label>
        <input id="newPassword" type="password" minlength="6" required />

        <label for="confirmPassword">Xac nhan mat khau</label>
        <input id="confirmPassword" type="password" minlength="6" required />

        <button id="submitBtn" class="btn" type="submit">Cap nhat mat khau</button>
      </form>
      <div id="message" class="msg"></div>
      <p class="small">Neu khong yeu cau dat lai mat khau, ban co the dong trang nay.</p>
    </div>
  </div>

  <script>
    (function () {
      var token = '${escapedToken}';
      var form = document.getElementById('resetForm');
      var msg = document.getElementById('message');
      var submitBtn = document.getElementById('submitBtn');

      function showMessage(text, isError) {
        msg.textContent = text;
        msg.className = isError ? 'msg err' : 'msg ok';
      }

      if (!token) {
        showMessage('Link dat lai mat khau khong hop le (thieu token).', true);
        submitBtn.disabled = true;
        return;
      }

      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var newPassword = String(document.getElementById('newPassword').value || '');
        var confirmPassword = String(document.getElementById('confirmPassword').value || '');

        if (newPassword.length < 6) {
          showMessage('Mat khau moi phai co it nhat 6 ky tu.', true);
          return;
        }

        if (newPassword !== confirmPassword) {
          showMessage('Xac nhan mat khau khong khop.', true);
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Dang cap nhat...';

        try {
          var response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token, newPassword: newPassword })
          });
          var data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'Khong the dat lai mat khau');
          }

          showMessage('Dat lai mat khau thanh cong. Vui long dang nhap lai.', false);
          submitBtn.textContent = 'Da cap nhat';
        } catch (error) {
          showMessage(error.message || 'Co loi xay ra, vui long thu lai.', true);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Cap nhat mat khau';
        }
      });
    })();
  </script>
</body>
</html>`;

  return res.status(200).type('html').send(html);
};

/**
 * Đăng xuất
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    // Với JWT, việc logout được xử lý ở phía client (xóa token)
    // Server chỉ trả về response thành công
    res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đăng xuất: ' + error.message
    });
  }
};

/**
 * Upload avatar
 * POST /api/auth/upload-avatar
 */
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn file ảnh'
      });
    }

    const userId = req.user.UserId;
    const avatarUrl = `/uploads/images/${req.file.filename}`;

    // Lưu vào database
    await UserModel.updateProfileImage(userId, avatarUrl);

    res.json({
      success: true,
      message: 'Cập nhật ảnh đại diện thành công',
      data: {
        avatar_url: avatarUrl,
        avatarUrl: avatarUrl
      }
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải avatar: ' + error.message
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  getResetPasswordPage,
  logout,
  uploadAvatar
};
