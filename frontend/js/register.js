/**
 * Register Page JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
  const registerForm = document.getElementById('registerForm');
  const registerBtn = document.getElementById('registerBtn');

  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value.trim().toLowerCase();
    const phone = document.getElementById('phone').value.replace(/\D/g, '');
    const address = document.getElementById('address').value;
    const loginMethod = document.getElementById('loginMethod').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    const fakeDomains = ['example.com', 'test.com', 'mailinator.com', 'tempmail.com'];
    const emailDomain = (email.split('@')[1] || '').toLowerCase();

    // Validate password match
    if (password !== confirmPassword) {
      showAlert('Mật khẩu không khớp!', 'danger');
      return;
    }

    if (fakeDomains.includes(emailDomain)) {
      showAlert('Vui long su dung email that de nhan thong bao don hang', 'warning');
      return;
    }

    try {
      registerBtn.disabled = true;
      registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          loginMethod,
          address: address,
          password
        })
      });

      const data = await response.json();

      if (response.ok) {
        showAlert('Đăng ký thành công! Đang chuyển đến trang đăng nhập...', 'success');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);
      } else {
        showAlert(data.message || 'Đăng ký thất bại!', 'danger');
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('Có lỗi xảy ra. Vui lòng thử lại!', 'danger');
    } finally {
      registerBtn.disabled = false;
      registerBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Đăng ký';
    }
  });

  function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    alertContainer.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;
  }
});
