/**
 * Wishlist Page JavaScript
 */

let wishlistItems = [];

document.addEventListener('DOMContentLoaded', function() {
  if (!requireAuth()) return;
  loadWishlist();
});

async function loadWishlist() {
  const token = localStorage.getItem('token');
  const container = document.getElementById('wishlistContainer');

  try {
    const response = await fetch(`${API_BASE_URL}/wishlist`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Khong the tai danh sach yeu thich');
    }

    wishlistItems = Array.isArray(data.data?.items) ? data.data.items : [];
    renderWishlist();
  } catch (error) {
    console.error('Load wishlist error:', error);
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger">${error.message || 'Khong the tai danh sach yeu thich'}</div>
      </div>
    `;
  }
}

function renderWishlist() {
  const container = document.getElementById('wishlistContainer');
  const emptyState = document.getElementById('emptyWishlist');
  const meta = document.getElementById('wishlistMetaText');

  if (meta) {
    meta.textContent = `Tong ${wishlistItems.length} san pham yeu thich`;
  }

  if (!wishlistItems.length) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = wishlistItems.map((item) => {
    const productId = Number(item.ProductId || item.product_id || item.productId);
    const productName = item.product_name || item.ProductName || 'San pham';
    const price = Number(item.price || item.Price || 0);
    const imageUrl = item.image_url || item.ImageUrl || '';
    const categoryName = item.category_name || item.CategoryName || 'Chua phan loai';

    return `
      <div class="col-md-4 col-lg-3 mb-4">
        <div class="card h-100 product-card">
          <img src="${getImageUrl(imageUrl)}" class="card-img-top" alt="${productName}" onerror="this.src='${getPlaceholderImage(300, 200, 'No image')}'">
          <div class="card-body d-flex flex-column">
            <h6 class="card-title">${productName}</h6>
            <small class="text-muted">${categoryName}</small>
            <div class="mt-auto pt-2">
              <div class="text-primary fw-bold mb-2">${formatPrice(price)}</div>
              <div class="d-grid gap-2">
                <a href="product-detail.html?id=${productId}" class="btn btn-outline-primary btn-sm">
                  <i class="fas fa-eye me-1"></i>Xem chi tiet
                </a>
                <button class="btn btn-primary btn-sm" onclick="addWishlistItemToCart(${productId})">
                  <i class="fas fa-cart-plus me-1"></i>Them vao gio
                </button>
                <button class="btn btn-outline-danger btn-sm" onclick="removeWishlistItem(${productId})">
                  <i class="fas fa-trash me-1"></i>Bo yeu thich
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function addWishlistItemToCart(productId) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_BASE_URL}/cart/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ productId: Number(productId), quantity: 1 })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Khong the them vao gio hang');
    }

    toast.success('Da them vao gio hang');
    updateCartBadge();
  } catch (error) {
    toast.error(error.message || 'Khong the them vao gio hang');
  }
}

async function removeWishlistItem(productId) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_BASE_URL}/wishlist/remove/${Number(productId)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Khong the xoa yeu thich');
    }

    wishlistItems = wishlistItems.filter((item) => Number(item.ProductId || item.product_id || item.productId) !== Number(productId));
    renderWishlist();
    toast.info('Da bo san pham khoi yeu thich');
  } catch (error) {
    toast.error(error.message || 'Khong the xoa yeu thich');
  }
}
