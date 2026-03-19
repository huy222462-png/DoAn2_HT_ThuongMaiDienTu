/**
 * Auth Helper Functions
 * Xử lý authentication và authorization
 */

// Check if user is logged in
function isLoggedIn() {
  return !!localStorage.getItem('token');
}

// Get current user info
function getCurrentUser() {
  const userInfo = localStorage.getItem('userInfo');
  return userInfo ? JSON.parse(userInfo) : null;
}

// Save auth data
function saveAuthData(token, userInfo) {
  localStorage.setItem('token', token);
  localStorage.setItem('userInfo', JSON.stringify(userInfo));
}

// Clear auth data
function clearAuthData() {
  localStorage.removeItem('token');
  localStorage.removeItem('userInfo');
}

function notify(type, message) {
  if (typeof toast !== 'undefined' && toast && typeof toast[type] === 'function') {
    toast[type](message);
    return;
  }

  if (type !== 'success') {
    alert(message);
  }
}

function syncAdminMenu(userInfo) {
  const dropdownMenu = document.querySelector('#userNavItem .dropdown-menu');
  if (!dropdownMenu) return;

  const existing = dropdownMenu.querySelector('.admin-menu-item');
  const isUserAdmin = !!(userInfo && userInfo.isAdmin);

  if (!isUserAdmin) {
    if (existing) {
      existing.remove();
    }
    return;
  }

  if (existing) return;

  const divider = dropdownMenu.querySelector('.dropdown-divider');
  const item = document.createElement('li');
  item.className = 'admin-menu-item';
  item.innerHTML = '<a class="dropdown-item" href="admin.html"><i class="fas fa-shield-alt me-2"></i>Quan tri he thong</a>';

  if (divider && divider.parentElement) {
    dropdownMenu.insertBefore(item, divider.parentElement);
  } else {
    dropdownMenu.appendChild(item);
  }
}

function syncWishlistMenu() {
  const dropdownMenu = document.querySelector('#userNavItem .dropdown-menu');
  if (!dropdownMenu) return;

  const existing = dropdownMenu.querySelector('.wishlist-menu-item');
  if (existing) return;

  const divider = dropdownMenu.querySelector('.dropdown-divider');
  const item = document.createElement('li');
  item.className = 'wishlist-menu-item';
  item.innerHTML = '<a class="dropdown-item" href="wishlist.html"><i class="fas fa-heart me-2"></i>San pham yeu thich</a>';

  if (divider && divider.parentElement) {
    dropdownMenu.insertBefore(item, divider.parentElement);
  } else {
    dropdownMenu.appendChild(item);
  }
}

// Update navbar based on auth status
function updateAuthUI() {
  const token = localStorage.getItem('token');
  const loginNavItem = document.getElementById('loginNavItem');
  const registerNavItem = document.getElementById('registerNavItem');
  const userNavItem = document.getElementById('userNavItem');
  const cartNavItem = document.getElementById('cartNavItem');
  const registerHeroBtn = document.getElementById('registerHeroBtn');
  const adminHeroBtn = document.getElementById('adminHeroBtn');
  
  if (token) {
    // User is logged in
    if (loginNavItem) loginNavItem.style.display = 'none';
    if (registerNavItem) registerNavItem.style.display = 'none';
    if (registerHeroBtn) registerHeroBtn.style.display = 'none';
    if (userNavItem) userNavItem.style.display = 'block';
    if (cartNavItem) cartNavItem.style.display = 'block';
    
    // Display user name
    const userInfo = getCurrentUser();
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay && userInfo) {
      userNameDisplay.textContent = userInfo.fullName || userInfo.full_name || userInfo.username || userInfo.email;
    }
    syncWishlistMenu();
    syncAdminMenu(userInfo);
    if (adminHeroBtn) {
      adminHeroBtn.style.display = userInfo && userInfo.isAdmin ? 'inline-block' : 'none';
    }
    
    // Update cart badge
    updateCartBadge();
  } else {
    // User is not logged in
    if (loginNavItem) loginNavItem.style.display = 'block';
    if (registerNavItem) registerNavItem.style.display = 'block';
    if (registerHeroBtn) registerHeroBtn.style.display = 'inline-block';
    if (adminHeroBtn) adminHeroBtn.style.display = 'none';
    if (userNavItem) userNavItem.style.display = 'none';
    if (cartNavItem) cartNavItem.style.display = 'block';
    syncAdminMenu(null);
  }
}

// Update cart badge
async function updateCartBadge() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/cart`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // Nếu 401, chỉ log ra console, không logout tự động
    // (Để tránh logout ngay sau khi đăng nhập)
    if (response.status === 401) {
      console.warn('Cart API returned 401, token may be invalid');
      return;
    }

    const data = await response.json();
    if (data.success && data.data) {
      // Backend trả về data.data.items, không phải data.data trực tiếp
      const cartItems = data.data.items || data.data;
      const totalItems = Array.isArray(cartItems) 
        ? cartItems.reduce((sum, item) => sum + (item.quantity || item.Quantity || 1), 0)
        : 0;
      
      const cartBadge = document.getElementById('cartBadge');
      if (cartBadge) {
        cartBadge.textContent = totalItems;
        cartBadge.style.display = totalItems > 0 ? 'inline' : 'none';
      }
    }
  } catch (error) {
    console.error('Error updating cart badge:', error);
  }
}

// Logout function
function logout() {
  if (confirm('Bạn có chắc muốn đăng xuất?')) {
    clearAuthData();
    notify('success', 'Đã đăng xuất thành công');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  }
}

/**
 * Kiểm tra quyền admin
 */
function isAdmin() {
  const user = getCurrentUser();
  return user && user.isAdmin;
}

/**
 * Redirect nếu chưa đăng nhập
 */
function requireAuth() {
  if (!isLoggedIn()) {
    notify('warning', 'Vui lòng đăng nhập để tiếp tục');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
    return false;
  }
  return true;
}

/**
 * Redirect nếu không phải admin
 */
function requireAdmin() {
  if (!isLoggedIn() || !isAdmin()) {
    notify('error', 'Bạn không có quyền truy cập trang này');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
    return false;
  }
  return true;
}

// Initialize auth UI on page load
document.addEventListener('DOMContentLoaded', function() {
  updateAuthUI();
  
  // Setup logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      logout();
    });
  }
});
