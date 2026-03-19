/**
 * Orders Page JavaScript
 */

let allOrders = [];
let currentStatus = '';
let orderSearchTerm = '';
let orderSortValue = 'date_desc';
let cancelOrderModalInstance = null;

function normalizeOrderStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  const statusMap = {
    'pending': 'pending',
    'chờ xác nhận': 'pending',
    'confirmed': 'confirmed',
    'đã xác nhận': 'confirmed',
    'shipping': 'shipping',
    'đang giao': 'shipping',
    'completed': 'completed',
    'hoàn thành': 'completed',
    'cancelled': 'cancelled',
    'đã hủy': 'cancelled',
    'return_requested': 'return_requested',
    'yêu cầu trả hàng': 'return_requested',
    'returned_shipping': 'returned_shipping',
    'đã gửi trả hàng': 'returned_shipping',
    'returned_approved': 'returned_approved',
    'đã hoàn trả': 'returned_approved',
    'returned_rejected': 'returned_rejected',
    'từ chối hoàn trả': 'returned_rejected'
  };

  return statusMap[normalized] || normalized;
}

document.addEventListener('DOMContentLoaded', function() {
  checkAuth();
  setupToolbar();
  setupCancelOrderModal();
  loadOrders();
  setupTabs();
});

function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Bạn cần đăng nhập để xem đơn hàng!');
    window.location.href = 'login.html';
  }
}

function setupTabs() {
  const tabs = document.querySelectorAll('#orderTabs .nav-link');
  tabs.forEach(tab => {
    tab.addEventListener('click', function(e) {
      e.preventDefault();
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      currentStatus = this.dataset.status;
      displayOrders();
    });
  });
}

function setupToolbar() {
  document.getElementById('orderSearchInput')?.addEventListener('input', (event) => {
    orderSearchTerm = String(event.target.value || '').trim().toLowerCase();
    displayOrders();
  });

  document.getElementById('orderSortSelect')?.addEventListener('change', (event) => {
    orderSortValue = event.target.value || 'date_desc';
    displayOrders();
  });

  document.getElementById('refreshOrdersBtn')?.addEventListener('click', loadOrders);
}

function setupCancelOrderModal() {
  const modalEl = document.getElementById('cancelOrderModal');
  const form = document.getElementById('cancelOrderForm');

  if (!modalEl || !form) {
    return;
  }

  cancelOrderModalInstance = new bootstrap.Modal(modalEl);
  form.addEventListener('submit', submitCancelOrder);

  modalEl.addEventListener('hidden.bs.modal', () => {
    form.reset();
    const submitBtn = document.getElementById('submitCancelOrderBtn');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-check me-1"></i>Xác nhận hủy đơn';
    }
  });
}

