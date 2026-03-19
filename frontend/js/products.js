/**
 * Products Page JavaScript
 */

// State variables
let allProducts = [];
let currentPage = 1;
let totalPages = 1;
let totalCount = 0;
let perPage = 12;
let paginationMode = 'pages'; // 'pages' or 'loadmore'
let currentCategoryId = '';
let searchTerm = '';
let sortValue = 'name_asc';
let wishlistProductIds = new Set();
let quickViewModalInstance = null;
let quickViewState = {
  product: null,
  selectedVariantId: null
};

function renderProductPrice(product) {
  const finalPrice = Number(product.price || 0);
  const basePrice = Number(product.base_price ?? product.price ?? 0);
  const salePrice = Number(product.sale_price || 0);
  const isOnSale = Boolean(product.is_on_sale) || (salePrice > 0 && salePrice < basePrice);

  if (!isOnSale) {
    return `<span class="text-primary fw-bold fs-5">${formatPrice(finalPrice)}</span>`;
  }

  const discountPercent = Math.max(1, Math.round((1 - (finalPrice / basePrice)) * 100));
  return `
    <div class="d-flex flex-column align-items-start">
      <span class="text-danger fw-bold fs-5">${formatPrice(finalPrice)}</span>
      <small class="text-muted text-decoration-line-through">${formatPrice(basePrice)}</small>
      <span class="badge bg-danger-subtle text-danger-emphasis mt-1">-${discountPercent}%</span>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', async function() {
  loading.show();
  try {
    // Read category from URL before first fetch so initial data is filtered correctly.
    const urlParams = new URLSearchParams(window.location.search);
    currentCategoryId = urlParams.get('category') || '';

    await loadCategories();
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter && currentCategoryId) {
      categoryFilter.value = currentCategoryId;
    }

    await loadWishlistMap();

    await loadProducts();

    // Event listeners
    document.getElementById('searchInput')?.addEventListener('input', debounce(handleSearch, 300));
    document.getElementById('categoryFilter')?.addEventListener('change', handleCategoryChange);
    document.getElementById('sortSelect')?.addEventListener('change', handleSort);
    document.getElementById('resetFiltersBtn')?.addEventListener('click', resetFilters);
    
    // Pagination mode toggle
    document.querySelectorAll('input[name="paginationMode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        paginationMode = e.target.value;
        togglePaginationMode();
      });
    });
    
    // Load more button
    document.getElementById('loadMoreBtn')?.addEventListener('click', loadMoreProducts);

    const quickViewModalElement = document.getElementById('quickViewModal');
    if (quickViewModalElement && window.bootstrap?.Modal) {
      quickViewModalInstance = new bootstrap.Modal(quickViewModalElement);
    }
  } finally {
    loading.hide();
  }
});

async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE_URL}/categories`);
    const data = await response.json();
    
    if (data.success) {
      const categoryFilter = document.getElementById('categoryFilter');
      if (categoryFilter) {
        data.data.forEach(category => {
          const option = document.createElement('option');
          option.value = category.category_id;
          option.textContent = category.category_name;
          categoryFilter.appendChild(option);
        });
      }
    }
  } catch (error) {
    console.error('Error loading categories:', error);
    toast.error('Không thể tải danh mục');
  }
}

async function loadProducts(page = 1, append = false) {
  const container = document.getElementById('productsContainer');
  
  if (!append) {
    container.innerHTML = createSkeleton('card', 8);
  }
  
  try {
    let url = `${API_BASE_URL}/products?page=${page}&limit=${perPage}`;
    if (currentCategoryId) {
      url += `&categoryId=${currentCategoryId}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      if (append) {
        allProducts = [...allProducts, ...data.data];
      } else {
        allProducts = data.data;
      }
      
      currentPage = data.pagination.currentPage;
      totalPages = data.pagination.totalPages;
      totalCount = data.pagination.total;
      perPage = data.pagination.perPage;
      
      displayProducts(append);
      updatePaginationUI();
      updateProductsMeta(productsToDisplayCount());
    } else {
      throw new Error(data.message || 'Không thể tải sản phẩm');
    }
  } catch (error) {
    console.error('Error loading products:', error);
    toast.error('Không thể tải sản phẩm');
    container.innerHTML = `
      <div class="col-12 text-center empty-state">
        <i class="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i>
        <h5 class="text-muted">Không thể tải sản phẩm</h5>
        <p class="text-muted">Vui lòng thử lại sau</p>
        <button class="btn btn-primary" onclick="location.reload()">
          <i class="fas fa-redo me-2"></i>Tải lại
        </button>
      </div>
    `;
  }
}

async function loadWishlistMap() {
  wishlistProductIds = new Set();

  const token = localStorage.getItem('token');
  if (!token) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/wishlist`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return;
    }

    const items = Array.isArray(data.data?.items) ? data.data.items : [];
    wishlistProductIds = new Set(items.map((item) => Number(item.ProductId || item.product_id || item.productId)).filter(Number.isFinite));
  } catch (error) {
    console.warn('Không thể tải wishlist:', error.message);
  }
}

