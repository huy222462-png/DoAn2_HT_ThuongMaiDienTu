/**
 * Cart Page JavaScript
 */

let cartItems = [];
let checkoutState = {
  profile: null,
  paymentMethod: 'cod',
  couponCode: '',
  pricing: {
    subtotal: 0,
    discountAmount: 0,
    finalAmount: 0,
    couponCode: null,
    couponDescription: null
  }
};
let checkoutModalInstance = null;
let relatedProducts = [];

const BANK_TRANSFER_INFO = (window.APP_CONFIG && window.APP_CONFIG.bankTransfer) || {
  bankName: 'Vietcombank',
  bankCode: '970436',
  accountNo: '0123456789',
  accountName: 'ECOMMERCE STORE',
  bankLink: 'https://vcbdigibank.vietcombank.com.vn/'
};

function getSafePlaceholderImage(width, height, text) {
  if (typeof getPlaceholderImage === 'function') {
    return getPlaceholderImage(width, height, text);
  }

  // Fallback khi utils.js chưa được nạp.
  const safeText = String(text || 'No image')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#e9ecef"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6c757d" font-size="14">${safeText}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

document.addEventListener('DOMContentLoaded', function() {
  checkAuth();
  setupCheckoutModal();
  loadCart();
});

function setupCheckoutModal() {
  const modalEl = document.getElementById('checkoutModal');
  if (modalEl) {
    checkoutModalInstance = new bootstrap.Modal(modalEl);
  }

  document.getElementById('applyCouponBtn')?.addEventListener('click', applyCouponCode);
  document.getElementById('clearCouponBtn')?.addEventListener('click', clearCouponCode);
  document.getElementById('confirmCheckoutBtn')?.addEventListener('click', submitCheckoutOrder);
  document.getElementById('copyBankTransferBtn')?.addEventListener('click', copyBankTransferContent);

  document.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
    radio.addEventListener('change', (event) => {
      checkoutState.paymentMethod = event.target.value;
      renderPaymentMethodNote();
    });
  });
}

function getBankTransferContent() {
  const timestampPart = String(Date.now()).slice(-8);
  const phoneTail = String(checkoutState.profile?.phone || '').replace(/\D/g, '').slice(-4) || '0000';
  return `TMDT-${phoneTail}-${timestampPart}`;
}

function buildBankQrUrl(amount, transferContent) {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  const bankCode = encodeURIComponent(BANK_TRANSFER_INFO.bankCode);
  const accountNo = encodeURIComponent(BANK_TRANSFER_INFO.accountNo);
  const accountName = encodeURIComponent(BANK_TRANSFER_INFO.accountName);
  const addInfo = encodeURIComponent(transferContent);
  return `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${safeAmount}&addInfo=${addInfo}&accountName=${accountName}`;
}

async function copyBankTransferContent() {
  const transferContent = getBankTransferContent();
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(transferContent);
      showToast('Da sao chep noi dung chuyen khoan', 'success');
      return;
    }
  } catch (error) {
    console.warn('Clipboard write failed, fallback to prompt', error);
  }

  window.prompt('Sao chep noi dung chuyen khoan:', transferContent);
}

function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Bạn cần đăng nhập để xem giỏ hàng!');
    window.location.href = 'login.html';
  }
}

