/**
 * Utility Functions
 */

// Toast notification system
class ToastManager {
  constructor() {
    this.container = this.createContainer();
  }

  createContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container position-fixed top-0 end-0 p-3';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }
    return container;
  }

  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <i class="fas ${icons[type]} me-2"></i>${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;

    this.container.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { autohide: true, delay: duration });
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => {
      toast.remove();
    });
  }

  success(message, duration) {
    this.show(message, 'success', duration);
  }

  error(message, duration) {
    this.show(message, 'error', duration || 5000);
  }

  warning(message, duration) {
    this.show(message, 'warning', duration);
  }

  info(message, duration) {
    this.show(message, 'info', duration);
  }
}

const toast = new ToastManager();

// Loading overlay
class LoadingManager {
  constructor() {
    this.overlay = this.createOverlay();
    this.count = 0;
  }

  createOverlay() {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loadingOverlay';
      overlay.className = 'loading-overlay';
      overlay.innerHTML = `
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Đang tải...</span>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  show() {
    this.count++;
    this.overlay.classList.add('active');
  }

  hide() {
    this.count = Math.max(0, this.count - 1);
    if (this.count === 0) {
      this.overlay.classList.remove('active');
    }
  }
}

const loading = new LoadingManager();

// Skeleton loader generator
function createSkeleton(type = 'card', count = 4) {
  const skeletons = {
    card: `
      <div class="col-md-4 col-lg-3 mb-4">
        <div class="card">
          <div class="skeleton skeleton-img" style="height: 200px;"></div>
          <div class="card-body">
            <div class="skeleton skeleton-text mb-2"></div>
            <div class="skeleton skeleton-text mb-2" style="width: 80%;"></div>
            <div class="skeleton skeleton-text" style="width: 60%;"></div>
          </div>
        </div>
      </div>
    `,
    category: `
      <div class="col-md-4 col-lg-2 mb-4">
        <div class="card text-center">
          <div class="card-body">
            <div class="skeleton skeleton-circle mx-auto mb-3" style="width: 60px; height: 60px;"></div>
            <div class="skeleton skeleton-text mb-2"></div>
            <div class="skeleton skeleton-text" style="width: 70%;"></div>
          </div>
        </div>
      </div>
    `,
    list: `
      <div class="mb-3">
        <div class="skeleton skeleton-text mb-2"></div>
        <div class="skeleton skeleton-text" style="width: 90%;"></div>
      </div>
    `
  };

  return Array(count).fill(skeletons[type]).join('');
}

// Format currency
function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price);
}

// Generate placeholder image
function getPlaceholderImage(width = 300, height = 200, text = 'No Image') {
  // Create SVG placeholder - use charset=utf8 for Unicode support
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="#e9ecef"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="20" 
            fill="#6c757d" text-anchor="middle" dominant-baseline="middle">
        ${text}
      </text>
    </svg>
  `;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Smooth scroll to element
function smoothScrollTo(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Copy to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Đã sao chép vào clipboard');
  } catch (err) {
    toast.error('Không thể sao chép');
  }
}

// Image preloader
function preloadImages(urls) {
  return Promise.all(
    urls.map(url => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject(url);
        img.src = url;
      });
    })
  );
}

// Validation helpers
const validators = {
  email: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  phone: (phone) => {
    const re = /^[0-9]{10}$/;
    return re.test(phone.replace(/\s/g, ''));
  },
  password: (password) => {
    return password.length >= 6;
  }
};

// Local storage helpers
const storage = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage error:', e);
      return false;
    }
  },
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('Storage error:', e);
      return null;
    }
  },
  remove: (key) => {
    localStorage.removeItem(key);
  },
  clear: () => {
    localStorage.clear();
  }
};

// API request wrapper with error handling
async function apiRequest(url, options = {}) {
  try {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Có lỗi xảy ra');
    }

    return { success: true, data: data.data || data, response };
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, error: error.message };
  }
}

// Animation helpers
function fadeIn(element, duration = 300) {
  element.style.opacity = 0;
  element.style.display = 'block';
  
  let start = null;
  function animate(timestamp) {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    element.style.opacity = Math.min(progress / duration, 1);
    if (progress < duration) {
      requestAnimationFrame(animate);
    }
  }
  requestAnimationFrame(animate);
}

function fadeOut(element, duration = 300) {
  element.style.opacity = 1;
  
  let start = null;
  function animate(timestamp) {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    element.style.opacity = 1 - Math.min(progress / duration, 1);
    if (progress < duration) {
      requestAnimationFrame(animate);
    } else {
      element.style.display = 'none';
    }
  }
  requestAnimationFrame(animate);
}
