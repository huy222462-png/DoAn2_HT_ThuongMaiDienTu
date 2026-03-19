/**
 * Admin Dashboard Script
 */

const VIETNAMESE_STATUS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  return_requested: 'Yêu cầu trả hàng',
  returned_shipping: 'Đã gửi trả hàng',
  returned_approved: 'Đã hoàn trả',
  returned_rejected: 'Từ chối hoàn trả'
};

let adminState = {
  stats: null,
  orders: [],
  products: [],
  users: [],
  categories: [],
  productModal: null,
  editingProductId: null,
  editingVariants: [],
  revenueView: 'day',
  revenueChart: null
};

function initAdminReveal() {
  const elements = document.querySelectorAll('.reveal-on-scroll');
  if (!elements.length) return;

  // Fallback: luôn hiển thị để tránh trạng thái bị "che" khi observer không chạy.
  elements.forEach((element) => {
    element.classList.add('is-visible');
  });

  if (typeof IntersectionObserver !== 'function') {
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -30px 0px'
  });

  elements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index * 35, 180)}ms`;
    observer.observe(element);
  });
}

function normalizeStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  const map = {
    pending: 'pending',
    'chờ xác nhận': 'pending',
    confirmed: 'confirmed',
    'đã xác nhận': 'confirmed',
    shipping: 'shipping',
    'đang giao': 'shipping',
    completed: 'completed',
    'hoàn thành': 'completed',
    cancelled: 'cancelled',
    'đã hủy': 'cancelled',
    return_requested: 'return_requested',
    'yêu cầu trả hàng': 'return_requested',
    returned_shipping: 'returned_shipping',
    'đã gửi trả hàng': 'returned_shipping',
    returned_approved: 'returned_approved',
    'đã hoàn trả': 'returned_approved',
    returned_rejected: 'returned_rejected',
    'từ chối hoàn trả': 'returned_rejected'
  };

  return map[normalized] || normalized;
}

function displayStatusBadge(status) {
  const key = normalizeStatus(status);
  const color = {
    pending: 'warning',
    confirmed: 'info',
    shipping: 'primary',
    completed: 'success',
    cancelled: 'danger',
    return_requested: 'warning',
    returned_shipping: 'info',
    returned_approved: 'success',
    returned_rejected: 'danger'
  }[key] || 'secondary';

  return `<span class="badge bg-${color}">${VIETNAMESE_STATUS[key] || status}</span>`;
}

function formatCurrencyVnd(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(Number(value) || 0);
}

async function apiAdmin(path, options = {}) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Yeu cau that bai');
  }

  return data;
}

async function loadOverview() {
  const filter = document.getElementById('revenueViewFilter');
  const selectedRevenueView = filter?.value || adminState.revenueView || 'day';

  const data = await apiAdmin(`/admin/statistics?revenueView=${encodeURIComponent(selectedRevenueView)}`);
  adminState.stats = data.data || {};
  adminState.revenueView = adminState.stats.revenueView || selectedRevenueView;

  if (filter && filter.value !== adminState.revenueView) {
    filter.value = adminState.revenueView;
  }

  const overview = adminState.stats.overview || {};
  document.getElementById('kpiRevenue').textContent = formatCurrencyVnd(overview.revenue);
  document.getElementById('kpiOrders').textContent = overview.orderCount || 0;
  document.getElementById('kpiProducts').textContent = overview.productCount || 0;
  document.getElementById('kpiUsers').textContent = overview.userCount || 0;

  const revenueRows = adminState.stats.revenueSeries || adminState.stats.last7Days || [];
  renderRevenueTable(revenueRows, adminState.revenueView);
  renderRevenueBarChart(revenueRows, adminState.revenueView);
  renderTopProducts(adminState.stats.topProducts || []);
}

function formatRevenuePeriodLabel(row, revenueView) {
  if (!row) return '-';

  const label = row.PeriodLabel || row.period_label || row.period || row.Date || row.date;
  if (label) {
    const text = String(label);
    if (revenueView === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const [year, month, day] = text.split('-');
      return `${day}/${month}/${year}`;
    }
    return text;
  }

  const rawDate = row.SortDate || row.Date || row.date;
  if (rawDate) {
    return new Date(rawDate).toLocaleDateString('vi-VN');
  }

  return '-';
}

function updateRevenueHeaderByView(revenueView) {
  const title = document.getElementById('revenueCardTitle');
  const periodHeader = document.getElementById('revenuePeriodHeader');
  const map = {
    day: {
      title: 'Doanh thu theo ngay (30 ngay gan nhat)',
      periodHeader: 'Ngay'
    },
    month: {
      title: 'Doanh thu theo thang (12 thang gan nhat)',
      periodHeader: 'Thang'
    },
    quarter: {
      title: 'Doanh thu theo quy (8 quy gan nhat)',
      periodHeader: 'Quy'
    }
  };

  const current = map[revenueView] || map.day;
  if (title) {
    title.innerHTML = `<i class="fas fa-calendar-alt me-2"></i>${current.title}`;
  }
  if (periodHeader) {
    periodHeader.textContent = current.periodHeader;
  }
}

function renderRevenueTable(rows, revenueView = 'day') {
  updateRevenueHeaderByView(revenueView);

  const body = document.querySelector('#revenueTable tbody');
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Chua co du lieu doanh thu</td></tr>';
    return;
  }

  body.innerHTML = rows.map((row) => {
    return `
      <tr>
        <td>${formatRevenuePeriodLabel(row, revenueView)}</td>
        <td>${row.OrderCount || 0}</td>
        <td class="text-end fw-semibold">${formatCurrencyVnd(row.Revenue)}</td>
      </tr>
    `;
  }).join('');

  applyTableStagger('#revenueTable tbody tr');
}

function renderRevenueBarChart(rows, revenueView = 'day') {
  const chartCanvas = document.getElementById('revenueBarChart');
  if (!chartCanvas || typeof Chart === 'undefined') {
    return;
  }

  const labels = rows.map((row) => formatRevenuePeriodLabel(row, revenueView));
  const revenues = rows.map((row) => Number(row.Revenue) || 0);

  if (adminState.revenueChart) {
    adminState.revenueChart.destroy();
    adminState.revenueChart = null;
  }

  adminState.revenueChart = new Chart(chartCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Doanh thu (VND)',
          data: revenues,
          backgroundColor: 'rgba(18, 146, 130, 0.35)',
          borderColor: 'rgba(18, 146, 130, 0.95)',
          borderWidth: 1.5,
          borderRadius: 6,
          maxBarThickness: 42
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => ` ${formatCurrencyVnd(context.parsed.y || 0)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => {
              const numeric = Number(value) || 0;
              if (numeric >= 1000000000) return `${(numeric / 1000000000).toFixed(1)}B`;
              if (numeric >= 1000000) return `${(numeric / 1000000).toFixed(1)}M`;
              if (numeric >= 1000) return `${(numeric / 1000).toFixed(0)}K`;
              return `${numeric}`;
            }
          }
        },
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8
          }
        }
      }
    }
  });
}

