/**
 * Index Page JavaScript - Enhanced Version
 */

document.addEventListener('DOMContentLoaded', function() {
  loadCategories();
  loadFeaturedProducts();
  updateAuthUI();
  initBackToTop();
  initRevealAnimations();
});

function initRevealAnimations() {
  const elements = document.querySelectorAll('.reveal-on-scroll');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -30px 0px'
  });

  elements.forEach((el, index) => {
    el.style.transitionDelay = `${Math.min(index * 45, 220)}ms`;
    observer.observe(el);
  });
}

function applyStaggerAnimation(containerSelector, itemSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const items = container.querySelectorAll(itemSelector);
  items.forEach((item, index) => {
    item.classList.add('reveal-on-scroll');
    item.style.transitionDelay = `${Math.min(index * 55, 260)}ms`;

    // Kích hoạt trực tiếp vì item được render động trong viewport.
    requestAnimationFrame(() => {
      item.classList.add('is-visible');
    });
  });
}

async function loadCategories() {
  const container = document.getElementById('categoriesContainer');
  
  // Show skeleton loaders
  container.innerHTML = createSkeleton('category', 6);
  
  try {
    const response = await fetch(`${API_BASE_URL}/categories`);
    const data = await response.json();
    
    if (data.success && data.data) {
      displayCategories(data.data);
    } else {
      throw new Error(data.message || 'Không thể tải danh mục');
    }
  } catch (error) {
    console.error('Error loading categories:', error);
    toast.error('Không thể tải danh mục sản phẩm');
    container.innerHTML = `
      <div class="col-12 text-center empty-state">
        <i class="fas fa-exclamation-triangle text-warning"></i>
        <p class="text-muted mt-3">Không thể tải danh mục sản phẩm</p>
        <button class="btn btn-primary" onclick="loadCategories()">
          <i class="fas fa-redo me-2"></i>Thử lại
        </button>
      </div>
    `;
  }
}

