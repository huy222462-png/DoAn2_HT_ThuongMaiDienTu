/**
 * Reset Password Page JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('resetPasswordForm');
  const submitBtn = document.getElementById('submitBtn');
  const alertContainer = document.getElementById('alertContainer');

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    showAlert('Link dat lai mat khau khong hop le hoac thieu token', 'danger');
    submitBtn.disabled = true;
    return;
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const newPassword = String(document.getElementById('newPassword').value || '');
    const confirmPassword = String(document.getElementById('confirmPassword').value || '');

    if (newPassword.length < 6) {
      showAlert('Mat khau moi phai co it nhat 6 ky tu', 'danger');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('Xac nhan mat khau khong khop', 'danger');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Dang cap nhat...';

      const response = await fetch(AUTH_ENDPOINTS.resetPassword, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          newPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Khong the dat lai mat khau');
      }

      showAlert('Dat lai mat khau thanh cong. Dang chuyen den trang dang nhap...', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1800);
    } catch (error) {
      showAlert(error.message || 'Co loi xay ra, vui long thu lai', 'danger');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-check me-2"></i>Cap nhat mat khau';
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
