/**
 * Product Detail Page JavaScript
 */

let currentProductId = null;
let currentProductData = null;
let currentSelectedVariantId = null;
let selectedRating = 5;
const RECENTLY_VIEWED_KEY = 'recentlyViewedProducts';

function renderPriceHtml(finalPrice, basePrice = null, salePrice = null) {
  const safeFinal = Number(finalPrice || 0);
  const safeBase = Number(basePrice ?? finalPrice ?? 0);
  const safeSale = Number(salePrice || 0);
  const isOnSale = safeSale > 0 && safeSale < safeBase;

  if (!isOnSale) {
    return `<span class="text-primary">${formatPrice(safeFinal)}</span>`;
  }

  const discountPercent = Math.max(1, Math.round((1 - (safeFinal / safeBase)) * 100));
  return `
    <div class="d-flex flex-column gap-1">
      <span class="text-danger">${formatPrice(safeFinal)}</span>
      <small class="text-muted text-decoration-line-through">${formatPrice(safeBase)}</small>
      <span class="badge bg-danger-subtle text-danger-emphasis" style="width: fit-content;">-${discountPercent}%</span>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', function() {
  // Get product ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  currentProductId = urlParams.get('id');

  if (!currentProductId) {
    window.location.href = 'products.html';
    return;
  }

  loadProductDetail();
  loadReviews();
  setupRatingStars();
  setupReviewForm();
});

async function loadProductDetail() {
  loading.show();
  try {
    const response = await fetch(`${API_BASE_URL}/products/${currentProductId}`);
    const data = await response.json();

    if (data.success && data.data) {
      displayProductDetail(data.data);
    } else {
      throw new Error('Không tìm thấy sản phẩm');
    }
  } catch (error) {
    console.error('Error loading product:', error);
    toast.error(error.message || 'Không thể tải thông tin sản phẩm');
    showError('Không thể tải thông tin sản phẩm');
  } finally {
    loading.hide();
  }
}

function displayProductDetail(product) {
  currentProductData = product;
  document.getElementById('productBreadcrumb').textContent = product.product_name;
  document.title = `${product.product_name} - LumiCart`;

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const hasVariants = variants.length > 0;
  currentSelectedVariantId = null;

  const initialImage = product.image_url;
  const initialPrice = Number(product.price);
  const initialBasePrice = Number(product.base_price ?? product.price);
  const initialSalePrice = Number(product.sale_price || 0);
  const initialStock = Number(product.stock_quantity);

  saveRecentlyViewedProduct(product);
  renderRecentlyViewedProducts(product.product_id);

  const container = document.getElementById('productDetailContainer');
  container.innerHTML = `
    <div class="row">
      <div class="col-md-6">
        <img src="${getImageUrl(initialImage)}"
          id="detailProductImage"
              class="img-fluid rounded shadow lazy loaded" 
             alt="${product.product_name}"
              loading="eager"
              fetchpriority="high"
              decoding="async"
             onerror="this.src='${getPlaceholderImage(500, 500, 'Lỗi tải ảnh')}'">
      </div>
      <div class="col-md-6">
        <h2 class="mb-3">${product.product_name}</h2>
        <div class="mb-3">
          <span class="badge bg-primary">${product.category_name || 'Chưa phân loại'}</span>
          ${product.AverageRating || product.average_rating ? `
            <span class="ms-2">
              <i class="fas fa-star text-warning"></i>
              ${parseFloat(product.AverageRating || product.average_rating).toFixed(1)} 
              (${product.Reviews ? product.Reviews.length : 0} đánh giá)
            </span>
          ` : ''}
        </div>
        <h3 class="mb-4" id="detailProductPrice">${renderPriceHtml(initialPrice, initialBasePrice, initialSalePrice)}</h3>

        ${hasVariants ? `
          <div class="mb-4">
            <h5 class="mb-2">Chon bien the</h5>
            <select class="form-select" id="productVariantSelect" onchange="onVariantChange(this.value)">
              <option value="" selected>San pham chinh - ${formatPrice(product.price)}${Number(product.stock_quantity) > 0 ? ` (Con ${Number(product.stock_quantity)})` : ' (Het hang)'}</option>
              ${variants.map((variant) => {
                const variantId = Number(variant.variant_id);
                const stock = Number(variant.stock);
                const label = `${variant.variant_name} - ${formatPrice(variant.price)}${stock > 0 ? ` (Con ${stock})` : ' (Het hang)'}`;
                const selected = currentSelectedVariantId === variantId ? 'selected' : '';
                return `<option value="${variantId}" ${selected}>${label}</option>`;
              }).join('')}
            </select>
          </div>
        ` : ''}

        <div class="mb-4">
          <h5>Mô tả sản phẩm</h5>
          <p class="text-muted">${product.description || 'Chưa có mô tả'}</p>
        </div>
        <div class="mb-4">
          <span class="badge ${initialStock > 0 ? 'bg-success' : 'bg-danger'} fs-6" id="detailProductStockBadge">
            <i class="fas fa-box me-1"></i>
            ${initialStock > 0 ? `Còn ${initialStock} sản phẩm` : 'Hết hàng'}
          </span>
        </div>
        <div class="d-flex gap-2">
          <div class="input-group" style="max-width: 150px;">
            <button class="btn btn-outline-secondary" type="button" onclick="decreaseQuantity()">
              <i class="fas fa-minus"></i>
            </button>
            <input type="number" class="form-control text-center" id="quantity" value="1" min="1" max="${Math.max(1, initialStock)}">
            <button class="btn btn-outline-secondary" type="button" onclick="increaseQuantity()">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <button class="btn btn-primary flex-grow-1" id="addToCartBtn" onclick="addToCart()" ${initialStock <= 0 ? 'disabled' : ''}>
            <i class="fas fa-cart-plus me-2"></i>Thêm vào giỏ hàng
          </button>
          <button
            type="button"
            class="btn btn-outline-danger"
            id="detailWishlistBtn"
            onclick="toggleWishlistCurrent()"
            title="Them vao yeu thich"
          >
            <i class="far fa-heart me-1"></i>Yeu thich
          </button>
        </div>
      </div>
    </div>
  `;

  loadWishlistStatus();
}

function getSelectedVariant() {
  if (!currentProductData || !Array.isArray(currentProductData.variants) || !currentProductData.variants.length) {
    return null;
  }

  if (currentSelectedVariantId === null || currentSelectedVariantId === undefined || currentSelectedVariantId === '') {
    return null;
  }

  const selectedId = Number(currentSelectedVariantId);
  if (Number.isFinite(selectedId) && selectedId > 0) {
    const exact = currentProductData.variants.find((variant) => Number(variant.variant_id) === selectedId);
    if (exact) {
      return exact;
    }
  }

  return null;
}

function onVariantChange(variantId) {
  currentSelectedVariantId = variantId ? Number(variantId) : null;
  updateVariantDisplay();
}

function updateVariantDisplay() {
  if (!currentProductData) {
    return;
  }

  const selectedVariant = getSelectedVariant();

  const imageElement = document.getElementById('detailProductImage');
  const priceElement = document.getElementById('detailProductPrice');
  const stockBadge = document.getElementById('detailProductStockBadge');
  const quantityInput = document.getElementById('quantity');
  const addButton = document.getElementById('addToCartBtn');

  const nextImage = selectedVariant?.image_url || currentProductData.image_url;
  const nextPrice = selectedVariant ? Number(selectedVariant.price) : Number(currentProductData.price);
  const nextBasePrice = selectedVariant ? Number(selectedVariant.price) : Number(currentProductData.base_price ?? currentProductData.price);
  const nextSalePrice = selectedVariant ? 0 : Number(currentProductData.sale_price || 0);
  const nextStock = selectedVariant ? Number(selectedVariant.stock) : Number(currentProductData.stock_quantity);

  if (imageElement) {
    imageElement.src = getImageUrl(nextImage);
  }

  if (priceElement) {
    priceElement.innerHTML = renderPriceHtml(nextPrice, nextBasePrice, nextSalePrice);
  }

  if (stockBadge) {
    stockBadge.classList.toggle('bg-success', nextStock > 0);
    stockBadge.classList.toggle('bg-danger', nextStock <= 0);
    stockBadge.innerHTML = `<i class="fas fa-box me-1"></i>${nextStock > 0 ? `Còn ${nextStock} sản phẩm` : 'Hết hàng'}`;
  }

  if (quantityInput) {
    quantityInput.max = String(Math.max(1, nextStock));
    const currentQty = Number(quantityInput.value) || 1;
    quantityInput.value = String(Math.max(1, Math.min(currentQty, Math.max(1, nextStock))));
  }

  if (addButton) {
    addButton.disabled = nextStock <= 0;
  }
}

async function loadWishlistStatus() {
  const button = document.getElementById('detailWishlistBtn');
  if (!button) {
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    button.classList.remove('btn-danger');
    button.classList.add('btn-outline-danger');
    button.innerHTML = '<i class="far fa-heart me-1"></i>Yeu thich';
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/wishlist/check/${currentProductId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    const inWishlist = Boolean(data.data?.inWishlist);

    if (inWishlist) {
      button.classList.remove('btn-outline-danger');
      button.classList.add('btn-danger');
      button.innerHTML = '<i class="fas fa-heart me-1"></i>Da yeu thich';
    } else {
      button.classList.remove('btn-danger');
      button.classList.add('btn-outline-danger');
      button.innerHTML = '<i class="far fa-heart me-1"></i>Yeu thich';
    }
  } catch (error) {
    console.warn('Wishlist status error:', error.message);
  }
}

async function toggleWishlistCurrent() {
  const token = localStorage.getItem('token');
  if (!token) {
    toast.warning('Vui long dang nhap de luu yeu thich');
    return;
  }

  const button = document.getElementById('detailWishlistBtn');
  const isActive = button?.classList.contains('btn-danger');

  try {
    const response = await fetch(`${API_BASE_URL}/wishlist/${isActive ? `remove/${currentProductId}` : 'add'}`, {
      method: isActive ? 'DELETE' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: isActive ? undefined : JSON.stringify({ productId: Number(currentProductId) })
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Khong the cap nhat yeu thich');
    }

    if (isActive) {
      toast.info('Da bo khoi yeu thich');
    } else {
      toast.success('Da them vao yeu thich');
    }

    loadWishlistStatus();
  } catch (error) {
    toast.error(error.message || 'Khong the cap nhat yeu thich');
  }
}

function saveRecentlyViewedProduct(product) {
  try {
    const stored = storage.get(RECENTLY_VIEWED_KEY);
    const currentList = Array.isArray(stored) ? stored : [];
    const currentId = Number(product.product_id || product.ProductId);
    if (!Number.isFinite(currentId)) {
      return;
    }

    const nextItem = {
      product_id: currentId,
      product_name: product.product_name || product.ProductName || 'San pham',
      price: Number(product.price || product.Price || 0),
      image_url: product.image_url || product.ImageUrl || '',
      viewedAt: new Date().toISOString()
    };

    const merged = [nextItem, ...currentList.filter((item) => Number(item.product_id) !== currentId)].slice(0, 8);
    storage.set(RECENTLY_VIEWED_KEY, merged);
  } catch (error) {
    console.warn('Cannot save recently viewed:', error.message);
  }
}

function renderRecentlyViewedProducts(currentId) {
  const section = document.getElementById('recentlyViewedSection');
  const container = document.getElementById('recentlyViewedList');
  if (!section || !container) {
    return;
  }

  const items = (storage.get(RECENTLY_VIEWED_KEY) || [])
    .filter((item) => Number(item.product_id) !== Number(currentId))
    .slice(0, 4);

  if (!items.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  container.innerHTML = items.map((item) => `
    <div class="col-6 col-md-3 mb-3">
      <a href="product-detail.html?id=${item.product_id}" class="text-decoration-none">
        <div class="card h-100 recently-viewed-card">
          <img src="${getImageUrl(item.image_url)}" class="card-img-top" alt="${item.product_name}" onerror="this.src='${getPlaceholderImage(300, 200, 'No image')}'">
          <div class="card-body p-2">
            <div class="small fw-semibold text-dark">${item.product_name}</div>
            <div class="text-primary small mt-1">${formatPrice(item.price)}</div>
          </div>
        </div>
      </a>
    </div>
  `).join('');
}

function decreaseQuantity() {
  const input = document.getElementById('quantity');
  if (input.value > 1) {
    input.value = parseInt(input.value) - 1;
  }
}

function increaseQuantity() {
  const input = document.getElementById('quantity');
  const max = parseInt(input.max);
  if (input.value < max) {
    input.value = parseInt(input.value) + 1;
  }
}

async function addToCart() {
  if (!requireAuth()) return;

  const quantity = parseInt(document.getElementById('quantity')?.value || 1, 10);
  const selectedVariant = getSelectedVariant();
  loading.show();

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/cart/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        productId: currentProductId,
        quantity: quantity,
        variantId: selectedVariant ? Number(selectedVariant.variant_id) : undefined
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
    console.error('Error:', error);
    toast.error(error.message);
  } finally {
    loading.hide();
  }
}

async function loadReviews() {
  try {
    const response = await fetch(`${API_BASE_URL}/reviews/product/${currentProductId}`);
    const data = await response.json();

    document.getElementById('reviewsSection').style.display = 'block';

    const token = localStorage.getItem('token');
    if (token) {
      document.getElementById('addReviewForm').style.display = 'block';
    }

    if (data.success && data.data && data.data.length > 0) {
      displayReviews(data.data);
    } else {
      document.getElementById('reviewsList').innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>Chưa có đánh giá nào cho sản phẩm này
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading reviews:', error);
  }
}

function displayReviews(reviews) {
  const container = document.getElementById('reviewsList');
  container.innerHTML = reviews.map(review => `
    <div class="card mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between">
          <h6 class="mb-1">${review.UserName || review.Username || 'Người dùng'}</h6>
          <small class="text-muted">${formatDate(review.CreatedAt || review.created_at)}</small>
        </div>
        <div class="mb-2">
          ${renderStars(review.Rating || review.rating)}
        </div>
        <p class="mb-0">${review.Comment || review.comment || ''}</p>
      </div>
    </div>
  `).join('');
}

function renderStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += `<i class="fas fa-star ${i <= rating ? 'text-warning' : 'text-muted'}"></i>`;
  }
  return stars;
}

function setupRatingStars() {
  const stars = document.querySelectorAll('.star-rating i');
  stars.forEach(star => {
    star.addEventListener('click', function() {
      selectedRating = parseInt(this.dataset.rating);
      document.getElementById('rating').value = selectedRating;
      
      stars.forEach((s, index) => {
        if (index < selectedRating) {
          s.classList.remove('far');
          s.classList.add('fas', 'text-warning');
        } else {
          s.classList.remove('fas', 'text-warning');
          s.classList.add('far');
        }
      });
    });
  });

  // Set all stars as selected by default
  stars.forEach(s => {
    s.classList.remove('far');
    s.classList.add('fas', 'text-warning');
  });
}

function setupReviewForm() {
  const form = document.getElementById('reviewForm');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      const token = localStorage.getItem('token');
      const rating = document.getElementById('rating').value;
      const comment = document.getElementById('comment').value;

      try {
        const response = await fetch(`${API_BASE_URL}/reviews`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            productId: currentProductId,
            rating: rating,
            comment: comment
          })
        });

        const data = await response.json();

        if (response.ok) {
          toast.success('Đánh giá của bạn đã được gửi!');
          document.getElementById('comment').value = '';
          setTimeout(() => loadReviews(), 1000);
        } else {
          toast.error(data.message || 'Không thể gửi đánh giá');
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Có lỗi xảy ra!');
      }
    });
  }
}

function showError(message) {
  document.getElementById('productDetailContainer').innerHTML = `
    <div class="alert alert-danger text-center">
      <i class="fas fa-exclamation-triangle fa-3x mb-3 d-block"></i>
      <h5>${message}</h5>
      <a href="products.html" class="btn btn-primary mt-3">
        <i class="fas fa-arrow-left me-2"></i>Quay lại danh sách sản phẩm
      </a>
    </div>
  `;
}

// Note: formatPrice, formatDate, showToast, updateCartBadge are now available from utils.js and auth.js