function renderTopProducts(rows) {
  const container = document.getElementById('topProductsList');
  if (!rows.length) {
    container.innerHTML = '<p class="text-muted mb-0">Chua co du lieu ban hang.</p>';
    return;
  }

  container.innerHTML = rows.map((item) => {
    const image = getImageUrl(item.ImageUrl || item.image_url);
    return `
      <div class="d-flex align-items-center mb-3">
        <img src="${image}" alt="${item.ProductName || item.product_name}" class="rounded me-3 lazy" style="width: 44px; height: 44px; object-fit: cover;" loading="lazy" decoding="async" onload="this.classList.add('loaded')">
        <div class="flex-grow-1">
          <div class="fw-semibold">${item.ProductName || item.product_name}</div>
          <small class="text-muted">Da ban: ${item.TotalSold || 0}</small>
        </div>
      </div>
    `;
  }).join('');
}

async function loadOrders() {
  const data = await apiAdmin('/admin/orders');
  adminState.orders = data.data || [];
  renderOrdersTable();
}

function renderOrdersTable() {
  const filter = document.getElementById('orderStatusFilter').value;
  const tbody = document.querySelector('#ordersTable tbody');
  const rows = adminState.orders.filter((order) => {
    return filter === 'all' ? true : normalizeStatus(order.Status) === filter;
  });

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Khong co don hang phu hop</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((order) => {
    const statusKey = normalizeStatus(order.Status);
    const actionButtons = [];

    if (statusKey === 'pending') {
      actionButtons.push(`<button class="btn btn-sm btn-success" onclick="quickConfirmOrder(${order.OrderId})"><i class="fas fa-check me-1"></i>Xac nhan</button>`);
    }

    if (statusKey === 'returned_shipping') {
      actionButtons.push(`<button class="btn btn-sm btn-success" onclick="processReturn(${order.OrderId}, 'approve', ${Number(order.TotalAmount || 0)})"><i class="fas fa-money-bill-transfer me-1"></i>Duyet hoan tien</button>`);
      actionButtons.push(`<button class="btn btn-sm btn-outline-danger" onclick="processReturn(${order.OrderId}, 'reject', ${Number(order.TotalAmount || 0)})"><i class="fas fa-ban me-1"></i>Tu choi</button>`);
    }

    if (!actionButtons.length) {
      actionButtons.push('<span class="text-muted small">Da xu ly</span>');
    }

    return `
      <tr>
        <td>#${order.OrderId}</td>
        <td>
          <div class="fw-semibold">${order.FullName || 'Khach hang'}</div>
          <small class="text-muted">${order.Email || ''}</small>
        </td>
        <td>${new Date(order.OrderDate).toLocaleString('vi-VN')}</td>
        <td class="fw-semibold">${formatCurrencyVnd(order.TotalAmount)}</td>
        <td>${displayStatusBadge(order.Status)}</td>
        <td>
          <div class="d-flex gap-2 align-items-center">
            ${actionButtons.join('')}
            <select class="form-select form-select-sm" onchange="changeOrderStatus(${order.OrderId}, this.value)">
              <option value="">Doi trang thai</option>
              <option value="Chờ xác nhận">Cho xac nhan</option>
              <option value="Đã xác nhận">Da xac nhan</option>
              <option value="Đang giao">Dang giao</option>
              <option value="Hoàn thành">Hoan thanh</option>
              <option value="Yêu cầu trả hàng">Yeu cau tra hang</option>
              <option value="Đã gửi trả hàng">Da gui tra hang</option>
              <option value="Đã hoàn trả">Da hoan tra</option>
              <option value="Từ chối hoàn trả">Tu choi hoan tra</option>
              <option value="Đã hủy">Da huy</option>
            </select>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  applyTableStagger('#ordersTable tbody tr');
}

async function quickConfirmOrder(orderId) {
  try {
    loading.show();
    await apiAdmin(`/admin/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'Đã xác nhận' })
    });
    toast.success('Da xac nhan don hang');
    await loadOrders();
    await loadOverview();
  } catch (error) {
    toast.error(error.message);
  } finally {
    loading.hide();
  }
}