function isProductWishlisted(productId) {
  return wishlistProductIds.has(Number(productId));
}

async function toggleWishlist(productId) {
  const token = localStorage.getItem('token');
  if (!token) {
    toast.warning('Vui lòng đăng nhập để lưu sản phẩm yêu thích');
    return;
  }

  const numericProductId = Number(productId);
  if (!Number.isFinite(numericProductId) || numericProductId < 1) {
    toast.error('Sản phẩm không hợp lệ');
    return;
  }

  try {
    const exists = isProductWishlisted(numericProductId);
    const response = await fetch(`${API_BASE_URL}/wishlist/${exists ? `remove/${numericProductId}` : 'add'}`, {
      method: exists ? 'DELETE' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: exists ? undefined : JSON.stringify({ productId: numericProductId })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Không thể cập nhật yêu thích');
    }

    if (exists) {
      wishlistProductIds.delete(numericProductId);
      toast.info('Đã bỏ khỏi yêu thích');
    } else {
      wishlistProductIds.add(numericProductId);
      toast.success('Đã thêm vào yêu thích');
    }

    filterAndDisplay();
  } catch (error) {
    toast.error(error.message || 'Không thể cập nhật yêu thích');
  }
}

function productsToDisplayCount() {
  if (searchTerm) {
    return allProducts.filter((product) => {
      return product.product_name.toLowerCase().includes(searchTerm)
        || (product.description && product.description.toLowerCase().includes(searchTerm));
    }).length;
  }

  return allProducts.length;
}

function handleSearch() {
  searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
  filterAndDisplay();
}

function handleCategoryChange() {
  currentCategoryId = document.getElementById('categoryFilter')?.value || '';

  const url = new URL(window.location.href);
  if (currentCategoryId) {
    url.searchParams.set('category', currentCategoryId);
  } else {
    url.searchParams.delete('category');
  }
  window.history.replaceState({}, '', url.toString());

  currentPage = 1;
  allProducts = [];
  loadProducts(1, false);
}

function handleSort() {
  sortValue = document.getElementById('sortSelect')?.value || 'name_asc';
  filterAndDisplay();
}

function resetFilters() {
  currentCategoryId = '';
  searchTerm = '';
  sortValue = 'name_asc';
  currentPage = 1;

  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const sortSelect = document.getElementById('sortSelect');

  if (searchInput) searchInput.value = '';
  if (categoryFilter) categoryFilter.value = '';
  if (sortSelect) sortSelect.value = 'name_asc';

  const url = new URL(window.location.href);
  url.searchParams.delete('category');
  window.history.replaceState({}, '', url.toString());

  loadProducts(1, false);
}

function filterAndDisplay() {
  let filtered = [...allProducts];
  
  // Apply search filter
  if (searchTerm) {
    filtered = filtered.filter(product => 
      product.product_name.toLowerCase().includes(searchTerm) ||
      (product.description && product.description.toLowerCase().includes(searchTerm))
    );
  }
  
  // Apply sorting
  switch(sortValue) {
    case 'name_asc':
      filtered.sort((a, b) => a.product_name.localeCompare(b.product_name));
      break;
    case 'name_desc':
      filtered.sort((a, b) => b.product_name.localeCompare(a.product_name));
      break;
    case 'price_asc':
      filtered.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      filtered.sort((a, b) => b.price - a.price);
      break;
  }
  
  displayProducts(false, filtered);
  updateProductsMeta(filtered.length);
}

function displayProducts(append = false, productsToShow = null) {
  const container = document.getElementById('productsContainer');
  const emptyState = document.getElementById('emptyState');
  const products = productsToShow || allProducts;

  if (products.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    updateProductsMeta(0);
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  
  const productsHTML = products.map(product => `
    <div class="col-md-4 col-lg-3 mb-4 page-transition">
      <div class="card h-100 product-card">
        <button
          type="button"
          class="btn btn-sm product-favorite-btn ${isProductWishlisted(product.product_id) ? 'active' : ''}"
          onclick="toggleWishlist(${product.product_id})"
          title="Luu vao yeu thich"
        >
          <i class="${isProductWishlisted(product.product_id) ? 'fas' : 'far'} fa-heart"></i>
        </button>
        <div class="product-image-wrapper">
          <img src="${getImageUrl(product.image_url)}" 
           class="card-img-top lazy" 
               alt="${product.product_name}"
           loading="lazy"
           decoding="async"
           onload="this.classList.add('loaded')"
               onerror="this.onerror=null; this.src='${getPlaceholderImage(300, 200, 'Lỗi tải ảnh')}'">
        </div>
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${product.product_name}</h5>
          <p class="card-text text-muted small">${product.description ? product.description.substring(0, 60) + '...' : 'Không có mô tả'}</p>
          <div class="mt-auto">
            <div class="d-flex justify-content-between align-items-center mb-2">
              ${renderProductPrice(product)}
              ${product.stock_quantity > 0 
                ? `<span class="badge bg-success"><i class="fas fa-check me-1"></i>${product.stock_quantity}</span>` 
                : `<span class="badge bg-danger"><i class="fas fa-times me-1"></i>Hết hàng</span>`}
            </div>
            <div class="d-grid gap-2">
              <a href="product-detail.html?id=${product.product_id}" class="btn btn-outline-primary btn-sm">
                <i class="fas fa-info-circle me-1"></i>Chi tiết
              </a>
              <button class="btn btn-outline-secondary btn-sm" onclick="openQuickView(${product.product_id})">
                <i class="fas fa-eye me-1"></i>Xem nhanh
              </button>
              ${product.stock_quantity > 0 
                ? `<button class="btn btn-primary btn-sm" onclick="addToCart(${product.product_id})">
                    <i class="fas fa-cart-plus me-1"></i>Thêm vào giỏ
                  </button>` 
                : `<button class="btn btn-secondary btn-sm" disabled>
                    <i class="fas fa-times me-1"></i>Hết hàng
                  </button>`}
            </div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
  
  if (append) {
    container.innerHTML += productsHTML;
  } else {
    container.innerHTML = productsHTML;
  }

  updateProductsMeta(products.length);
}

function updateProductsMeta(visibleCount) {
  const metaElement = document.getElementById('productsMetaText');
  if (!metaElement) return;

  const categoryLabel = currentCategoryId
    ? document.querySelector(`#categoryFilter option[value="${currentCategoryId}"]`)?.textContent || 'Đã chọn danh mục'
    : 'Tất cả danh mục';

  if (visibleCount === 0) {
    metaElement.textContent = `Không có sản phẩm phù hợp | Danh mục: ${categoryLabel}`;
    return;
  }

  metaElement.textContent = `Hiển thị ${visibleCount} sản phẩm | Danh mục: ${categoryLabel}`;
}

function updatePaginationUI() {
  const paginationContainer = document.getElementById('paginationContainer');
  const paginationInfo = document.getElementById('paginationInfo');
  const paginationList = document.getElementById('paginationList');
  
  if (totalCount === 0) {
    paginationContainer.style.display = 'none';
    return;
  }
  
  paginationContainer.style.display = 'flex';
  
  // Update info
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalCount);
  paginationInfo.textContent = `Hiển thị ${startItem}-${endItem} / ${totalCount} sản phẩm`;
  
  // Update pagination based on mode
  if (paginationMode === 'pages') {
    renderPagination();
  } else {
    renderLoadMore();
  }
}

function renderPagination() {
  const paginationList = document.getElementById('paginationList');
  paginationList.innerHTML = '';
  
  // Previous button
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}"><i class="fas fa-chevron-left"></i></a>`;
  paginationList.appendChild(prevLi);
  
  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  // First page
  if (startPage > 1) {
    const firstLi = document.createElement('li');
    firstLi.className = 'page-item';
    firstLi.innerHTML = `<a class="page-link" href="#" data-page="1">1</a>`;
    paginationList.appendChild(firstLi);
    
    if (startPage > 2) {
      const dotsLi = document.createElement('li');
      dotsLi.className = 'page-item disabled';
      dotsLi.innerHTML = `<span class="page-link">...</span>`;
      paginationList.appendChild(dotsLi);
    }
  }
  
  // Page numbers
  for (let i = startPage; i <= endPage; i++) {
    const pageLi = document.createElement('li');
    pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
    pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
    paginationList.appendChild(pageLi);
  }
  
  // Last page
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dotsLi = document.createElement('li');
      dotsLi.className = 'page-item disabled';
      dotsLi.innerHTML = `<span class="page-link">...</span>`;
      paginationList.appendChild(dotsLi);
    }
    
    const lastLi = document.createElement('li');
    lastLi.className = 'page-item';
    lastLi.innerHTML = `<a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>`;
    paginationList.appendChild(lastLi);
  }
  
  // Next button
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
  nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}"><i class="fas fa-chevron-right"></i></a>`;
  paginationList.appendChild(nextLi);
  
  // Add click events
  paginationList.querySelectorAll('a.page-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = parseInt(e.currentTarget.dataset.page);
      if (page && page !== currentPage) {
        goToPage(page);
      }
    });
  });
}