async function loadCart() {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_BASE_URL}/cart`, {
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

    if (data.success) {
      // Backend trả về data.data.items
      cartItems = data.data.items || data.data || [];
      displayCart();
      await loadRelatedProducts();
    }
  } catch (error) {
    console.error('Error loading cart:', error);
    showError('Không thể tải giỏ hàng');
  }
}

function displayCart() {
  const container = document.getElementById('cartItemsContainer');
  const emptyCart = document.getElementById('emptyCart');
  const cartSummary = document.getElementById('cartSummary');
  const relatedSection = document.getElementById('relatedProductsSection');

  if (cartItems.length === 0) {
    container.innerHTML = '';
    emptyCart.style.display = 'block';
    cartSummary.style.display = 'none';
    if (relatedSection) {
      relatedSection.style.display = 'none';
    }
    return;
  }

  emptyCart.style.display = 'none';
  cartSummary.style.display = 'block';

  container.innerHTML = cartItems.map(item => `
    <div class="card mb-3">
      <div class="card-body">
        <div class="row align-items-center">
          <div class="col-md-2">
            <img src="${getImageUrl(item.ImageUrl || item.image_url)}" 
                 class="img-fluid rounded" 
                 alt="${item.ProductName || item.product_name}"
                onerror="this.src='${getSafePlaceholderImage(100, 100, 'Lỗi tải')}'">
          </div>
          <div class="col-md-4">
            <h5 class="mb-1">${item.ProductName}</h5>
            ${item.VariantName ? `<div class="small text-muted">Phan loai: ${item.VariantName}</div>` : ''}
            <p class="text-muted mb-0">${formatPrice(item.Price)}</p>
          </div>
          <div class="col-md-3">
            <div class="input-group input-group-sm">
              <button class="btn btn-outline-secondary" type="button" onclick="updateQuantity(${item.CartId}, ${item.Quantity - 1})">
                <i class="fas fa-minus"></i>
              </button>
              <input type="number" class="form-control text-center" value="${item.Quantity}" readonly>
              <button class="btn btn-outline-secondary" type="button" onclick="updateQuantity(${item.CartId}, ${item.Quantity + 1})">
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>
          <div class="col-md-2 text-end">
            <strong class="text-primary">${formatPrice(item.Price * item.Quantity)}</strong>
          </div>
          <div class="col-md-1 text-end">
            <button class="btn btn-danger btn-sm" onclick="removeFromCart(${item.CartId})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  updateSummary();
  updateCartBadge();
}

async function loadRelatedProducts() {
  const section = document.getElementById('relatedProductsSection');
  const container = document.getElementById('relatedProductsContainer');
  const token = localStorage.getItem('token');

  if (!section || !container) {
    return;
  }

  if (!cartItems.length || !token) {
    section.style.display = 'none';
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/cart/recommendations`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Không thể tải sản phẩm gợi ý');
    }

    relatedProducts = Array.isArray(data.data) ? data.data : [];
    renderRelatedProducts();
  } catch (error) {
    console.warn('Related products error:', error.message);
    section.style.display = 'none';
  }
}

function renderRelatedProducts() {
  const section = document.getElementById('relatedProductsSection');
  const container = document.getElementById('relatedProductsContainer');
  if (!section || !container) {
    return;
  }

  if (!relatedProducts.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  container.innerHTML = relatedProducts.map((product) => `
    <div class="col-md-4 col-lg-3 mb-3">
      <div class="card h-100 related-product-card">
        <img
          src="${getImageUrl(product.image_url)}"
          class="card-img-top"
          alt="${product.product_name}"
          onerror="this.src='${getSafePlaceholderImage(300, 200, 'No image')}'"
        >
        <div class="card-body d-flex flex-column">
          <h6 class="card-title mb-1">${product.product_name}</h6>
          <small class="text-muted mb-2">${product.category_name || 'San pham lien quan'}</small>
          <div class="mt-auto d-flex justify-content-between align-items-center">
            <strong class="text-primary">${formatPrice(product.price)}</strong>
            <button class="btn btn-sm btn-outline-primary" onclick="addRelatedToCart(${product.product_id})">
              <i class="fas fa-cart-plus me-1"></i>Them
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

async function addRelatedToCart(productId) {
  const token = localStorage.getItem('token');
  if (!token) {
    showToast('Vui lòng đăng nhập để thêm vào giỏ hàng', 'warning');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/cart/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        productId: Number(productId),
        quantity: 1
      })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Không thể thêm sản phẩm gợi ý');
    }

    showToast('Đã thêm sản phẩm gợi ý vào giỏ hàng', 'success');
    await loadCart();
  } catch (error) {
    showToast(error.message || 'Có lỗi xảy ra', 'danger');
  }
}

function updateSummary() {
  const subtotal = cartItems.reduce((sum, item) => sum + (item.Price * item.Quantity), 0);
  const shipping = subtotal > 0 ? 30000 : 0; // 30,000 VND shipping fee
  const discountAmount = Number(checkoutState.pricing?.discountAmount || 0);
  const total = Math.max(0, subtotal - discountAmount) + shipping;

  document.getElementById('subtotal').textContent = formatPrice(subtotal);
  document.getElementById('shipping').textContent = formatPrice(shipping);
  document.getElementById('discount').textContent = `-${formatPrice(discountAmount)}`;
  document.getElementById('total').textContent = formatPrice(total);
}

