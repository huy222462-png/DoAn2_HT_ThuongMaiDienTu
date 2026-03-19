/**
 * Forgot Password Page JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('forgotPasswordForm');
  const submitBtn = document.getElementById('submitBtn');
  const alertContainer = document.getElementById('alertContainer');
  const loginMethod = document.getElementById('loginMethod');
  const identifier = document.getElementById('identifier');
  const identifierLabel = document.getElementById('identifierLabel');
  const forgotHintText = document.getElementById('forgotHintText');

  const updateIdentifierInput = () => {
    const method = loginMethod?.value || 'email';
    if (method === 'phone') {
      identifierLabel.innerHTML = '<i class="fas fa-phone me-1"></i>So dien thoai';
      identifier.placeholder = 'VD: 0912345678';
      identifier.inputMode = 'numeric';
      forgotHintText.textContent = 'He thong se tim tai khoan theo SDT va gui link reset ve email da luu.';
    } else {
      identifierLabel.innerHTML = '<i class="fas fa-envelope me-1"></i>Email';
      identifier.placeholder = 'email@example.com';
      identifier.inputMode = 'email';
      forgotHintText.textContent = 'Link dat lai mat khau se duoc gui ve email cua tai khoan.';
    }
  };

  loginMethod?.addEventListener('change', updateIdentifierInput);
  updateIdentifierInput();

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const method = loginMethod?.value || 'email';
    const inputIdentifier = String(identifier.value || '').trim();
    if (!inputIdentifier) {
      showAlert('Vui long nhap Email hoac So dien thoai', 'danger');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Dang xu ly...';

      const response = await fetch(AUTH_ENDPOINTS.forgotPassword, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identifier: inputIdentifier,
          loginMethod: method
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Khong the gui yeu cau quen mat khau');
      }

      showAlert(data.message || 'Neu email ton tai, he thong da gui link dat lai mat khau.', 'success');
    } catch (error) {
      showAlert(error.message || 'Co loi xay ra, vui long thu lai', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Gui link dat lai mat khau';
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
