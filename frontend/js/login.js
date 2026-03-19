/**
 * Login Page JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
  // Check if already logged in
  if (localStorage.getItem('token')) {
    window.location.href = 'index.html';
    return;
  }

  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const alertContainer = document.getElementById('alertContainer');
  const loginMethod = document.getElementById('loginMethod');
  const identifier = document.getElementById('identifier');
  const identifierLabel = document.getElementById('identifierLabel');

  const updateIdentifierInput = () => {
    const method = loginMethod?.value || 'email';
    if (method === 'phone') {
      identifierLabel.innerHTML = '<i class="fas fa-phone me-1"></i>So dien thoai';
      identifier.placeholder = 'VD: 0912345678';
      identifier.inputMode = 'numeric';
    } else {
      identifierLabel.innerHTML = '<i class="fas fa-envelope me-1"></i>Email';
      identifier.placeholder = 'email@example.com';
      identifier.inputMode = 'email';
    }
  };

  loginMethod?.addEventListener('change', updateIdentifierInput);
  updateIdentifierInput();

  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const method = loginMethod?.value || 'email';
    const inputIdentifier = identifier.value.trim();
    const password = document.getElementById('password').value;

    if (!inputIdentifier) {
      showAlert('Vui long nhap Email hoac So dien thoai', 'danger');
      return;
    }

    try {
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang đăng nhập...';

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identifier: inputIdentifier,
          loginMethod: method,
          password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Save auth data
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('userInfo', JSON.stringify(data.data.user));

        showAlert('Đăng nhập thành công! Đang chuyển hướng...', 'success');

        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
      } else {
        showAlert(data.message || 'Email/SDT hoac mat khau khong dung!', 'danger');
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Đăng nhập';
      }
    } catch (error) {
      console.error('Login error:', error);
      showAlert('Có lỗi xảy ra. Vui lòng thử lại!', 'danger');
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Đăng nhập';
    }
  });

  function showAlert(message, type) {
    alertContainer.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;
  }
});