function renderLoadMore() {
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  
  if (currentPage < totalPages) {
    loadMoreBtn.style.display = 'block';
    loadMoreBtn.disabled = false;
  } else {
    loadMoreBtn.style.display = 'none';
  }
}

function togglePaginationMode() {
  const pageNumbers = document.getElementById('pageNumbers');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  
  if (paginationMode === 'pages') {
    pageNumbers.style.display = 'block';
    loadMoreBtn.style.display = 'none';
    
    // Reload from page 1 if in load more mode before
    if (allProducts.length > perPage) {
      currentPage = 1;
      allProducts = [];
      loadProducts(1, false);
    } else {
      renderPagination();
    }
  } else {
    pageNumbers.style.display = 'none';
    renderLoadMore();
  }
}

function goToPage(page) {
  if (page < 1 || page > totalPages) return;
  
  loading.show();
  currentPage = page;
  loadProducts(page, false).finally(() => {
    loading.hide();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

async function loadMoreProducts() {
  if (currentPage >= totalPages) return;
  
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  loadMoreBtn.disabled = true;
  loadMoreBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang tải...';
  
  try {
    const nextPage = currentPage + 1;
    const container = document.getElementById('productsContainer');
    
    let url = `${API_BASE_URL}/products?page=${nextPage}&limit=${perPage}`;
    if (currentCategoryId) {
      url += `&categoryId=${currentCategoryId}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success && data.data.length > 0) {
      // Chỉ thêm những sản phẩm mới
      const newProducts = data.data;
      
      // Render CHỈ những sản phẩm mới
      const newProductsHTML = newProducts.map(product => `
        <div class="col-md-4 col-lg-3 mb-4 page-transition">
          <div class="card h-100 product-card">
            <div class="product-image-wrapper">
              <img src="${getImageUrl(product.image_url)}" 
                   class="card-img-top lazy" 
                   alt="${product.product_name}"
                   loading="lazy"
                   decoding="async"
                   onload="this.classList.add('loaded')"
                   onerror="this.onerror=null; this.src='${getPlaceholderImage(300, 200, 'Lỗi tải ảnh')}'">
            </div>
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">${product.product_name}</h5>
              <p class="card-text text-muted small">${product.description ? product.description.substring(0, 60) + '...' : 'Không có mô tả'}</p>
              <div class="mt-auto">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  ${renderProductPrice(product)}
                  ${product.stock_quantity > 0 
                    ? `<span class="badge bg-success"><i class="fas fa-check me-1"></i>${product.stock_quantity}</span>` 
                    : `<span class="badge bg-danger"><i class="fas fa-times me-1"></i>Hết hàng</span>`}
                </div>
                <div class="d-grid gap-2">
                  <a href="product-detail.html?id=${product.product_id}" class="btn btn-outline-primary btn-sm">
                    <i class="fas fa-info-circle me-1"></i>Chi tiết
                  </a>
                  <button class="btn btn-outline-secondary btn-sm" onclick="openQuickView(${product.product_id})">
                    <i class="fas fa-eye me-1"></i>Xem nhanh
                  </button>
                  ${product.stock_quantity > 0 
                    ? `<button class="btn btn-primary btn-sm" onclick="addToCart(${product.product_id})">
                        <i class="fas fa-cart-plus me-1"></i>Thêm vào giỏ
                      </button>` 
                    : `<button class="btn btn-secondary btn-sm" disabled>
                        <i class="fas fa-times me-1"></i>Hết hàng
                      </button>`}
                </div>
              </div>
            </div>
          </div>
        </div>
      `).join('');
      
      // Append chỉ những HTML mới
      container.innerHTML += newProductsHTML;
      
      // Cập nhật currentPage
      currentPage = nextPage;
      
      // Cập nhật pagination
      updatePaginationUI();
    }
  } catch (error) {
    console.error('Error loading more products:', error);
    toast.error('Không thể tải thêm sản phẩm');
  } finally {
    loadMoreBtn.disabled = false;
    loadMoreBtn.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Xem thêm sản phẩm';
  }
}

async function addToCart(productId) {
  return addToCartWithOptions(productId, 1, null);
}

async function addToCartWithOptions(productId, quantity = 1, variantId = null) {
  if (!requireAuth()) return;

  loading.show();
  try {
    const token = localStorage.getItem('token');
    const payload = {
      productId,
      quantity: Number(quantity) || 1
    };

    if (Number.isFinite(Number(variantId)) && Number(variantId) > 0) {
      payload.variantId = Number(variantId);
    }

    const response = await fetch(`${API_BASE_URL}/cart/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
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

function onQuickViewVariantChange(value) {
  quickViewState.selectedVariantId = value ? Number(value) : null;

  const pricing = getQuickViewCurrentPricing();
  const image = document.getElementById('quickViewImage');
  const priceArea = document.getElementById('quickViewPriceArea');
  const stockBadge = document.getElementById('quickViewStockBadge');
  const addButton = document.getElementById('quickViewAddBtn');

  if (image) {
    image.src = getImageUrl(pricing.image);
  }

  if (priceArea) {
    priceArea.innerHTML = renderQuickViewPrice(pricing.finalPrice, pricing.basePrice, pricing.salePrice);
  }

  if (stockBadge) {
    stockBadge.className = `badge ${pricing.stock > 0 ? 'bg-success' : 'bg-danger'}`;
    stockBadge.textContent = pricing.stock > 0 ? `Con ${pricing.stock} san pham` : 'Het hang';
  }

  if (addButton) {
    addButton.disabled = pricing.stock <= 0;
  }
}

function renderQuickViewPrice(finalPrice, basePrice = null, salePrice = null) {
  const finalValue = Number(finalPrice || 0);
  const baseValue = Number(basePrice ?? finalPrice ?? 0);
  const saleValue = Number(salePrice || 0);
  const isOnSale = saleValue > 0 && saleValue < baseValue;

  if (!isOnSale) {
    return `<span class="text-primary fw-bold fs-4">${formatPrice(finalValue)}</span>`;
  }

  const discountPercent = Math.max(1, Math.round((1 - (finalValue / baseValue)) * 100));
  return `
    <div class="d-flex flex-column">
      <span class="text-danger fw-bold fs-4">${formatPrice(finalValue)}</span>
      <small class="text-muted text-decoration-line-through">${formatPrice(baseValue)}</small>
      <span class="badge bg-danger-subtle text-danger-emphasis mt-1" style="width: fit-content;">-${discountPercent}%</span>
    </div>
  `;
}

function getQuickViewSelectedVariant() {
  const product = quickViewState.product;
  if (!product || !Array.isArray(product.variants)) {
    return null;
  }

  const selectedId = Number(quickViewState.selectedVariantId);
  if (!Number.isFinite(selectedId) || selectedId <= 0) {
    return null;
  }

  return product.variants.find((item) => Number(item.variant_id) === selectedId) || null;
}

function getQuickViewCurrentPricing() {
  const product = quickViewState.product;
  if (!product) {
    return {
      finalPrice: 0,
      basePrice: 0,
      salePrice: 0,
      stock: 0,
      image: ''
    };
  }

  const variant = getQuickViewSelectedVariant();
  if (variant) {
    return {
      finalPrice: Number(variant.price || 0),
      basePrice: Number(variant.price || 0),
      salePrice: 0,
      stock: Number(variant.stock || 0),
      image: variant.image_url || product.image_url
    };
  }

  return {
    finalPrice: Number(product.price || 0),
    basePrice: Number(product.base_price ?? product.price ?? 0),
    salePrice: Number(product.sale_price || 0),
    stock: Number(product.stock_quantity || 0),
    image: product.image_url
  };
}

function renderQuickViewModalBody() {
  const body = document.getElementById('quickViewModalBody');
  const product = quickViewState.product;
  if (!body || !product) {
    return;
  }

  const pricing = getQuickViewCurrentPricing();
  const variants = Array.isArray(product.variants) ? product.variants : [];

  body.innerHTML = `
    <div class="row g-3">
      <div class="col-md-5">
        <img
          id="quickViewImage"
          src="${getImageUrl(pricing.image)}"
          class="img-fluid rounded border"
          alt="${product.product_name}"
          onerror="this.onerror=null; this.src='${getPlaceholderImage(420, 320, 'No image')}'"
        >
      </div>
      <div class="col-md-7">
        <h4 class="mb-2">${product.product_name}</h4>
        <p class="text-muted small mb-2">${product.description ? product.description.substring(0, 160) : 'San pham noi bat cua LumiCart.'}</p>
        <div class="mb-3" id="quickViewPriceArea">${renderQuickViewPrice(pricing.finalPrice, pricing.basePrice, pricing.salePrice)}</div>

        ${variants.length ? `
          <div class="mb-3">
            <label class="form-label fw-semibold">Chon bien the</label>
            <select class="form-select" id="quickViewVariantSelect" onchange="onQuickViewVariantChange(this.value)">
              <option value="">San pham chinh</option>
              ${variants.map((variant) => {
                const variantId = Number(variant.variant_id);
                const stock = Number(variant.stock || 0);
                const selected = quickViewState.selectedVariantId === variantId ? 'selected' : '';
                return `<option value="${variantId}" ${selected}>${variant.variant_name} - ${formatPrice(variant.price)}${stock > 0 ? ` (Con ${stock})` : ' (Het hang)'}</option>`;
              }).join('')}
            </select>
          </div>
        ` : ''}

        <div class="d-flex align-items-center justify-content-between">
          <span class="badge ${pricing.stock > 0 ? 'bg-success' : 'bg-danger'}" id="quickViewStockBadge">
            ${pricing.stock > 0 ? `Con ${pricing.stock} san pham` : 'Het hang'}
          </span>
          <button
            class="btn btn-primary"
            id="quickViewAddBtn"
            ${pricing.stock > 0 ? '' : 'disabled'}
            onclick="addQuickViewToCart()"
          >
            <i class="fas fa-cart-plus me-1"></i>Them vao gio
          </button>
        </div>
      </div>
    </div>
  `;
}

async function openQuickView(productId) {
  try {
    const body = document.getElementById('quickViewModalBody');
    if (body) {
      body.innerHTML = '<div class="text-center py-4 text-muted">Dang tai du lieu...</div>';
    }

    if (quickViewModalInstance) {
      quickViewModalInstance.show();
    }

    const response = await fetch(`${API_BASE_URL}/products/${productId}`);
    const data = await response.json();
    if (!response.ok || !data.success || !data.data) {
      throw new Error(data.message || 'Khong tai duoc thong tin san pham');
    }

    quickViewState.product = data.data;
    quickViewState.selectedVariantId = null;
    renderQuickViewModalBody();
  } catch (error) {
    const body = document.getElementById('quickViewModalBody');
    if (body) {
      body.innerHTML = `<div class="alert alert-danger mb-0">${error.message || 'Khong the mo xem nhanh'}</div>`;
    }
  }
}

async function addQuickViewToCart() {
  const product = quickViewState.product;
  if (!product) {
    return;
  }

  const variant = getQuickViewSelectedVariant();
  await addToCartWithOptions(product.product_id, 1, variant ? variant.variant_id : null);
}

window.openQuickView = openQuickView;
window.onQuickViewVariantChange = onQuickViewVariantChange;
window.addQuickViewToCart = addQuickViewToCart;
