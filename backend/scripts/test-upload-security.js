/*
 * Security smoke test: upload spoofed image file
 * Run: node scripts/test-upload-security.js
 *
 * Env:
 * - API_BASE_URL (default: http://localhost:5000/api)
 * - ADMIN_TEST_TOKEN (optional)
 * - ADMIN_TEST_EMAIL + ADMIN_TEST_PASSWORD (used when token missing)
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

const fail = (message) => {
  console.error('[FAIL]', message);
  process.exitCode = 1;
};

const pass = (message) => {
  console.log('[PASS]', message);
  process.exitCode = 0;
};

const getAdminToken = async () => {
  if (process.env.ADMIN_TEST_TOKEN) {
    return process.env.ADMIN_TEST_TOKEN;
  }

  const email = process.env.ADMIN_TEST_EMAIL;
  const password = process.env.ADMIN_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('Thiếu ADMIN_TEST_TOKEN hoặc cặp ADMIN_TEST_EMAIL/ADMIN_TEST_PASSWORD');
  }

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  if (!response.ok || !data?.data?.token) {
    throw new Error('Không thể đăng nhập lấy token admin');
  }

  return data.data.token;
};

const getAnyCategoryId = async (token) => {
  const response = await fetch(`${API_BASE_URL}/categories`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok || !data?.data?.length) {
    throw new Error('Không lấy được category để test upload');
  }

  return data.data[0].category_id;
};

const run = async () => {
  try {
    const token = await getAdminToken();
    const categoryId = await getAnyCategoryId(token);

    const fakeImagePayload = Buffer.from('this is not an image file, just spoofed content', 'utf8');
    const formData = new FormData();
    formData.append('productName', 'Security Test Product');
    formData.append('price', '12345');
    formData.append('stock', '2');
    formData.append('categoryId', String(categoryId));

    // Spoof file type as image/jpeg while content is plain text.
    const fakeBlob = new Blob([fakeImagePayload], { type: 'image/jpeg' });
    formData.append('image', fakeBlob, 'spoofed.jpg');

    const response = await fetch(`${API_BASE_URL}/admin/products`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    if (response.status === 400 && data?.success === false) {
      pass('Upload giả mạo đã bị chặn đúng kỳ vọng (HTTP 400).');
      return;
    }

    fail(`Kỳ vọng bị chặn upload giả mạo nhưng nhận HTTP ${response.status}: ${JSON.stringify(data)}`);
  } catch (error) {
    fail(error.message || String(error));
  }
};

run().catch((error) => {
  fail(error?.message || String(error));
});
