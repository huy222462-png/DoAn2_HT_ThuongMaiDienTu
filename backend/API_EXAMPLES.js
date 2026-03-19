/**
 * API Examples - Image Upload & Download
 * Các ví dụ về cách sử dụng API tạo/cập nhật sản phẩm với ảnh
 */

// ============================================
// 1. UPLOAD ẢNH TỪ FILE
// ============================================

async function createProductWithFileUpload(productData, imageFile) {
  const formData = new FormData();
  formData.append('productName', productData.productName);
  formData.append('description', productData.description);
  formData.append('price', productData.price);
  formData.append('stock', productData.stock);
  formData.append('categoryId', productData.categoryId);
  formData.append('image', imageFile); // File từ input

  try {
    const response = await fetch('http://localhost:5000/api/admin/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData // Không set Content-Type, browser sẽ tự set multipart/form-data
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✓ Sản phẩm tạo thành công:', result.data);
      console.log('🖼 Đường dẫn ảnh:', result.data.image_url);
      return result.data;
    } else {
      console.error('✗ Lỗi:', result.message);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Lỗi upload:', error);
    throw error;
  }
}

// Cách sử dụng:
// const input = document.querySelector('input[type="file"]');
// const productData = {
//   productName: 'Sản phẩm A',
//   description: 'Mô tả sản phẩm',
//   price: 99.99,
//   stock: 100,
//   categoryId: 1
// };
// createProductWithFileUpload(productData, input.files[0]);


// ============================================
// 2. UPLOAD TỪNG URL ẢNH TỪ INTERNET
// ============================================

async function createProductWithImageUrl(productData) {
  try {
    const response = await fetch('http://localhost:5000/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(productData)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✓ Sản phẩm tạo thành công (ảnh đã được download)');
      console.log('🖼 Đường dẫn ảnh cục bộ:', result.data.image_url);
      return result.data;
    } else {
      console.error('✗ Lỗi:', result.message);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Lỗi:', error);
    throw error;
  }
}

// Cách sử dụng:
// const productData = {
//   productName: 'Sản phẩm mới',
//   description: 'Mô tả',
//   price: 99.99,
//   stock: 100,
//   categoryId: 1,
//   imageUrl: 'https://example.com/image.jpg'  // URL ảnh từ internet
// };
// createProductWithImageUrl(productData);


// ============================================
// 3. CẬP NHẬT SẢN PHẨM VỚI ẢNH MỚI
// ============================================

async function updateProductWithImage(productId, productData, imageFile = null) {
  const formData = new FormData();
  formData.append('productName', productData.productName);
  formData.append('description', productData.description);
  formData.append('price', productData.price);
  formData.append('stock', productData.stock);
  formData.append('categoryId', productData.categoryId);
  
  if (imageFile) {
    formData.append('image', imageFile); // File ảnh mới (tùy chọn)
  } else if (productData.imageUrl) {
    // Gửi imageUrl nếu là URL từ internet hoặc giữ ảnh cũ
    formData.append('imageUrl', productData.imageUrl);
  }

  try {
    const response = await fetch(`http://localhost:5000/api/admin/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✓ Sản phẩm cập nhật thành công');
      return result.data;
    } else {
      console.error('✗ Lỗi:', result.message);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Lỗi cập nhật:', error);
    throw error;
  }
}

// Cách sử dụng:
// C1: Cập nhật với ảnh file mới
// updateProductWithImage(1, productData, fileInput.files[0]);

// C2: Cập nhật với URL ảnh (sẽ download)
// const productData = {
//   productName: 'Tên mới',
//   description: 'Mô tả mới',
//   price: 129.99,
//   stock: 150,
//   categoryId: 1,
//   imageUrl: 'https://example.com/new-image.jpg'
// };
// updateProductWithImage(1, productData);

// C3: Cập nhật chỉ thông tin, giữ ảnh cũ
// updateProductWithImage(1, productData); // Không có file và không có imageUrl trong productData


// ============================================
// 4. XÓA SẢN PHẨM (Ảnh sẽ được xóa tự động)
// ============================================

async function deleteProduct(productId) {
  try {
    const response = await fetch(`http://localhost:5000/api/admin/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✓ Sản phẩm đã xóa (ảnh cũng được xóa)');
      return true;
    } else {
      console.error('✗ Lỗi:', result.message);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Lỗi xóa:', error);
    throw error;
  }
}


// ============================================
// 5. HIỂN THỊ ẢNH TRONG FRONTEND
// ============================================

// Nếu database lưu: "/uploads/images/filename.jpg"
// Thì trong HTML:

function displayProductImage(imageUrl) {
  // Nếu imageUrl là đường dẫn tương đối
  if (imageUrl && imageUrl.startsWith('/')) {
    return `http://localhost:5000${imageUrl}`;
  }
  
  // Nếu là URL đầy đủ
  if (imageUrl && imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // Ảnh mặc định
  return 'http://localhost:5000/default-product.jpg';
}

// Cách sử dụng:
// const img = document.createElement('img');
// img.src = displayProductImage(product.image_url);
// img.alt = product.product_name;
// document.body.appendChild(img);


// ============================================
// 6. FORM UPLOAD DEMO HTML
// ============================================

/*
<form id="productForm" enctype="multipart/form-data">
  <input type="text" name="productName" placeholder="Tên sản phẩm" required>
  <textarea name="description" placeholder="Mô tả" required></textarea>
  <input type="number" name="price" placeholder="Giá" step="0.01" required>
  <input type="number" name="stock" placeholder="Số lượng" required>
  
  <select name="categoryId" required>
    <option value="1">Danh mục 1</option>
    <option value="2">Danh mục 2</option>
  </select>

  <!-- Chọn 1 trong 2 -->
  <label>Cách 1: Upload ảnh từ máy</label>
  <input type="file" name="image" accept="image/*">

  <p>HOẶC</p>

  <label>Cách 2: Dán URL ảnh từ internet</label>
  <input type="url" name="imageUrl" placeholder="https://example.com/image.jpg">

  <button type="submit">Tạo Sản Phẩm</button>
</form>

<script>
document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const productData = Object.fromEntries(formData);
  const imageFile = formData.get('image');

  try {
    if (imageFile && imageFile.size > 0) {
      // Upload file
      await createProductWithFileUpload(productData, imageFile);
    } else {
      // Upload từ URL
      await createProductWithImageUrl(productData);
    }
    alert('✓ Tạo sản phẩm thành công!');
    e.target.reset();
  } catch (error) {
    alert('✗ Lỗi: ' + error.message);
  }
});
</script>
*/

module.exports = {
  createProductWithFileUpload,
  createProductWithImageUrl,
  updateProductWithImage,
  deleteProduct,
  displayProductImage
};
