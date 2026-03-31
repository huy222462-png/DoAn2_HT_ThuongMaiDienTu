/**
 * Profile Page JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
  checkAuth();
  loadProfile();
  setupTabs();
  setupForms();
  initAvatarUpload();
});

function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Bạn cần đăng nhập để xem thông tin cá nhân!');
    window.location.href = 'login.html';
  }
}

function setupTabs() {
  const tabLinks = document.querySelectorAll('.list-group-item[data-tab]');
  tabLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Remove active class from all tabs
      tabLinks.forEach(l => l.classList.remove('active'));
      this.classList.add('active');

      // Hide all tab contents
      document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
      });

      // Show selected tab
      const tabId = this.dataset.tab + 'Tab';
      document.getElementById(tabId).style.display = 'block';
    });
  });
}

async function loadProfile() {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Auto logout nếu token không hợp lệ
    if (response.status === 401) {
      alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
      localStorage.clear();
      window.location.href = 'login.html';
      return;
    }

    const data = await response.json();

    if (data.success && data.data) {
      displayProfile(data.data);
    } else {
      showAlert('Không thể tải thông tin người dùng', 'danger');
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    showAlert('Có lỗi xảy ra khi tải thông tin', 'danger');
  }
}

function displayProfile(user) {
  // Sidebar
  document.getElementById('sidebarName').textContent = user.fullName || user.full_name || 'Người dùng';
  document.getElementById('sidebarEmail').textContent = user.email || '';

  // Display avatar
  const avatar = user.avatar_url || user.profileImage || user.avatar;
  if (avatar) {
    document.getElementById('profileAvatar').src = getImageUrl(avatar);
  }

  // Form fields
  document.getElementById('fullName').value = user.fullName || user.full_name || '';
  document.getElementById('email').value = user.email || '';
  document.getElementById('phone').value = user.phone || '';
  document.getElementById('address').value = user.address || '';
}

function setupForms() {
  // Profile form
  document.getElementById('profileForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    await updateProfile();
  });

  // Password form
  document.getElementById('passwordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    await changePassword();
  });
}

async function updateProfile() {
  const token = localStorage.getItem('token');
  
  const formData = {
    fullName: document.getElementById('fullName').value,
    phone: document.getElementById('phone').value,
    address: document.getElementById('address').value
  };

  try {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (response.ok) {
      showAlert('Cập nhật thông tin thành công!', 'success');
      loadProfile();
      
      // Update user info in localStorage
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      userInfo.fullName = formData.fullName;
      userInfo.full_name = formData.fullName;
      userInfo.phone = formData.phone;
      userInfo.address = formData.address;
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      
      // Update navbar display
      updateNavbarUserName();
    } else {
      showAlert(data.message || 'Cập nhật thông tin thất bại', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    showAlert('Có lỗi xảy ra!', 'danger');
  }
}

async function changePassword() {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;

  if (newPassword !== confirmNewPassword) {
    showPasswordAlert('Mật khẩu mới không khớp!', 'danger');
    return;
  }

  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      })
    });

    const data = await response.json();

    if (response.ok) {
      showPasswordAlert('Đổi mật khẩu thành công!', 'success');
      document.getElementById('passwordForm').reset();
    } else {
      showPasswordAlert(data.message || 'Đổi mật khẩu thất bại', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    showPasswordAlert('Có lỗi xảy ra!', 'danger');
  }
}

function showAlert(message, type) {
  const alertContainer = document.getElementById('alertContainer');
  alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;

  // Auto hide after 5 seconds
  setTimeout(() => {
    alertContainer.innerHTML = '';
  }, 5000);
}

function showPasswordAlert(message, type) {
  const alertContainer = document.getElementById('passwordAlertContainer');
  alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;

  // Auto hide after 5 seconds
  setTimeout(() => {
    alertContainer.innerHTML = '';
  }, 5000);
}

function updateNavbarUserName() {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const userNameDisplay = document.getElementById('userNameDisplay');
  const displayName = userInfo.fullName || userInfo.full_name;
  if (userNameDisplay && displayName) {
    userNameDisplay.textContent = displayName;
  }
}

// ========== Avatar Upload Management ==========
let uploadAvatarModal = null;

function initAvatarUpload() {
  const uploadModalEl = document.getElementById('uploadAvatarModal');
  if (uploadModalEl) {
    uploadAvatarModal = new bootstrap.Modal(uploadModalEl);
  }
  
  // Setup file preview
  document.getElementById('avatarFileInput')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = document.getElementById('uploadPreview');
        preview.src = event.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });
  
  // Setup upload button
  document.getElementById('uploadAvatarBtn')?.addEventListener('click', uploadProfileAvatar);
}

async function uploadProfileAvatar() {
  const token = localStorage.getItem('token');
  const fileInput = document.getElementById('avatarFileInput');
  const file = fileInput.files[0];
  
  if (!file) {
    showAlert('Vui lòng chọn ảnh', 'warning');
    return;
  }
  
  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showAlert('Ảnh không được vượt quá 5MB', 'danger');
    return;
  }
  
  // Validate file type
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    showAlert('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP', 'danger');
    return;
  }
  
  const uploadBtn = document.getElementById('uploadAvatarBtn');
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang tải...';
  
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await fetch(`${API_BASE_URL}/auth/upload-avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      showAlert('Cập nhật ảnh đại diện thành công!', 'success');
      
      // Update avatar display
      const avatarUrl = data.data?.avatar_url || data.avatar_url;
      if (avatarUrl) {
        document.getElementById('profileAvatar').src = getImageUrl(avatarUrl);
      }
      
      // Update sidebar avatar
      const sidebarAvatar = document.getElementById('sidebarName');
      if (sidebarAvatar) {
        // Just make sure the main avatar update worked
      }
      
      // Update navbar if needed
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      userInfo.avatar_url = avatarUrl;
      userInfo.profileImage = avatarUrl;
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      
      // Close modal
      if (uploadAvatarModal) {
        uploadAvatarModal.hide();
      }
      fileInput.value = '';
      document.getElementById('uploadPreview').style.display = 'none';
    } else {
      showAlert(data.message || 'Tải ảnh thất bại', 'danger');
    }
  } catch (error) {
    console.error('Error uploading avatar:', error);
    showAlert('Có lỗi xảy ra khi tải ảnh', 'danger');
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Tải lên';
  }
}