async function updateQuantity(cartId, newQuantity) {
  if (newQuantity < 1) return;

  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${API_BASE_URL}/cart/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        cartId: cartId,
        quantity: newQuantity
      })
    });

    const data = await response.json();

    if (response.ok) {
      loadCart();
    } else {
      showToast(data.message || 'Không thể cập nhật số lượng', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Có lỗi xảy ra!', 'danger');
  }
}

async function removeFromCart(cartId) {
  if (!confirm('Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?')) {
    return;
  }

  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${API_BASE_URL}/cart/remove/${cartId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'success');
      loadCart();
    } else {
      showToast(data.message || 'Không thể xóa sản phẩm', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Có lỗi xảy ra!', 'danger');
  }
}

async function checkout() {
  if (cartItems.length === 0) {
    showToast('Giỏ hàng trống!', 'warning');
    return;
  }

  const token = localStorage.getItem('token');
  
  try {
    // Lấy thông tin user để có địa chỉ và phone
    const userResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!userResponse.ok) {
      showToast('Không thể lấy thông tin tài khoản', 'danger');
      return;
    }

    const userData = await userResponse.json();
    const user = userData.data;

    console.log('👤 User data from profile:', user);
    console.log('📍 Address:', user.address, '(length:', user.address ? user.address.length : 0, ')');
    console.log('📞 Phone:', user.phone, '(length:', user.phone ? user.phone.length : 0, ')');

    // Kiểm tra user có địa chỉ và phone chưa
    if (!user.address || !user.phone) {
      console.log('❌ Missing address or phone:', { address: user.address, phone: user.phone });
      showToast('Vui lòng cập nhật địa chỉ và số điện thoại trong trang Hồ sơ trước khi đặt hàng!', 'warning');
      setTimeout(() => {
        window.location.href = 'profile.html';
      }, 2000);
      return;
    }

    checkoutState.profile = user;

    const selectedPayment = checkoutState.paymentMethod || 'cod';
    const selectedRadio = document.querySelector(`input[name="paymentMethod"][value="${selectedPayment}"]`);
    if (selectedRadio) {
      selectedRadio.checked = true;
    } else {
      checkoutState.paymentMethod = 'cod';
      const paymentCod = document.getElementById('paymentCod');
      if (paymentCod) {
        paymentCod.checked = true;
      }
    }

    document.getElementById('checkoutAddress').value = user.address || '';
    document.getElementById('checkoutPhone').value = user.phone || '';
    document.getElementById('couponCodeInput').value = checkoutState.couponCode || '';

    renderPaymentMethodNote();
    await refreshCheckoutPricing();

    if (checkoutModalInstance) {
      checkoutModalInstance.show();
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Có lỗi xảy ra!', 'danger');
  }
}

function renderPaymentMethodNote() {
  const note = document.getElementById('bankTransferNote');
  if (!note) return;

  const isBankTransfer = checkoutState.paymentMethod === 'bank_transfer';
  note.style.display = isBankTransfer ? 'block' : 'none';

  if (!isBankTransfer) {
    return;
  }

  const transferContent = getBankTransferContent();
  const amount = Number(checkoutState.pricing?.finalAmount || 0);

  const bankNameEl = document.getElementById('bankNameText');
  const accountNoEl = document.getElementById('bankAccountNoText');
  const accountNameEl = document.getElementById('bankAccountNameText');
  const transferContentEl = document.getElementById('bankTransferContent');
  const bankLinkEl = document.getElementById('bankTransferLink');
  const qrImgEl = document.getElementById('bankQrImage');

  if (bankNameEl) bankNameEl.textContent = BANK_TRANSFER_INFO.bankName;
  if (accountNoEl) accountNoEl.textContent = BANK_TRANSFER_INFO.accountNo;
  if (accountNameEl) accountNameEl.textContent = BANK_TRANSFER_INFO.accountName;
  if (transferContentEl) transferContentEl.textContent = transferContent;
  if (bankLinkEl) bankLinkEl.href = BANK_TRANSFER_INFO.bankLink;
  if (qrImgEl) {
    qrImgEl.src = buildBankQrUrl(amount, transferContent);
  }
}

async function applyCouponCode() {
  const input = document.getElementById('couponCodeInput');
  const code = String(input?.value || '').trim().toUpperCase();
  checkoutState.couponCode = code;
  await refreshCheckoutPricing();
}

async function clearCouponCode() {
  checkoutState.couponCode = '';
  const input = document.getElementById('couponCodeInput');
  if (input) {
    input.value = '';
  }
  await refreshCheckoutPricing();
}