async function loadOrders() {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_BASE_URL}/orders/history`, {
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
      allOrders = data.data || [];
      updateOrderSummary();
      displayOrders();
    }
  } catch (error) {
    console.error('Error loading orders:', error);
    showError('Không thể tải đơn hàng');
  }
}

function displayOrders() {
  const container = document.getElementById('ordersContainer');
  const emptyOrders = document.getElementById('emptyOrders');

  let filteredOrders = allOrders;
  if (currentStatus) {
    filteredOrders = allOrders.filter(order => normalizeOrderStatus(order.Status) === currentStatus);
  }

  if (orderSearchTerm) {
    filteredOrders = filteredOrders.filter((order) => {
      const orderIdText = `#${order.OrderId}`.toLowerCase();
      const addressText = String(order.ShippingAddress || '').toLowerCase();
      return orderIdText.includes(orderSearchTerm) || addressText.includes(orderSearchTerm);
    });
  }

  const sorters = {
    date_desc: (a, b) => new Date(b.OrderDate) - new Date(a.OrderDate),
    date_asc: (a, b) => new Date(a.OrderDate) - new Date(b.OrderDate),
    amount_desc: (a, b) => Number(b.TotalAmount || 0) - Number(a.TotalAmount || 0),
    amount_asc: (a, b) => Number(a.TotalAmount || 0) - Number(b.TotalAmount || 0)
  };

  const sorter = sorters[orderSortValue] || sorters.date_desc;
  filteredOrders = [...filteredOrders].sort(sorter);

  if (filteredOrders.length === 0) {
    container.innerHTML = '';
    const title = currentStatus || orderSearchTerm
      ? 'Không có đơn hàng phù hợp bộ lọc'
      : 'Chưa có đơn hàng nào';
    const subtitle = currentStatus || orderSearchTerm
      ? 'Hãy đổi trạng thái hoặc từ khóa tìm kiếm để thử lại.'
      : 'Bạn chưa đặt đơn hàng nào';

    const emptyTitle = emptyOrders.querySelector('h4');
    const emptyText = emptyOrders.querySelector('p');
    if (emptyTitle) emptyTitle.textContent = title;
    if (emptyText) emptyText.textContent = subtitle;
    emptyOrders.style.display = 'block';
    return;
  }

  emptyOrders.style.display = 'none';
  container.innerHTML = filteredOrders.map(order => `
    <div class="card mb-3">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <strong>Đơn hàng #${order.OrderId}</strong>
          <span class="ms-3 text-muted">
            <i class="far fa-calendar-alt me-1"></i>${formatDate(order.OrderDate)}
          </span>
        </div>
        <div>
          ${getStatusBadge(order.Status)}
        </div>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-8">
            <p class="mb-2">
              <i class="fas fa-map-marker-alt me-2 text-muted"></i>
              <strong>Địa chỉ:</strong> ${order.ShippingAddress || 'Chưa cập nhật'}
            </p>
            <p class="mb-2">
              <i class="fas fa-money-bill-wave me-2 text-muted"></i>
              <strong>Tổng tiền:</strong> 
              <span class="text-primary fw-bold">${formatPrice(order.TotalAmount)}</span>
            </p>
          </div>
          <div class="col-md-4 text-end">
            <button class="btn btn-outline-primary btn-sm" onclick="viewOrderDetail(${order.OrderId})">
              <i class="fas fa-eye me-1"></i>Xem chi tiết
            </button>
            ${normalizeOrderStatus(order.Status) === 'pending' ? `
              <button class="btn btn-outline-danger btn-sm mt-2" onclick="openCancelOrderModal(${order.OrderId})">
                <i class="fas fa-times me-1"></i>Hủy đơn
              </button>
            ` : ''}
            ${normalizeOrderStatus(order.Status) === 'completed' ? `
              <button class="btn btn-outline-warning btn-sm mt-2" onclick="requestReturn(${order.OrderId})">
                <i class="fas fa-rotate-left me-1"></i>Yêu cầu trả hàng
              </button>
            ` : ''}
            ${normalizeOrderStatus(order.Status) === 'return_requested' ? `
              <button class="btn btn-outline-info btn-sm mt-2" onclick="confirmReturnShipped(${order.OrderId})">
                <i class="fas fa-box-open me-1"></i>Tôi đã gửi hàng trả
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function updateOrderSummary() {
  const countByStatus = {
    pending: 0,
    shipping: 0,
    completed: 0
  };

  allOrders.forEach((order) => {
    const key = normalizeOrderStatus(order.Status);
    if (Object.prototype.hasOwnProperty.call(countByStatus, key)) {
      countByStatus[key] += 1;
    }
  });

  const sumAll = document.getElementById('sumAllOrders');
  const sumPending = document.getElementById('sumPendingOrders');
  const sumShipping = document.getElementById('sumShippingOrders');
  const sumCompleted = document.getElementById('sumCompletedOrders');

  if (sumAll) sumAll.textContent = allOrders.length;
  if (sumPending) sumPending.textContent = countByStatus.pending;
  if (sumShipping) sumShipping.textContent = countByStatus.shipping;
  if (sumCompleted) sumCompleted.textContent = countByStatus.completed;
}

function getStatusBadge(status) {
  const statusConfig = {
    'pending': { label: 'Chờ xác nhận', class: 'warning' },
    'confirmed': { label: 'Đã xác nhận', class: 'info' },
    'shipping': { label: 'Đang giao', class: 'primary' },
    'completed': { label: 'Hoàn thành', class: 'success' },
    'cancelled': { label: 'Đã hủy', class: 'danger' },
    'return_requested': { label: 'Yêu cầu trả hàng', class: 'warning' },
    'returned_shipping': { label: 'Đã gửi trả hàng', class: 'info' },
    'returned_approved': { label: 'Đã hoàn trả', class: 'success' },
    'returned_rejected': { label: 'Từ chối hoàn trả', class: 'danger' }
  };

  const normalizedStatus = normalizeOrderStatus(status);
  const config = statusConfig[normalizedStatus] || { label: status, class: 'secondary' };
  return `<span class="badge bg-${config.class}">${config.label}</span>`;
}

async function viewOrderDetail(orderId) {
  const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
  modal.show();

  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      displayOrderDetail(data.data);
    } else {
      document.getElementById('orderDetailContent').innerHTML = `
        <div class="alert alert-danger">Không thể tải chi tiết đơn hàng</div>
      `;
    }
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('orderDetailContent').innerHTML = `
      <div class="alert alert-danger">Có lỗi xảy ra!</div>
    `;
  }
}