function displayCategories(categories) {
  const container = document.getElementById('categoriesContainer');
  
  if (categories.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center empty-state">
        <i class="fas fa-inbox text-muted"></i>
        <p class="text-muted mt-3">Chưa có danh mục nào</p>
      </div>
    `;
    return;
  }

  container.innerHTML = categories.slice(0, 6).map(category => `
    <div class="col-md-4 col-lg-2 mb-4 page-transition">
      <a href="products.html?category=${category.category_id}" class="text-decoration-none">
        <div class="card category-card h-100 text-center">
          <div class="card-body">
            <i class="fas fa-box fa-3x text-primary mb-3"></i>
            <h5 class="card-title">${category.category_name}</h5>
            <p class="card-text text-muted small">${category.description || 'Xem sản phẩm'}</p>
          </div>
        </div>
      </a>
    </div>
  `).join('');

  applyStaggerAnimation('#categoriesContainer', '.page-transition');
}

async function loadFeaturedProducts() {
  const container = document.getElementById('productsContainer');
  
  // Show skeleton loaders
  container.innerHTML = createSkeleton('card', 8);
  
  try {
    const response = await fetch(`${API_BASE_URL}/products`);
    const data = await response.json();
    
    if (data.success && data.data) {
      displayFeaturedProducts(data.data.slice(0, 8));
    } else {
      throw new Error(data.message || 'Không thể tải sản phẩm');
    }
  } catch (error) {
    console.error('Error loading products:', error);
    toast.error('Không thể tải sản phẩm');
    container.innerHTML = `
      <div class="col-12 text-center empty-state">
        <i class="fas fa-exclamation-triangle text-warning"></i>
        <p class="text-muted mt-3">Không thể tải sản phẩm</p>
        <button class="btn btn-primary" onclick="loadFeaturedProducts()">
          <i class="fas fa-redo me-2"></i>Thử lại
        </button>
      </div>
    `;
  }
}

function displayFeaturedProducts(products) {
  const container = document.getElementById('productsContainer');
  
  if (products.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center empty-state">
        <i class="fas fa-inbox text-muted"></i>
        <p class="text-muted mt-3">Chưa có sản phẩm nào</p>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(product => `
    <div class="col-md-4 col-lg-3 mb-4 page-transition">
      <div class="card product-card h-100 position-relative">
        ${product.stock_quantity < 10 && product.stock_quantity > 0 
          ? '<div class="discount-badge"><i class="fas fa-fire me-1"></i>Sắp hết</div>' 
          : ''}
        <div class="product-image-wrapper">
          <img src="${getImageUrl(product.image_url)}" 
               class="card-img-top lazy" 
               alt="${product.product_name}"
               loading="lazy"
               decoding="async"
               onload="this.classList.add('loaded')"
               onerror="this.onerror=null; this.src='${getPlaceholderImage(300, 200, 'Lỗi tải ảnh')}'">
        </div>
        <button class="btn btn-sm btn-light quick-view-btn" onclick="quickView(${product.product_id})" title="Xem nhanh">
          <i class="fas fa-eye"></i>
        </button>
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${product.product_name}</h5>
          <p class="card-text text-muted small">${product.description ? product.description.substring(0, 60) + '...' : 'Không có mô tả'}</p>
          <div class="mt-auto">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="text-primary fw-bold fs-5">${formatPrice(product.price)}</span>
              ${product.stock_quantity > 0 
                ? `<span class="badge bg-success"><i class="fas fa-check me-1"></i>Còn ${product.stock_quantity}</span>` 
                : `<span class="badge bg-danger"><i class="fas fa-times me-1"></i>Hết hàng</span>`}
            </div>
            <div class="d-flex gap-2">
              <a href="product-detail.html?id=${product.product_id}" class="btn btn-primary flex-grow-1">
                <i class="fas fa-eye me-1"></i>Chi tiết
              </a>
              ${product.stock_quantity > 0 
                ? `<button class="btn btn-outline-primary" onclick="addToCartQuick(${product.product_id})" title="Thêm vào giỏ">
                    <i class="fas fa-cart-plus"></i>
                  </button>` 
                : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  applyStaggerAnimation('#productsContainer', '.page-transition');
}

// Quick add to cart
async function addToCartQuick(productId) {
  const token = localStorage.getItem('token');
  if (!token) {
    toast.warning('Vui lòng đăng nhập để thêm vào giỏ hàng');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
    return;
  }

  loading.show();
  try {
    const response = await fetch(`${API_BASE_URL}/cart/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        productId: productId,
        quantity: 1
      })
    });

    const data = await response.json();
    
    if (data.success) {
      toast.success('Đã thêm vào giỏ hàng!');
      updateCartBadge();
    } else {
      throw new Error(data.message || 'Không thể thêm vào giỏ hàng');
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
    toast.error(error.message);
  } finally {
    loading.hide();
  }
}

// Quick view (placeholder - can be enhanced with modal)
function quickView(productId) {
  window.location.href = `product-detail.html?id=${productId}`;
}

// Back to top button
function initBackToTop() {
  const backToTop = document.createElement('div');
  backToTop.className = 'back-to-top';
  backToTop.innerHTML = '<i class="fas fa-arrow-up"></i>';
  document.body.appendChild(backToTop);

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backToTop.classList.add('show');
    } else {
      backToTop.classList.remove('show');
    }
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ========================================
// VIDEO SECTION FUNCTIONS
// ========================================

/**
 * Play video và ẩn overlay
 */
function playVideo() {
  const overlay = document.getElementById('videoOverlay');
  const iframe = document.getElementById('promoVideo');
  
  if (overlay && iframe) {
    // Ẩn overlay
    overlay.classList.add('hidden');
    
    // Thêm autoplay vào iframe src
    const currentSrc = iframe.src;
    if (!currentSrc.includes('autoplay=1')) {
      iframe.src = currentSrc.includes('?') 
        ? currentSrc + '&autoplay=1' 
        : currentSrc + '?autoplay=1';
    }
    
    // Track video play event
    console.log('Video started playing');
  }
}

/**
 * Reset video khi click overlay lại
 */
function resetVideo() {
  const overlay = document.getElementById('videoOverlay');
  const iframe = document.getElementById('promoVideo');
  
  if (overlay && iframe) {
    overlay.classList.remove('hidden');
    // Remove autoplay
    iframe.src = iframe.src.replace('&autoplay=1', '').replace('?autoplay=1', '');
  }
}

// Optional: Thêm event listener cho overlay click
document.addEventListener('DOMContentLoaded', function() {
  const overlay = document.getElementById('videoOverlay');
  if (overlay) {
    overlay.addEventListener('click', playVideo);
  }
});