async function changeOrderStatus(orderId, status) {
  if (!status) return;
  try {
    loading.show();
    await apiAdmin(`/admin/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    toast.success('Cap nhat trang thai thanh cong');
    await loadOrders();
    await loadOverview();
  } catch (error) {
    toast.error(error.message);
  } finally {
    loading.hide();
  }
}

async function processReturn(orderId, action, maxAmount) {
  const note = prompt(action === 'approve' ? 'Ghi chu duyet hoan tra (khong bat buoc):' : 'Ly do tu choi hoan tra:') || '';
  let refundAmount = null;

  if (action === 'approve') {
    const value = prompt(`Nhap so tien hoan (0 - ${maxAmount}):`, String(maxAmount));
    if (value === null) {
      return;
    }

    refundAmount = Number(value);
    if (!Number.isFinite(refundAmount) || refundAmount < 0 || refundAmount > Number(maxAmount)) {
      toast.error('So tien hoan khong hop le');
      return;
    }
  }

  try {
    loading.show();
    await apiAdmin(`/admin/orders/${orderId}/process-return`, {
      method: 'PUT',
      body: JSON.stringify({
        action,
        decisionReason: note,
        refundAmount
      })
    });

    toast.success(action === 'approve' ? 'Da duyet hoan tra va hoan tien' : 'Da tu choi hoan tra');
    await loadOrders();
    await loadOverview();
  } catch (error) {
    toast.error(error.message);
  } finally {
    loading.hide();
  }
}

async function loadCategories() {
  const response = await fetch(`${API_BASE_URL}/categories`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Khong tai duoc danh muc');
  }
  adminState.categories = data.data || [];
  renderCategoryOptions();
}

function renderCategoryOptions() {
  const select = document.getElementById('productCategoryInput');
  select.innerHTML = adminState.categories.map((cat) => {
    return `<option value="${cat.category_id}">${cat.category_name}</option>`;
  }).join('');
}

async function loadProducts() {
  const response = await fetch(`${API_BASE_URL}/products?page=1&limit=500`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Khong tai duoc san pham');
  }

  adminState.products = data.data || [];
  renderProductsTable();
  renderLowStock();
}

async function loadUsers() {
  const data = await apiAdmin('/admin/users');
  adminState.users = data.data || [];
  renderUsersTable();
}

function renderUsersTable() {
  const tbody = document.querySelector('#usersTable tbody');

  if (!adminState.users.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Khong co nguoi dung</td></tr>';
    return;
  }

  tbody.innerHTML = adminState.users.map((user) => {
    const isAdminUser = !!user.IsAdmin;
    const isLocked = !!user.IsLocked;

    return `
      <tr>
        <td>
          <div class="fw-semibold">${user.FullName || user.Username || 'Nguoi dung'}</div>
          <small class="text-muted">${user.Email || ''}</small>
        </td>
        <td>${isAdminUser ? '<span class="badge bg-danger">Admin</span>' : '<span class="badge bg-secondary">User</span>'}</td>
        <td>${isLocked ? '<span class="badge bg-warning text-dark">Dang bi khoa</span>' : '<span class="badge bg-success">Dang hoat dong</span>'}</td>
        <td>
          ${isAdminUser ? '<span class="text-muted small">Khong thao tac</span>' : `
            <button class="btn btn-sm ${isLocked ? 'btn-outline-success' : 'btn-outline-warning'}" onclick="toggleUserLock(${user.UserId}, ${isLocked ? 'false' : 'true'})">
              <i class="fas ${isLocked ? 'fa-unlock' : 'fa-lock'} me-1"></i>${isLocked ? 'Mo khoa' : 'Khoa'}
            </button>
          `}
        </td>
      </tr>
    `;
  }).join('');

  applyTableStagger('#usersTable tbody tr');
}

async function toggleUserLock(userId, shouldLock) {
  try {
    loading.show();
    await apiAdmin(`/admin/users/${userId}/toggle-lock`, {
      method: 'PUT',
      body: JSON.stringify({ isLocked: shouldLock })
    });
    toast.success(shouldLock ? 'Da khoa tai khoan' : 'Da mo khoa tai khoan');
    await loadUsers();
  } catch (error) {
    toast.error(error.message);
  } finally {
    loading.hide();
  }
}

function renderLowStock() {
  const container = document.getElementById('lowStockList');
  const lowStock = adminState.products.filter((p) => Number(p.stock_quantity) <= 10);

  if (!lowStock.length) {
    container.innerHTML = '<p class="text-muted mb-0">Khong co san pham ton kho thap.</p>';
    return;
  }

  container.innerHTML = lowStock.slice(0, 8).map((item) => {
    return `
      <div class="d-flex justify-content-between border-bottom py-2">
        <span>${item.product_name}</span>
        <span class="badge bg-warning text-dark">${item.stock_quantity}</span>
      </div>
    `;
  }).join('');
}

function applyTableStagger(selector) {
  const rows = document.querySelectorAll(selector);
  rows.forEach((row, index) => {
    row.classList.add('table-row-reveal');
    row.style.animationDelay = `${Math.min(index * 35, 280)}ms`;
  });
}

function setupAdminTabsPersistence() {
  const tabButtons = document.querySelectorAll('#adminTabs [data-bs-toggle="pill"]');
  const storageKey = 'admin.activeTab';

  tabButtons.forEach((button) => {
    button.addEventListener('shown.bs.tab', (event) => {
      const target = event.target.getAttribute('data-bs-target');
      if (target) {
        localStorage.setItem(storageKey, target);
      }
    });
  });

  const savedTab = localStorage.getItem(storageKey);
  if (!savedTab) return;

  const targetButton = document.querySelector(`#adminTabs [data-bs-target="${savedTab}"]`);
  if (targetButton) {
    const tab = new bootstrap.Tab(targetButton);
    tab.show();
  }
}

function setupAdminKeyboardShortcuts() {
  document.addEventListener('keydown', (event) => {
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if (event.key === '/' && !isTyping) {
      event.preventDefault();
      const input = document.getElementById('productSearchInput');
      if (input) {
        input.focus();
        input.select();
      }
    }
  });
}

function renderProductsTable() {
  const query = (document.getElementById('productSearchInput').value || '').toLowerCase().trim();
  const tbody = document.querySelector('#productsTable tbody');

  const rows = adminState.products.filter((item) => {
    if (!query) return true;
    const text = `${item.product_name} ${item.category_name || ''}`.toLowerCase();
    return text.includes(query);
  });

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Khong co san pham phu hop</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((item) => {
    const variantCount = Array.isArray(item.variants) ? item.variants.length : 0;
    const finalPrice = Number(item.price || 0);
    const basePrice = Number(item.base_price ?? item.price ?? 0);
    const salePrice = Number(item.sale_price || 0);
    const isOnSale = Boolean(item.is_on_sale) || (salePrice > 0 && salePrice < basePrice);
    const priceHtml = isOnSale
      ? `<div class="d-flex flex-column align-items-end"><span class="text-danger fw-semibold">${formatCurrencyVnd(finalPrice)}</span><small class="text-muted text-decoration-line-through">${formatCurrencyVnd(basePrice)}</small></div>`
      : `<span>${formatCurrencyVnd(finalPrice)}</span>`;

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <img src="${getImageUrl(item.image_url)}" alt="${item.product_name}" style="width: 42px; height: 42px; object-fit: cover;" class="rounded lazy" loading="lazy" decoding="async" onload="this.classList.add('loaded')">
            <div>
              <div class="fw-semibold">${item.product_name}</div>
              <small class="text-muted">ID: ${item.product_id}</small>
              ${variantCount > 0 ? `<div><span class="badge bg-info-subtle text-info-emphasis">${variantCount} bien the</span></div>` : ''}
            </div>
          </div>
        </td>
        <td>${item.category_name || 'Chua phan loai'}</td>
        <td class="text-end">${priceHtml}</td>
        <td class="text-center">${item.stock_quantity}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="openEditProduct(${item.product_id})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-outline-secondary ms-1" onclick="duplicateProduct(${item.product_id})" title="Nhan ban san pham">
            <i class="fas fa-copy"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteProduct(${item.product_id})">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  applyTableStagger('#productsTable tbody tr');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildVariantRow(variant = {}) {
  const variantName = escapeHtml(variant.variant_name || variant.name || '');
  const variantPrice = Number.isFinite(Number(variant.price)) ? Number(variant.price) : '';
  const variantStock = Number.isFinite(Number(variant.stock)) ? Number(variant.stock) : '';
  const variantImages = Array.isArray(variant.image_urls)
    ? variant.image_urls
    : (Array.isArray(variant.imageUrls) ? variant.imageUrls : []);
  const fallbackSingleImage = variant.image_url || variant.imageUrl || '';
  const allVariantImages = variantImages.length ? variantImages : (fallbackSingleImage ? [fallbackSingleImage] : []);
  const variantImagesText = escapeHtml(allVariantImages.join('\n'));

  return `
    <tr class="product-variant-row">
      <td>
        <input type="text" class="form-control form-control-sm variant-name-input" placeholder="VD: Mau den - Size M" value="${variantName}">
      </td>
      <td>
        <input type="number" class="form-control form-control-sm variant-price-input" min="0" step="1000" value="${variantPrice}">
      </td>
      <td>
        <input type="number" class="form-control form-control-sm variant-stock-input" min="0" step="1" value="${variantStock}">
      </td>
      <td>
        <div class="d-flex gap-1 align-items-start">
          <textarea class="form-control form-control-sm variant-images-input" rows="2" placeholder="Moi dong 1 URL anh\nhttps://...\n/uploads/images/...">${variantImagesText}</textarea>
          <button type="button" class="btn btn-outline-secondary btn-sm choose-variant-image-btn" title="Chon nhieu anh tu may">
            <i class="fas fa-image"></i>
          </button>
          <input type="file" class="d-none variant-image-file-input" accept="image/*" multiple>
        </div>
      </td>
      <td>
        <button type="button" class="btn btn-sm btn-outline-danger remove-variant-btn">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `;
}

function renderVariantRows(variants = []) {
  const tbody = document.getElementById('variantTableBody');
  if (!tbody) return;

  tbody.innerHTML = variants.length
    ? variants.map((variant) => buildVariantRow(variant)).join('')
    : buildVariantRow();

  recalculateBaseFieldsFromVariants();
}

function addVariantRow(variant = {}) {
  const tbody = document.getElementById('variantTableBody');
  if (!tbody) return;

  tbody.insertAdjacentHTML('beforeend', buildVariantRow(variant));
  recalculateBaseFieldsFromVariants();
}

function collectVariantsFromForm() {
  const rows = document.querySelectorAll('#variantTableBody .product-variant-row');
  const variants = [];

  rows.forEach((row) => {
    const name = row.querySelector('.variant-name-input').value.trim();
    const priceRaw = row.querySelector('.variant-price-input').value;
    const stockRaw = row.querySelector('.variant-stock-input').value;
    const imagesRaw = row.querySelector('.variant-images-input').value;
    const imageUrls = String(imagesRaw || '')
      .split(/\r?\n/)
      .map((item) => String(item || '').trim())
      .filter(Boolean);

    const hasAnyValue = name || priceRaw !== '' || stockRaw !== '' || imageUrls.length > 0;
    if (!hasAnyValue) {
      return;
    }

    const price = Number(priceRaw);
    const stock = Number(stockRaw);

    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      throw new Error('Moi bien the can co ten, gia va ton kho hop le');
    }

    variants.push({
      name,
      price,
      stock,
      imageUrl: imageUrls[0] || null,
      imageUrls
    });
  });

  return variants;
}

function recalculateBaseFieldsFromVariants() {
  const summary = document.getElementById('variantSummaryText');
  const priceInput = document.getElementById('productPriceInput');
  const stockInput = document.getElementById('productStockInput');

  let variants = [];
  try {
    variants = collectVariantsFromForm();
  } catch (error) {
    if (summary) {
      summary.textContent = 'Du lieu bien the chua hop le';
      summary.classList.add('text-danger');
    }
    return;
  }

  if (!variants.length) {
    if (summary) {
      summary.textContent = 'Neu co bien the, thong tin ben duoi chi de tham khao. Gia/ton kho san pham chinh se giu nguyen theo o ben tren.';
      summary.classList.remove('text-danger');
    }
    return;
  }

  const minPrice = Math.min(...variants.map((item) => item.price));
  const totalStock = variants.reduce((sum, item) => sum + item.stock, 0);

  // Gia/ton kho san pham chinh duoc admin tu quan ly, khong ghi de tu dong tu bien the.
  priceInput.readOnly = false;
  stockInput.readOnly = false;

  if (summary) {
    summary.textContent = `Dang co ${variants.length} bien the | Gia tham khao thap nhat: ${formatCurrencyVnd(minPrice)} | Tong ton kho bien the: ${totalStock}`;
    summary.classList.remove('text-danger');
  }
}

function resetProductForm() {
  adminState.editingProductId = null;
  adminState.editingVariants = [];
  document.getElementById('productModalTitle').textContent = 'Them san pham';
  document.getElementById('productIdInput').value = '';
  document.getElementById('productNameInput').value = '';
  document.getElementById('productPriceInput').value = '';
  document.getElementById('productSalePriceInput').value = '';
  document.getElementById('productStockInput').value = '';
  document.getElementById('productImageInput').value = '';
  document.getElementById('productDescriptionInput').value = '';
  if (adminState.categories.length) {
    document.getElementById('productCategoryInput').value = adminState.categories[0].category_id;
  }

  renderVariantRows([]);
}

async function uploadVariantImageFile(file) {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/admin/uploads/image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Khong the upload anh bien the');
  }

  return data.data?.imageUrl || '';
}

function openAddProduct() {
  resetProductForm();
  adminState.productModal.show();
}

function openEditProduct(productId) {
  const product = adminState.products.find((item) => Number(item.product_id) === Number(productId));
  if (!product) return;

  adminState.editingProductId = product.product_id;
  document.getElementById('productModalTitle').textContent = 'Cap nhat san pham';
  document.getElementById('productIdInput').value = product.product_id;
  document.getElementById('productNameInput').value = product.product_name || '';
  document.getElementById('productPriceInput').value = product.base_price ?? product.price ?? 0;
  document.getElementById('productSalePriceInput').value = product.sale_price || '';
  document.getElementById('productStockInput').value = product.stock_quantity || 0;
  document.getElementById('productImageInput').value = product.image_url || '';
  document.getElementById('productDescriptionInput').value = product.description || '';
  document.getElementById('productCategoryInput').value = product.category_id || '';
  adminState.editingVariants = Array.isArray(product.variants) ? product.variants : [];
  renderVariantRows(adminState.editingVariants);

  adminState.productModal.show();
}

async function saveProduct() {
  const form = document.getElementById('productForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const payload = {
    productName: document.getElementById('productNameInput').value.trim(),
    description: document.getElementById('productDescriptionInput').value.trim(),
    price: Number(document.getElementById('productPriceInput').value),
    salePrice: (() => {
      const raw = document.getElementById('productSalePriceInput').value;
      return String(raw || '').trim() === '' ? null : Number(raw);
    })(),
    stock: Number(document.getElementById('productStockInput').value),
    categoryId: Number(document.getElementById('productCategoryInput').value),
    imageUrl: document.getElementById('productImageInput').value.trim()
  };

  if (payload.salePrice !== null && (!Number.isFinite(payload.salePrice) || payload.salePrice < 0)) {
    toast.error('Gia sale khong hop le');
    return;
  }

  if (payload.salePrice !== null && payload.salePrice >= payload.price) {
    toast.error('Gia sale phai nho hon gia goc');
    return;
  }

  let variants = [];
  try {
    variants = collectVariantsFromForm();
  } catch (error) {
    toast.error(error.message);
    return;
  }

  if (variants.length) {
    payload.variants = variants;
  } else {
    payload.variants = [];
  }

  try {
    loading.show();
    if (adminState.editingProductId) {
      await apiAdmin(`/admin/products/${adminState.editingProductId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      toast.success('Da cap nhat san pham');
    } else {
      await apiAdmin('/admin/products', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      toast.success('Da them san pham moi');
    }

    adminState.productModal.hide();
    await loadProducts();
    await loadOverview();
  } catch (error) {
    toast.error(error.message);
  } finally {
    loading.hide();
  }
}

async function deleteProduct(productId) {
  if (!confirm('Ban chac chan muon xoa san pham nay?')) return;

  try {
    loading.show();
    await apiAdmin(`/admin/products/${productId}`, { method: 'DELETE' });
    toast.success('Da xoa san pham');
    await loadProducts();
    await loadOverview();
  } catch (error) {
    toast.error(error.message);
  } finally {
    loading.hide();
  }
}

async function duplicateProduct(productId) {
  const product = adminState.products.find((item) => Number(item.product_id) === Number(productId));
  if (!product) {
    toast.error('Khong tim thay san pham de nhan ban');
    return;
  }

  const payload = {
    productName: `${product.product_name} (Ban sao)`,
    description: product.description || '',
    price: Number(product.base_price ?? product.price) || 0,
    salePrice: Number(product.sale_price) > 0 ? Number(product.sale_price) : null,
    stock: Number(product.stock_quantity) || 0,
    categoryId: Number(product.category_id),
    imageUrl: product.image_url || '',
    variants: Array.isArray(product.variants)
      ? product.variants.map((variant) => ({
          name: variant.variant_name || variant.name,
          price: Number(variant.price) || 0,
          stock: Number(variant.stock) || 0,
          imageUrl: variant.image_url || variant.imageUrl || '',
          imageUrls: Array.isArray(variant.image_urls)
            ? variant.image_urls
            : (Array.isArray(variant.imageUrls)
              ? variant.imageUrls
              : (variant.image_url || variant.imageUrl ? [variant.image_url || variant.imageUrl] : []))
        }))
      : []
  };

  try {
    loading.show();
    await apiAdmin('/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    toast.success('Da nhan ban san pham');
    await loadProducts();
    await loadOverview();
  } catch (error) {
    toast.error(error.message);
  } finally {
    loading.hide();
  }
}

function toCsvSafe(value) {
  const text = String(value ?? '');
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
}

function exportLowStockCsv() {
  const lowStock = adminState.products
    .filter((item) => Number(item.stock_quantity) <= 10)
    .sort((a, b) => Number(a.stock_quantity) - Number(b.stock_quantity));

  if (!lowStock.length) {
    toast.info('Khong co san pham ton kho thap de xuat');
    return;
  }

  const header = ['ProductId', 'ProductName', 'Category', 'Price', 'Stock', 'VariantCount'];
  const rows = lowStock.map((item) => {
    const variantCount = Array.isArray(item.variants) ? item.variants.length : 0;
    return [
      item.product_id,
      item.product_name,
      item.category_name || '',
      Number(item.price) || 0,
      Number(item.stock_quantity) || 0,
      variantCount
    ].map(toCsvSafe).join(',');
  });

  const csvContent = `${header.join(',')}\n${rows.join('\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `low-stock-${timestamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success(`Da xuat ${lowStock.length} san pham ton kho thap`);
}

async function refreshAllData() {
  try {
    loading.show();
    await Promise.all([
      loadOverview(),
      loadOrders(),
      loadCategories(),
      loadProducts(),
      loadUsers()
    ]);
    toast.success('Da lam moi du lieu');
  } catch (error) {
    toast.error(error.message);
  } finally {
    loading.hide();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;

  initAdminReveal();

  adminState.productModal = new bootstrap.Modal(document.getElementById('productModal'));
  setupAdminTabsPersistence();
  setupAdminKeyboardShortcuts();

  document.getElementById('refreshAllBtn').addEventListener('click', refreshAllData);
  document.getElementById('exportLowStockBtn').addEventListener('click', exportLowStockCsv);
  document.getElementById('revenueViewFilter').addEventListener('change', loadOverview);
  document.getElementById('orderStatusFilter').addEventListener('change', renderOrdersTable);
  document.getElementById('productSearchInput').addEventListener('input', renderProductsTable);
  document.getElementById('addProductBtn').addEventListener('click', openAddProduct);
  document.getElementById('saveProductBtn').addEventListener('click', saveProduct);
  document.getElementById('addVariantRowBtn').addEventListener('click', () => addVariantRow());
  document.getElementById('variantTableBody').addEventListener('click', (event) => {
    const removeButton = event.target.closest('.remove-variant-btn');
    if (removeButton) {
      const row = removeButton.closest('.product-variant-row');
      if (!row) return;

      row.remove();
      const remainingRows = document.querySelectorAll('#variantTableBody .product-variant-row').length;
      if (remainingRows === 0) {
        addVariantRow();
      } else {
        recalculateBaseFieldsFromVariants();
      }
      return;
    }

    const chooseImageButton = event.target.closest('.choose-variant-image-btn');
    if (chooseImageButton) {
      const row = chooseImageButton.closest('.product-variant-row');
      const fileInput = row?.querySelector('.variant-image-file-input');
      if (fileInput) {
        fileInput.click();
      }
    }
  });

  document.getElementById('variantTableBody').addEventListener('change', async (event) => {
    const fileInput = event.target.closest('.variant-image-file-input');
    if (!fileInput || !fileInput.files?.length) {
      return;
    }

    const files = Array.from(fileInput.files);
    const row = fileInput.closest('.product-variant-row');
    const imagesInput = row?.querySelector('.variant-images-input');
    if (!row || !imagesInput) {
      return;
    }

    try {
      loading.show();
      const uploadedUrls = [];
      for (const file of files) {
        const uploadedImageUrl = await uploadVariantImageFile(file);
        if (uploadedImageUrl) {
          uploadedUrls.push(uploadedImageUrl);
        }
      }

      const existingUrls = String(imagesInput.value || '')
        .split(/\r?\n/)
        .map((item) => String(item || '').trim())
        .filter(Boolean);

      const mergedUrls = [...existingUrls];
      uploadedUrls.forEach((url) => {
        if (!mergedUrls.includes(url)) {
          mergedUrls.push(url);
        }
      });

      imagesInput.value = mergedUrls.join('\n');
      toast.success(`Da upload ${uploadedUrls.length} anh bien the`);
    } catch (error) {
      toast.error(error.message || 'Upload anh bien the that bai');
    } finally {
      fileInput.value = '';
      loading.hide();
    }
  });
  document.getElementById('variantTableBody').addEventListener('input', recalculateBaseFieldsFromVariants);

  await refreshAllData();
});

window.quickConfirmOrder = quickConfirmOrder;
window.changeOrderStatus = changeOrderStatus;
window.processReturn = processReturn;
window.openEditProduct = openEditProduct;
window.deleteProduct = deleteProduct;
window.toggleUserLock = toggleUserLock;
window.duplicateProduct = duplicateProduct;
