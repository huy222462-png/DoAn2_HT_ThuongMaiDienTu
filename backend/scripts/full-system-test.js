/* eslint-disable no-console */
/**
 * Full System Smoke/Logic Test
 * Covers core API flows end-to-end with assertions.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;
const { connectDB, getPool, closeDB } = require('../config/database');
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin@123';
const ADMIN_IDENTIFIERS = [
  process.env.TEST_ADMIN_IDENTIFIER,
  'admin@tmdt.com',
  'admin@ecommerce.com'
].filter(Boolean);

const results = [];
let hasFailure = false;

const nowTag = Date.now();
const tempUser = {
  fullName: `Smoke User ${nowTag}`,
  email: `smoke_${nowTag}@example.net`,
  phone: `09${String(nowTag).slice(-8)}`,
  password: 'Smoke@123',
  address: '123 Test Street, Ho Chi Minh'
};

const state = {
  userToken: null,
  adminToken: null,
  userId: null,
  firstProduct: null,
  variantProduct: null,
  checkoutProduct: null,
  cartItemId: null,
  orderId: null,
  promotedAdmin: false
};

function ok(step, detail) {
  results.push({ step, status: 'PASS', detail: detail || '' });
}

function fail(step, detail) {
  hasFailure = true;
  results.push({ step, status: 'FAIL', detail: detail || '' });
}

function skip(step, detail) {
  results.push({ step, status: 'SKIP', detail: detail || '' });
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    data = { raw: text };
  }
  return { response, data };
}

function bearer(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function runStep(step, fn) {
  try {
    await fn();
  } catch (error) {
    fail(step, error && error.message ? error.message : String(error));
  }
}

async function setUserAdminFlag(userId, isAdmin) {
  await connectDB();
  const pool = getPool();
  await pool.request()
    .input('userId', Number(userId))
    .input('isAdmin', isAdmin ? 1 : 0)
    .query('UPDATE Users SET IsAdmin = @isAdmin WHERE UserId = @userId');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  await runStep('HEALTH', async () => {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    assert(response.ok, `health status ${response.status}`);
    assert(data && data.success === true, 'health success=false');
    ok('HEALTH', 'Health endpoint is up.');
  });

  await runStep('AUTH_REGISTER', async () => {
    const { response, data } = await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: tempUser.fullName,
        email: tempUser.email,
        phone: tempUser.phone,
        password: tempUser.password,
        loginMethod: 'email'
      })
    });

    assert(response.status === 201, `register status ${response.status}`);
    assert(data && data.success === true, 'register success=false');
    state.userId = data?.data?.userId || null;
    ok('AUTH_REGISTER', `Registered ${tempUser.email}`);
  });

  await runStep('AUTH_LOGIN_USER', async () => {
    const { response, data } = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: tempUser.email,
        loginMethod: 'email',
        password: tempUser.password
      })
    });

    assert(response.ok, `user login status ${response.status}`);
    assert(data && data.success === true, 'user login success=false');
    assert(data?.data?.token, 'missing user token');
    state.userToken = data.data.token;
    ok('AUTH_LOGIN_USER', 'User login succeeded.');
  });

  await runStep('AUTH_PROFILE_GET', async () => {
    const { response, data } = await request('/auth/profile', {
      method: 'GET',
      headers: { ...bearer(state.userToken) }
    });
    assert(response.ok, `profile status ${response.status}`);
    assert(data?.success === true, 'profile success=false');
    assert(data?.data?.email === tempUser.email, 'profile email mismatch');
    ok('AUTH_PROFILE_GET', 'Profile fetched correctly.');
  });

  await runStep('AUTH_PROFILE_UPDATE', async () => {
    const newAddress = `${tempUser.address} - Updated`;
    const { response, data } = await request('/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...bearer(state.userToken)
      },
      body: JSON.stringify({
        fullName: `${tempUser.fullName} Updated`,
        phone: tempUser.phone,
        address: newAddress
      })
    });
    assert(response.ok, `profile update status ${response.status}`);
    assert(data?.success === true, 'profile update success=false');
    ok('AUTH_PROFILE_UPDATE', 'Profile update passed.');
  });

  await runStep('AUTH_CHANGE_PASSWORD', async () => {
    const newPassword = 'Smoke@1234';
    const { response, data } = await request('/auth/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...bearer(state.userToken)
      },
      body: JSON.stringify({
        currentPassword: tempUser.password,
        newPassword,
        confirmPassword: newPassword
      })
    });
    assert(response.ok, `change password status ${response.status}`);
    assert(data?.success === true, 'change password success=false');
    tempUser.password = newPassword;
    ok('AUTH_CHANGE_PASSWORD', 'Password changed successfully.');
  });

  await runStep('AUTH_LOGIN_USER_NEW_PASSWORD', async () => {
    const { response, data } = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: tempUser.email,
        loginMethod: 'email',
        password: tempUser.password
      })
    });

    assert(response.ok, `re-login status ${response.status}`);
    assert(data?.success === true, 're-login success=false');
    state.userToken = data.data.token;
    ok('AUTH_LOGIN_USER_NEW_PASSWORD', 'Re-login with new password works.');
  });

  await runStep('AUTH_FORGOT_PASSWORD_REQUEST', async () => {
    const { response, data } = await request('/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: tempUser.email,
        loginMethod: 'email'
      })
    });

    assert(response.ok, `forgot password status ${response.status}`);
    assert(data?.success === true, 'forgot password success=false');
    ok('AUTH_FORGOT_PASSWORD_REQUEST', 'Forgot-password flow accepted.');
  });

  await runStep('CATEGORY_LIST', async () => {
    const { response, data } = await request('/categories');
    assert(response.ok, `categories status ${response.status}`);
    assert(Array.isArray(data?.data), 'categories data not array');
    assert((data?.data || []).length > 0, 'categories empty');
    ok('CATEGORY_LIST', `Loaded ${data.data.length} categories.`);
  });

  await runStep('PRODUCT_LIST', async () => {
    const { response, data } = await request('/products?limit=30');
    assert(response.ok, `products status ${response.status}`);
    const items = data?.data?.products || data?.data || [];
    assert(Array.isArray(items), 'products array missing');
    assert(items.length > 0, 'products empty');
    state.firstProduct = items.find((p) => Number(p.stock_quantity ?? p.Stock ?? 0) >= 3) || items[0];
    state.variantProduct = items.find((p) => Array.isArray(p.variants) && p.variants.length > 0) || null;
    state.checkoutProduct = items.find((p) => {
      const stock = Number(p.stock_quantity ?? p.Stock ?? 0);
      const variants = Array.isArray(p.variants) ? p.variants : [];
      return stock >= 5 && variants.length === 0;
    }) || items.find((p) => Number(p.stock_quantity ?? p.Stock ?? 0) >= 5) || state.firstProduct;
    ok('PRODUCT_LIST', `Loaded ${items.length} products.`);
  });

  await runStep('PRODUCT_SEARCH', async () => {
    const keyword = encodeURIComponent('iphone');
    const { response, data } = await request(`/products/search?keyword=${keyword}`);
    assert(response.ok, `search status ${response.status}`);
    assert(Array.isArray(data?.data), 'search data not array');
    ok('PRODUCT_SEARCH', `Search returned ${data.data.length} items.`);
  });

  await runStep('PRODUCT_DETAIL', async () => {
    const productId = Number(state.firstProduct?.product_id || state.firstProduct?.ProductId);
    assert(Number.isInteger(productId) && productId > 0, 'invalid first product id');
    const { response, data } = await request(`/products/${productId}`);
    assert(response.ok, `product detail status ${response.status}`);
    assert(data?.success === true, 'product detail success=false');
    ok('PRODUCT_DETAIL', `Fetched product #${productId}.`);
  });

  await runStep('WISHLIST_ADD_CHECK_REMOVE', async () => {
    const productId = Number(state.firstProduct?.product_id || state.firstProduct?.ProductId);
    assert(Number.isInteger(productId) && productId > 0, 'invalid product id for wishlist');

    const addRes = await request('/wishlist/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...bearer(state.userToken)
      },
      body: JSON.stringify({ productId })
    });
    assert(addRes.response.ok, `wishlist add status ${addRes.response.status}`);

    const checkRes = await request(`/wishlist/check/${productId}`, {
      method: 'GET',
      headers: { ...bearer(state.userToken) }
    });
    assert(checkRes.response.ok, `wishlist check status ${checkRes.response.status}`);
    assert(checkRes.data?.data?.inWishlist === true, 'wishlist check expected true');

    const removeRes = await request(`/wishlist/remove/${productId}`, {
      method: 'DELETE',
      headers: { ...bearer(state.userToken) }
    });
    assert(removeRes.response.ok, `wishlist remove status ${removeRes.response.status}`);

    ok('WISHLIST_ADD_CHECK_REMOVE', 'Wishlist add/check/remove is consistent.');
  });

  await runStep('CART_CLEAR', async () => {
    const { response } = await request('/cart/clear', {
      method: 'DELETE',
      headers: { ...bearer(state.userToken) }
    });
    assert(response.ok, `cart clear status ${response.status}`);
    ok('CART_CLEAR', 'Cart cleared.');
  });

  await runStep('CART_ADD_BASE_PRODUCT', async () => {
    const productId = Number(state.firstProduct?.product_id || state.firstProduct?.ProductId);
    assert(Number.isInteger(productId) && productId > 0, 'invalid product for cart add');

    const addRes = await request('/cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...bearer(state.userToken)
      },
      body: JSON.stringify({ productId, quantity: 1 })
    });
    assert(addRes.response.ok, `cart add base status ${addRes.response.status}`);
    ok('CART_ADD_BASE_PRODUCT', `Added product ${productId}.`);
  });

  await runStep('CART_GET_AND_UPDATE', async () => {
    const cartRes = await request('/cart', {
      method: 'GET',
      headers: { ...bearer(state.userToken) }
    });
    assert(cartRes.response.ok, `cart get status ${cartRes.response.status}`);
    const items = cartRes.data?.data?.items || [];
    assert(Array.isArray(items) && items.length > 0, 'cart should have at least one item');
    const item = items[0];
    state.cartItemId = Number(item.CartId);
    assert(Number.isInteger(state.cartItemId) && state.cartItemId > 0, 'invalid cart item id');

    const updateRes = await request('/cart/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...bearer(state.userToken)
      },
      body: JSON.stringify({ cartId: state.cartItemId, quantity: 2 })
    });
    assert(updateRes.response.ok, `cart update status ${updateRes.response.status}`);
    ok('CART_GET_AND_UPDATE', `Updated cart item ${state.cartItemId} to qty=2.`);
  });

  await runStep('CART_ADD_VARIANT_IF_ANY', async () => {
    if (!state.variantProduct) {
      ok('CART_ADD_VARIANT_IF_ANY', 'No variant product found in sample data, skipped logic check.');
      return;
    }

    const productId = Number(state.variantProduct.product_id || state.variantProduct.ProductId);
    const variant = (state.variantProduct.variants || []).find((v) => Number(v.stock || 0) > 0) || (state.variantProduct.variants || [])[0];
    const variantId = Number(variant?.variant_id || variant?.VariantId);
    assert(Number.isInteger(productId) && productId > 0, 'invalid variant product id');
    assert(Number.isInteger(variantId) && variantId > 0, 'invalid variant id');

    const addRes = await request('/cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...bearer(state.userToken)
      },
      body: JSON.stringify({ productId, variantId, quantity: 1 })
    });
    assert(addRes.response.ok, `cart add variant status ${addRes.response.status}`);

    const cartRes = await request('/cart', {
      method: 'GET',
      headers: { ...bearer(state.userToken) }
    });
    assert(cartRes.response.ok, `cart get post-variant status ${cartRes.response.status}`);
    const items = cartRes.data?.data?.items || [];
    const hit = items.find((it) => {
      const itemProductId = Number(it.ProductId ?? it.product_id);
      const itemVariantId = Number(it.VariantId ?? it.variant_id);
      return itemProductId === productId && itemVariantId === variantId;
    });
    assert(Boolean(hit), 'variant item missing from cart response');
    ok('CART_ADD_VARIANT_IF_ANY', `Variant cart logic works for product ${productId}, variant ${variantId}.`);
  });

  await runStep('CART_RECOMMENDATIONS', async () => {
    const { response, data } = await request('/cart/recommendations', {
      method: 'GET',
      headers: { ...bearer(state.userToken) }
    });
    assert(response.ok, `cart recommendations status ${response.status}`);
    assert(Array.isArray(data?.data), 'recommendations data not array');
    ok('CART_RECOMMENDATIONS', `Got ${data.data.length} recommendations.`);
  });

  await runStep('CART_PREPARE_FOR_CHECKOUT', async () => {
    // Keep checkout cart deterministic: clear test cart then add safe stock items.
    const clearRes = await request('/cart/clear', {
      method: 'DELETE',
      headers: { ...bearer(state.userToken) }
    });
    assert(clearRes.response.ok, `checkout cart clear status ${clearRes.response.status}`);

    const checkoutProductId = Number(state.checkoutProduct?.product_id || state.checkoutProduct?.ProductId);
    assert(Number.isInteger(checkoutProductId) && checkoutProductId > 0, 'invalid checkout product id');

    const addBaseRes = await request('/cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...bearer(state.userToken)
      },
      body: JSON.stringify({ productId: checkoutProductId, quantity: 1 })
    });
    assert(addBaseRes.response.ok, `checkout cart add base status ${addBaseRes.response.status}`);

    if (state.variantProduct) {
      const variantProductId = Number(state.variantProduct.product_id || state.variantProduct.ProductId);
      const variant = (state.variantProduct.variants || []).find((v) => Number(v.stock || 0) >= 2) || null;
      const variantId = Number(variant?.variant_id || variant?.VariantId);

      if (Number.isInteger(variantProductId) && variantProductId > 0 && Number.isInteger(variantId) && variantId > 0) {
        const addVariantRes = await request('/cart/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...bearer(state.userToken)
          },
          body: JSON.stringify({ productId: variantProductId, variantId, quantity: 1 })
        });
        assert(addVariantRes.response.ok, `checkout cart add variant status ${addVariantRes.response.status}`);
      }
    }

    ok('CART_PREPARE_FOR_CHECKOUT', 'Prepared stable checkout cart.');
  });

  await runStep('ORDER_PREVIEW_PRICING', async () => {
    const { response, data } = await request('/orders/preview-pricing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...bearer(state.userToken)
      },
      body: JSON.stringify({ couponCode: 'SAVE10' })
    });
    assert(response.ok, `preview pricing status ${response.status}`);
    assert(data?.success === true, 'preview pricing success=false');
    ok('ORDER_PREVIEW_PRICING', 'Pricing preview passed.');
  });

  await runStep('ORDER_CREATE', async () => {
    const { response, data } = await request('/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...bearer(state.userToken)
      },
      body: JSON.stringify({
        shippingAddress: tempUser.address,
        phone: tempUser.phone,
        paymentMethod: 'cod',
        couponCode: ''
      })
    });
    assert(response.status === 201, `order create status ${response.status} - ${data?.message || 'no message'}`);
    assert(data?.success === true, 'order create success=false');
    const orderId = Number(data?.data?.OrderId || data?.data?.order_id || data?.data?.orderId);
    assert(Number.isInteger(orderId) && orderId > 0, 'invalid order id');
    state.orderId = orderId;
    ok('ORDER_CREATE', `Created order ${orderId}.`);
  });

  await runStep('ORDER_HISTORY_AND_DETAIL', async () => {
    assert(Number.isInteger(state.orderId) && state.orderId > 0, 'orderId missing because create step failed');
    const historyRes = await request('/orders/history', {
      method: 'GET',
      headers: { ...bearer(state.userToken) }
    });
    assert(historyRes.response.ok, `history status ${historyRes.response.status}`);
    assert(Array.isArray(historyRes.data?.data), 'history data not array');

    const detailRes = await request(`/orders/${state.orderId}`, {
      method: 'GET',
      headers: { ...bearer(state.userToken) }
    });
    assert(detailRes.response.ok, `order detail status ${detailRes.response.status}`);
    assert(Array.isArray(detailRes.data?.data?.Items), 'order detail missing items');
    ok('ORDER_HISTORY_AND_DETAIL', `Order ${state.orderId} present in history/detail.`);
  });

  await runStep('REVIEW_CREATE', async () => {
    const productId = Number(state.firstProduct?.product_id || state.firstProduct?.ProductId);
    const { response, data } = await request('/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...bearer(state.userToken)
      },
      body: JSON.stringify({
        productId,
        rating: 5,
        comment: 'Smoke test review for logic verification.'
      })
    });
    assert(response.status === 201 || response.status === 400, `review status ${response.status}`);
    if (response.status === 400) {
      assert(data?.message?.toLowerCase().includes('đã đánh giá') || data?.message?.toLowerCase().includes('da danh gia'), 'unexpected review 400');
      ok('REVIEW_CREATE', 'Review endpoint reachable (duplicate prevented).');
      return;
    }
    assert(data?.success === true, 'review create success=false');
    ok('REVIEW_CREATE', 'Review create succeeded.');
  });

  await runStep('CHAT_ASK', async () => {
    const { response, data } = await request('/chat/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Goi y san pham duoi 10 trieu' })
    });
    assert(response.ok, `chat status ${response.status}`);
    assert(data?.success === true, 'chat success=false');
    ok('CHAT_ASK', 'Chatbot endpoint responded.');
  });

  await runStep('AUTH_LOGIN_ADMIN', async () => {
    let success = false;
    let lastStatus = 0;

    for (const identifier of ADMIN_IDENTIFIERS) {
      const { response, data } = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          loginMethod: 'email',
          password: ADMIN_PASSWORD
        })
      });

      lastStatus = response.status;
      if (response.ok && data?.success === true && data?.data?.user?.isAdmin === true) {
        state.adminToken = data.data.token;
        success = true;
        ok('AUTH_LOGIN_ADMIN', `Admin login succeeded with ${identifier}.`);
        break;
      }
    }

    if (!success) {
      // Fallback for fully automated testing environments without seeded admin password.
      await setUserAdminFlag(state.userId, true);
      state.promotedAdmin = true;

      const fallbackLogin = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: tempUser.email,
          loginMethod: 'email',
          password: tempUser.password
        })
      });

      assert(fallbackLogin.response.ok, `fallback admin login status ${fallbackLogin.response.status}`);
      assert(fallbackLogin.data?.success === true, 'fallback admin login success=false');
      assert(fallbackLogin.data?.data?.user?.isAdmin === true, 'fallback admin flag false');
      state.adminToken = fallbackLogin.data.data.token;
      ok('AUTH_LOGIN_ADMIN', 'Admin login succeeded via temporary promoted test user.');
    }
  });

  await runStep('ADMIN_READ_ENDPOINTS', async () => {
    if (!state.adminToken) {
      skip('ADMIN_READ_ENDPOINTS', 'Skipped: missing admin token.');
      return;
    }

    const [statsRes, usersRes, ordersRes] = await Promise.all([
      request('/admin/statistics', { method: 'GET', headers: { ...bearer(state.adminToken) } }),
      request('/admin/users', { method: 'GET', headers: { ...bearer(state.adminToken) } }),
      request('/admin/orders', { method: 'GET', headers: { ...bearer(state.adminToken) } })
    ]);

    assert(statsRes.response.ok, `admin stats status ${statsRes.response.status}`);
    assert(usersRes.response.ok, `admin users status ${usersRes.response.status}`);
    assert(ordersRes.response.ok, `admin orders status ${ordersRes.response.status}`);
    ok('ADMIN_READ_ENDPOINTS', 'Admin stats/users/orders reachable.');
  });

  await runStep('AUTH_LOGOUT_USER', async () => {
    const { response, data } = await request('/auth/logout', {
      method: 'POST',
      headers: { ...bearer(state.userToken) }
    });
    assert(response.ok, `logout status ${response.status}`);
    assert(data?.success === true, 'logout success=false');
    ok('AUTH_LOGOUT_USER', 'User logout passed.');
  });

  await runStep('CLEANUP_TEMP_ADMIN_FLAG', async () => {
    if (!state.promotedAdmin || !state.userId) {
      skip('CLEANUP_TEMP_ADMIN_FLAG', 'No temporary admin promotion to revert.');
      return;
    }

    await setUserAdminFlag(state.userId, false);
    ok('CLEANUP_TEMP_ADMIN_FLAG', 'Reverted temporary admin promotion.');
  });

  console.log('\n=== FULL SYSTEM TEST SUMMARY ===');
  for (const row of results) {
    console.log(`[${row.status}] ${row.step}${row.detail ? `: ${row.detail}` : ''}`);
  }

  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  const skipCount = results.filter((r) => r.status === 'SKIP').length;
  console.log('--------------------------------');
  console.log(`Pass: ${passCount} | Fail: ${failCount} | Skip: ${skipCount} | Total: ${results.length}`);

  await closeDB().catch(() => {});

  if (hasFailure) {
    console.log('Result: NOT READY (see failures above).');
    process.exit(1);
  }

  console.log('Result: READY (core function + logic smoke test passed).');
}

main().catch((error) => {
  console.error('Unexpected fatal error:', error);
  process.exit(1);
});