async function refreshCheckoutPricing() {
  const token = localStorage.getItem('token');
  const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.Price) * Number(item.Quantity)), 0);

  try {
    const response = await fetch(`${API_BASE_URL}/orders/preview-pricing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        couponCode: checkoutState.couponCode || null
      })
    });

    const data = await response.json();
    if (!response.ok) {
      checkoutState.pricing = {
        subtotal,
        discountAmount: 0,
        finalAmount: subtotal,
        couponCode: null,
        couponDescription: null
      };

      if (checkoutState.couponCode) {
        const couponResult = document.getElementById('couponResultText');
        if (couponResult) {
          couponResult.textContent = data.message || 'Mã giảm giá không hợp lệ';
          couponResult.classList.add('text-danger');
        }
      }
    } else {
      checkoutState.pricing = data.data || {
        subtotal,
        discountAmount: 0,
        finalAmount: subtotal,
        couponCode: null,
        couponDescription: null
      };

      const couponResult = document.getElementById('couponResultText');
      if (couponResult) {
        if (checkoutState.pricing.couponCode) {
          couponResult.textContent = `Đã áp dụng ${checkoutState.pricing.couponCode}: ${checkoutState.pricing.couponDescription || ''}`;
          couponResult.classList.remove('text-danger');
          couponResult.classList.add('text-success');
        } else {
          couponResult.textContent = 'Nhập mã giảm giá rồi bấm "Áp dụng".';
          couponResult.classList.remove('text-danger', 'text-success');
        }
      }
    }
  } catch (error) {
    checkoutState.pricing = {
      subtotal,
      discountAmount: 0,
      finalAmount: subtotal,
      couponCode: null,
      couponDescription: null
    };
    const couponResult = document.getElementById('couponResultText');
    if (couponResult) {
      couponResult.textContent = 'Không thể kiểm tra mã giảm giá lúc này';
      couponResult.classList.add('text-danger');
    }
  }

  document.getElementById('checkoutSubtotal').textContent = formatPrice(checkoutState.pricing.subtotal || subtotal);
  document.getElementById('checkoutDiscount').textContent = `-${formatPrice(checkoutState.pricing.discountAmount || 0)}`;
  document.getElementById('checkoutFinal').textContent = formatPrice(checkoutState.pricing.finalAmount || subtotal);
  renderPaymentMethodNote();
  updateSummary();
}

async function submitCheckoutOrder() {
  if (!checkoutState.profile) {
    showToast('Thiếu thông tin người nhận, vui lòng thử lại', 'warning');
    return;
  }

  const token = localStorage.getItem('token');
  const payload = {
    shippingAddress: checkoutState.profile.address,
    phone: checkoutState.profile.phone,
    paymentMethod: checkoutState.paymentMethod,
    couponCode: checkoutState.couponCode || null
  };

  try {
    const response = await fetch(`${API_BASE_URL}/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Không thể đặt hàng');
    }

    if (checkoutModalInstance) {
      checkoutModalInstance.hide();
    }
    checkoutState.couponCode = '';
    checkoutState.pricing = {
      subtotal: 0,
      discountAmount: 0,
      finalAmount: 0,
      couponCode: null,
      couponDescription: null
    };

    showToast('Đặt hàng thành công!', 'success');
    setTimeout(() => {
      window.location.href = 'orders.html';
    }, 1200);
  } catch (error) {
    showToast(error.message || 'Có lỗi xảy ra!', 'danger');
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price);
}

function showError(message) {
  document.getElementById('cartItemsContainer').innerHTML = `
    <div class="alert alert-danger">
      <i class="fas fa-exclamation-triangle me-2"></i>${message}
    </div>
  `;
}

function showToast(message, type) {
  const toastHtml = `
    <div class="toast align-items-center text-white bg-${type} border-0" role="alert" style="position: fixed; top: 80px; right: 20px; z-index: 9999;">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', toastHtml);
  const toastElement = document.body.lastElementChild;
  const toast = new bootstrap.Toast(toastElement);
  toast.show();
  
  setTimeout(() => toastElement.remove(), 3000);
}

async function updateCartBadge() {
  const token = localStorage.getItem('token');
  if (!token) return;

  const totalItems = cartItems.reduce((sum, item) => sum + item.Quantity, 0);
  document.getElementById('cartBadge').textContent = totalItems;
}