function displayOrderDetail(order) {
  const content = document.getElementById('orderDetailContent');
  const paymentText = String(order.PaymentMethod || '').toLowerCase() === 'bank_transfer'
    ? 'Chuyển khoản ngân hàng'
    : 'Thanh toán khi nhận hàng (COD)';
  const returnStatus = normalizeOrderStatus(order.Status);
  const cancelInfoBlock = returnStatus === 'cancelled'
    ? `
      <div class="alert alert-secondary">
        <div><strong>Lý do hủy đơn:</strong> ${order.CancelReason || 'Không có ghi chú'}</div>
        ${order.CancelledAt ? `<div><strong>Thời gian hủy:</strong> ${formatDate(order.CancelledAt)}</div>` : ''}
      </div>
    `
    : '';
  const returnInfoBlock = ['return_requested', 'returned_shipping', 'returned_approved', 'returned_rejected'].includes(returnStatus)
    ? `
      <div class="alert alert-info">
        <div><strong>Lý do trả hàng:</strong> ${order.ReturnReason || 'Không có ghi chú'}</div>
        <div><strong>Shop xử lý:</strong> ${order.ReturnDecisionReason || 'Đang chờ shop xử lý'}</div>
        <div><strong>Trạng thái hoàn tiền:</strong> ${order.RefundStatus || 'pending'}</div>
        ${order.RefundAmount ? `<div><strong>Số tiền hoàn:</strong> ${formatPrice(order.RefundAmount)}</div>` : ''}
      </div>
    `
    : '';
  
  content.innerHTML = `
    <div class="mb-4">
      <div class="row">
        <div class="col-md-6">
          <p><strong>Mã đơn hàng:</strong> #${order.OrderId}</p>
          <p><strong>Ngày đặt:</strong> ${formatDate(order.OrderDate)}</p>
          <p><strong>Trạng thái:</strong> ${getStatusBadge(order.Status)}</p>
        </div>
        <div class="col-md-6">
          <p><strong>Địa chỉ giao hàng:</strong><br>${order.ShippingAddress || 'Chưa cập nhật'}</p>
          <p><strong>Phương thức thanh toán:</strong> ${paymentText}</p>
          ${order.CouponCode ? `<p><strong>Mã giảm giá:</strong> ${order.CouponCode}</p>` : ''}
          ${Number(order.DiscountAmount || 0) > 0 ? `<p><strong>Giảm giá:</strong> <span class="text-success">-${formatPrice(order.DiscountAmount)}</span></p>` : ''}
        </div>
      </div>
    </div>

  ${cancelInfoBlock}

    ${returnInfoBlock}

    <h6 class="mb-3">Sản phẩm đã đặt:</h6>
    <div class="table-responsive">
      <table class="table table-bordered">
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th class="text-center">Số lượng</th>
            <th class="text-end">Đơn giá</th>
            <th class="text-end">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${order.Items && order.Items.length > 0 ? order.Items.map(item => `
            <tr>
              <td>
                <div>${item.ProductName || 'Sản phẩm'}</div>
                ${item.VariantName ? `<small class="text-muted">Phan loai: ${item.VariantName}</small>` : ''}
              </td>
              <td class="text-center">${item.Quantity}</td>
              <td class="text-end">${formatPrice(item.Price)}</td>
              <td class="text-end">${formatPrice(item.Price * item.Quantity)}</td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="4" class="text-center text-muted">Không có thông tin chi tiết sản phẩm</td>
            </tr>
          `}
        </tbody>
        <tfoot>
          <tr>
            <th colspan="3" class="text-end">Tổng cộng:</th>
            <th class="text-end text-primary">${formatPrice(order.TotalAmount)}</th>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

function openCancelOrderModal(orderId) {
  const orderIdInput = document.getElementById('cancelOrderIdInput');
  const reasonInput = document.getElementById('cancelReasonInput');

  if (!orderIdInput || !reasonInput || !cancelOrderModalInstance) {
    showToast('Không thể mở form hủy đơn', 'danger');
    return;
  }

  orderIdInput.value = String(orderId);
  reasonInput.focus();
  cancelOrderModalInstance.show();
}

async function submitCancelOrder(event) {
  event.preventDefault();

  const orderIdInput = document.getElementById('cancelOrderIdInput');
  const reasonInput = document.getElementById('cancelReasonInput');
  const submitBtn = document.getElementById('submitCancelOrderBtn');

  const orderId = Number(orderIdInput?.value || 0);
  const reason = String(reasonInput?.value || '').trim();

  if (!Number.isInteger(orderId) || orderId <= 0) {
    showToast('Không xác định được đơn hàng cần hủy', 'danger');
    return;
  }

  if (reason.length < 5) {
    showToast('Lý do hủy đơn phải tối thiểu 5 ký tự', 'warning');
    return;
  }

  if (reason.length > 500) {
    showToast('Lý do hủy đơn không được vượt quá 500 ký tự', 'warning');
    return;
  }

  const token = localStorage.getItem('token');

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Đang xử lý...';
    }

    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });

    const data = await response.json();

    if (response.ok) {
      showToast('Đơn hàng đã được hủy', 'success');
      cancelOrderModalInstance?.hide();
      await loadOrders();
    } else {
      showToast(data.message || 'Không thể hủy đơn hàng', 'danger');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check me-1"></i>Xác nhận hủy đơn';
      }
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Có lỗi xảy ra!', 'danger');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-check me-1"></i>Xác nhận hủy đơn';
    }
  }
}

async function requestReturn(orderId) {
  const reason = prompt('Nhập lý do trả hàng (tối thiểu 10 ký tự):');
  if (reason === null) {
    return;
  }

  const trimmed = String(reason || '').trim();
  if (trimmed.length < 10) {
    showToast('Lý do trả hàng phải tối thiểu 10 ký tự', 'warning');
    return;
  }

  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/request-return`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason: trimmed })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Không thể gửi yêu cầu trả hàng');
    }

    showToast('Đã gửi yêu cầu trả hàng thành công', 'success');
    await loadOrders();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function confirmReturnShipped(orderId) {
  if (!confirm('Xác nhận bạn đã gửi hàng trả về shop?')) {
    return;
  }

  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/return-shipped`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Không thể xác nhận gửi trả hàng');
    }

    showToast('Đã xác nhận gửi trả hàng, shop sẽ kiểm tra sớm', 'success');
    await loadOrders();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showError(message) {
  document.getElementById('ordersContainer').innerHTML = `
    <div class="alert alert-danger">
      <i class="fas fa-exclamation-triangle me-2"></i>${message}
    </div>
  `;
}

function showToast(message, type) {
  if (typeof window.toast !== 'undefined' && window.toast) {
    const map = {
      success: 'success',
      danger: 'error',
      warning: 'warning',
      info: 'info'
    };
    const method = map[type] || 'info';
    if (typeof window.toast[method] === 'function') {
      window.toast[method](message);
      return;
    }
  }

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
  const bootstrapToast = new bootstrap.Toast(toastElement);
  bootstrapToast.show();
  
  setTimeout(() => toastElement.remove(), 3000);
}
