# Hướng Dẫn Upload & Lưu Ảnh Trực Tiếp Trên Ổ Đĩa

## Tổng Quan

Hệ thống đã được cập nhật để hỗ trợ:
1. **Upload ảnh trực tiếp** từ máy tính (file)
2. **Download & lưu ảnh** từ URL Internet
3. Phục vụ ảnh **trực tiếp từ server** thay vì URL ngoài

---

## Thay Đổi Trong Cơ Sở Dữ Liệu

❌ **CŨ**: Lưu đường dẫn URL đầy đủ (https://example.com/image.jpg)

✅ **MỚI**: Lưu đường dẫn tương đối (/uploads/images/filename.jpg)

**Cách chuyển đổi dữ liệu cũ:**
```sql
-- Script để chuyển đổi URL cũ sang đường dẫn mới
-- (Tùy chọn: nếu bạn muốn giữ URL cũ vì ảnh đã xóa từ server)
-- Hiện tại: Không cần, các ảnh mới sẽ tự động lưu đúng định dạng
```

---

## Cách Sử Dụng API

### 1. **Tạo Sản Phẩm Với Upload File**

**Endpoint**: `POST /api/admin/products`

**Headers**: 
- `Content-Type: multipart/form-data`
- `Authorization: Bearer <token>`

**Body** (Form Data):
```
productName: "Tên Sản Phẩm"
description: "Mô tả sản phẩm"
price: 99.99
stock: 100
categoryId: 1
image: <file.jpg>  ← Upload file ảnh
```

**Response** (thành công):
```json
{
  "success": true,
  "message": "Tạo sản phẩm thành công",
  "data": {
    "ProductId": 1,
    "ProductName": "Tên Sản Phẩm",
    "Price": 99.99,
    ...
  }
}
```

---

### 2. **Tạo Sản Phẩm Với URL Ảnh Từ Internet**

**Endpoint**: `POST /api/admin/products`

**Headers**:
- `Content-Type: application/json`
- `Authorization: Bearer <token>`

**Body** (JSON):
```json
{
  "productName": "Tên Sản Phẩm",
  "description": "Mô tả sản phẩm",
  "price": 99.99,
  "stock": 100,
  "categoryId": 1,
  "imageUrl": "https://example.com/image.jpg"
}
```

**Quá trình**:
1. Server tải ảnh từ URL
2. Lưu vào thư mục `/uploads/images/`
3. Lưu đường dẫn tương đối vào database

---

### 3. **Cập Nhật Sản Phẩm**

Tương tự như tạo sản phẩm, nhưng dùng `PUT` thay vì `POST`:

**Endpoint**: `PUT /api/admin/products/:id`

```
productName: "Tên Mới"
description: "Mô tả mới"
price: 129.99
stock: 150
categoryId: 1
image: <file.jpg>  ← Optional: upload ảnh mới
```

**Lưu ý**:
- Nếu upload ảnh mới → ảnh cũ sẽ được **xóa tự động**
- Nếu không upload ảnh → sẽ giữ ảnh cũ
- Nếu gửi `imageUrl` từ internet → download & lưu, xóa ảnh cũ

---

### 4. **Xem Ảnh**

Ảnh được phục vụ tự động từ endpoint:

```
http://localhost:5000/uploads/images/downloaded-1234567890.jpg
http://localhost:5000/uploads/images/tenfile-9876543210.jpg
```

**Trong Frontend**:
```html
<!-- Ảnh từ server local -->
<img src="http://localhost:5000/uploads/images/filename.jpg" alt="Product">

<!-- Hoặc nếu cảu hình proxy trong frontend -->
<img src="/api/uploads/images/filename.jpg" alt="Product">
```

---

## Cấu Trúc Thư Mục

```
backend/
├── uploads/
│   └── images/
│       ├── product-1709864400000.jpg
│       ├── downloaded-1709864500000.png
│       └── ...
├── middleware/
│   ├── upload.js          ← Xử lý upload files
│   └── ...
├── utils/
│   ├── imageUtils.js      ← Download & lưu ảnh
│   └── ...
├── controllers/
│   ├── adminController.js ← Cập nhật để xử lý ảnh
│   └── ...
└── server.js              ← Cấu hình serve static files
```

---

## Giới Hạn & Cấu Hình

**File Upload**:
- Định dạng cho phép: JPEG, PNG, GIF, WebP
- Dung lượng tối đa: **5MB** (có thể điều chỉnh trong `middleware/upload.js`)
- Lưu tại: `backend/uploads/images/`

**Image Download**:
- Tất cả URL hợp lệ từ internet được hỗ trợ
- Nếu download thất bại → API trả về lỗi

---

## Ví Dụ Frontend (JavaScript)

### Upload File Ảnh

```javascript
// FormData để upload file
const formData = new FormData();
formData.append('productName', 'Sản phẩm mới');
formData.append('description', 'Mô tả');
formData.append('price', 99.99);
formData.append('stock', 100);
formData.append('categoryId', 1);
formData.append('image', fileInput.files[0]); // File từ <input type="file">

const response = await fetch('http://localhost:5000/api/admin/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log(result);
```

### Upload Từ URL Ảnh Internet

```javascript
const data = {
  productName: 'Sản phẩm mới',
  description: 'Mô tả',
  price: 99.99,
  stock: 100,
  categoryId: 1,
  imageUrl: 'https://example.com/image.jpg'
};

const response = await fetch('http://localhost:5000/api/admin/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(data)
});

const result = await response.json();
console.log(result);
```

---

## Xử Lý Lỗi

**Lỗi Upload File**:
```json
{
  "success": false,
  "message": "Chỉ cho phép file ảnh (JPEG, PNG, GIF, WebP)"
}
```

**Lỗi Download URL**:
```json
{
  "success": false,
  "message": "Không thể tải được ảnh từ URL: ..."
}
```

---

## Migration Từ Hệ Thống Cũ

Nếu bạn có dữ liệu cũ với URL từ internet, có hai lựa chọn:

1. **Giữ URL cũ**: Không cần làm gì, ảnh vẫn tải từ internet
2. **Chuyển sang local**: Viết script để download tất cả ảnh cũ và cập nhật database

```sql
-- Ví dụ: Lấy tất cả URL ảnh cũ
SELECT ProductID, ImageURL FROM ProductImages WHERE ImageURL LIKE 'https://%';
```

---

## Troubleshooting

**❌ Ảnh không hiển thị**:
- Kiểm tra file có trong `backend/uploads/images/`
- Kiểm tra server có chạy và phục vụ `/uploads`
- Kiểm tra URL trong database (phải bắt đầu bằng `/uploads/images/`)

**❌ Upload thất bại**:
- Kiểm tra Content-Type header
- Kiểm tra dung lượng file (< 5MB)
- Kiểm tra định dạng file (JPEG, PNG, GIF, WebP)

**❌ Download URL thất bại**:
- Kiểm tra URL có truy cập được không
- Kiểm tra firewall/proxy
- Thử dùng image URL khác

---

## Cấu Hình Bổ Sung (Tùy Chọn)

### Thay Đổi Dung Lượng Tối Đa

**File**: `backend/middleware/upload.js`

```javascript
const upload = multer({
  // ...
  limits: {
    fileSize: 10 * 1024 * 1024 // Thay đổi thành 10MB
  }
});
```

### Thay Đổi Vị Trí Lưu Ảnh

**File**: `backend/middleware/upload.js`

```javascript
const uploadDir = path.join(__dirname, '../my-custom-uploads'); // Điều chỉnh đường dẫn
```

Sau đó, cập nhật trong `server.js`:

```javascript
app.use('/uploads', express.static(path.join(__dirname, 'my-custom-uploads')));
```

---

## Clean Up & Maintenance

### Xóa Ảnh Unused

```bash
# Terminal - Xóa toàn bộ ảnh (cẩn thận!)
rm -r backend/uploads/images/*

# Windows PowerShell
Remove-Item -Path "backend/uploads/images/*" -Force
```

### Backup Ảnh

```bash
# Linux/Mac
cp -r backend/uploads backup-uploads-$(date +%Y%m%d)

# Windows
Copy-Item -Path "backend/uploads" -Destination "backup-uploads-$(Get-Date -Format yyyyMMdd)" -Recurse
```

---

**✅ Hoàn tất! Hệ thống sẵn sàng sử dụng.**
