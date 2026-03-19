# HỆ THỐNG THƯƠNG MẠI ĐIỆN TỬ - E-COMMERCE STORE

Đồ án đại học - Hệ thống thương mại điện tử sử dụng Node.js, Express.js và SQL Server

## CÔNG NGHỆ SỬ DỤNG

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Microsoft SQL Server** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Nodemailer** - Email service

### Frontend
- **HTML5** - Markup language
- **CSS3** - Styling
- **Bootstrap 5** - CSS framework
- **JavaScript** - Programming language
- **Fetch API** - HTTP requests

### Bảo mật
- Password hashing với Bcrypt
- JWT Authentication
- Rate limiting
- XSS protection
- SQL Injection prevention
- HTTP security headers (Helmet)
- CORS protection
- Request logging

## CẤU TRÚC PROJECT

```
DoAn2_HT_ThuongMaiDienTu/
├── backend/
│   ├── config/
│   │   ├── database.js          # Kết nối SQL Server
│   │   └── config.js            # Cấu hình chung
│   ├── controllers/
│   │   ├── authController.js    # Xác thực
│   │   ├── productController.js # Sản phẩm
│   │   ├── categoryController.js # Danh mục
│   │   ├── cartController.js    # Giỏ hàng
│   │   ├── orderController.js   # Đơn hàng
│   │   ├── reviewController.js  # Đánh giá
│   │   └── adminController.js   # Quản trị
│   ├── models/
│   │   ├── UserModel.js         # Model User
│   │   ├── ProductModel.js      # Model Product
│   │   ├── CategoryModel.js     # Model Category
│   │   ├── CartModel.js         # Model Cart
│   │   ├── OrderModel.js        # Model Order
│   │   └── ReviewModel.js       # Model Review
│   ├── routes/
│   │   ├── authRoutes.js        # Routes xác thực
│   │   ├── productRoutes.js     # Routes sản phẩm
│   │   ├── categoryRoutes.js    # Routes danh mục
│   │   ├── cartRoutes.js        # Routes giỏ hàng
│   │   ├── orderRoutes.js       # Routes đơn hàng
│   │   ├── reviewRoutes.js      # Routes đánh giá
│   │   └── adminRoutes.js       # Routes admin
│   ├── middleware/
│   │   ├── auth.js              # Middleware xác thực
│   │   ├── security.js          # Middleware bảo mật
│   │   ├── validation.js        # Middleware validate
│   │   ├── errorHandler.js      # Xử lý lỗi
│   │   └── logger.js            # Logger
│   ├── services/
│   │   └── emailService.js      # Service gửi email
│   ├── utils/                   # Các hàm tiện ích
│   ├── logs/                    # Thư mục log files
│   ├── .env                     # Biến môi trường
│   ├── .env.example             # Mẫu file .env
│   ├── .gitignore              # Git ignore
│   ├── package.json            # Dependencies
│   └── server.js               # Entry point
│
└── frontend/
    ├── pages/
    │   ├── index.html          # Trang chủ
    │   ├── login.html          # Đăng nhập
    │   ├── register.html       # Đăng ký
    │   ├── products.html       # Danh sách sản phẩm
    │   ├── product-detail.html # Chi tiết sản phẩm
    │   ├── cart.html           # Giỏ hàng
    │   ├── checkout.html       # Thanh toán
    │   ├── orders.html         # Đơn hàng
    │   └── profile.html        # Thông tin cá nhân
    ├── css/
    │   └── style.css           # CSS tùy chỉnh
    ├── js/
    │   ├── config.js           # Cấu hình API
    │   ├── auth.js             # Xác thực helper
    │   ├── index.js            # Script trang chủ
    │   ├── login.js            # Script đăng nhập
    │   └── ...                 # Các script khác
    └── images/                 # Hình ảnh
```

## CÀI ĐẶT VÀ CHẠY PROJECT

### 1. Yêu cầu hệ thống

- Node.js >= 14.x
- SQL Server 2016 trở lên
- npm hoặc yarn

### 2. Clone project

```bash
git clone <repository-url>
cd DoAn2_HT_ThuongMaiDienTu
```

### 3. Cài đặt Backend

```bash
cd backend
npm install
```

### 4. Cấu hình Database

Tạo database trong SQL Server bằng script SQL sau:

```sql
-- Tạo database
CREATE DATABASE EcommerceDB;
GO

USE EcommerceDB;
GO

-- Bảng Users
CREATE TABLE Users (
    UserId INT PRIMARY KEY IDENTITY(1,1),
    Username NVARCHAR(50) UNIQUE NOT NULL,
    Email NVARCHAR(100) UNIQUE NOT NULL,
    Password NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(100) NOT NULL,
    Phone NVARCHAR(20),
    Address NVARCHAR(500),
    IsAdmin BIT DEFAULT 0,
    IsLocked BIT DEFAULT 0,
    LoginAttempts INT DEFAULT 0,
    LockedUntil DATETIME,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Bảng Categories
CREATE TABLE Categories (
    CategoryId INT PRIMARY KEY IDENTITY(1,1),
    CategoryName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500)
);

-- Bảng Products
CREATE TABLE Products (
    ProductId INT PRIMARY KEY IDENTITY(1,1),
    ProductName NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX),
    Price DECIMAL(18,2) NOT NULL,
    Stock INT NOT NULL DEFAULT 0,
    CategoryId INT,
    ImageUrl NVARCHAR(500),
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (CategoryId) REFERENCES Categories(CategoryId)
);

-- Bảng Cart
CREATE TABLE Cart (
    CartId INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    ProductId INT NOT NULL,
    Quantity INT NOT NULL DEFAULT 1,
    FOREIGN KEY (UserId) REFERENCES Users(UserId),
    FOREIGN KEY (ProductId) REFERENCES Products(ProductId)
);

-- Bảng Orders
CREATE TABLE Orders (
    OrderId INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    TotalAmount DECIMAL(18,2) NOT NULL,
    ShippingAddress NVARCHAR(500) NOT NULL,
    Phone NVARCHAR(20) NOT NULL,
    Status NVARCHAR(50) DEFAULT N'Chờ xác nhận',
    OrderDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(UserId)
);

-- Bảng OrderDetails
CREATE TABLE OrderDetails (
    OrderDetailId INT PRIMARY KEY IDENTITY(1,1),
    OrderId INT NOT NULL,
    ProductId INT NOT NULL,
    Quantity INT NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    FOREIGN KEY (OrderId) REFERENCES Orders(OrderId),
    FOREIGN KEY (ProductId) REFERENCES Products(ProductId)
);

-- Bảng Reviews
CREATE TABLE Reviews (
    ReviewId INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    ProductId INT NOT NULL,
    Rating INT NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
    Comment NVARCHAR(1000),
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(UserId),
    FOREIGN KEY (ProductId) REFERENCES Products(ProductId)
);

-- Insert dữ liệu mẫu
-- Admin user (password: Admin@123)
INSERT INTO Users (Username, Email, Password, FullName, IsAdmin) 
VALUES ('admin', 'admin@ecommerce.com', '$2b$10$XYZ...', N'Administrator', 1);

-- Categories
INSERT INTO Categories (CategoryName, Description) VALUES
(N'Điện thoại', N'Điện thoại di động các loại'),
(N'Laptop', N'Máy tính xách tay'),
(N'Phụ kiện', N'Phụ kiện điện thoại, laptop');
```

### 5. Cấu hình môi trường

Tạo file `.env` trong thư mục `backend`:

```bash
cp .env.example .env
```

Chỉnh sửa file `.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=EcommerceDB
DB_USER=sa
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=7d

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password_here
EMAIL_FROM=noreply@ecommerce.com

# Security Configuration
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=30
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 6. Cấu hình Email (Gmail)

1. Đăng nhập Gmail
2. Bật xác thực 2 bước
3. Tạo App Password: https://myaccount.google.com/apppasswords
4. Sử dụng App Password trong file `.env`

### 7. Chạy Backend Server

```bash
# Development mode (với nodemon)
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại: `http://localhost:5000`

### 8. Chạy Frontend

Mở file `frontend/pages/index.html` bằng:
- Live Server extension trong VS Code
- Hoặc mở trực tiếp bằng browser
- Hoặc dùng `http-server`:

```bash
cd frontend
npx http-server -p 3000
```

Frontend sẽ chạy tại: `http://localhost:3000`

## API ENDPOINTS

### Authentication APIs

```
POST   /api/auth/register      - Đăng ký tài khoản
POST   /api/auth/login         - Đăng nhập
POST   /api/auth/logout        - Đăng xuất
GET    /api/auth/profile       - Lấy thông tin user
PUT    /api/auth/profile       - Cập nhật profile
```

### Product APIs

```
GET    /api/products           - Lấy danh sách sản phẩm
GET    /api/products/:id       - Lấy chi tiết sản phẩm
GET    /api/products/search    - Tìm kiếm sản phẩm
```

### Category APIs

```
GET    /api/categories         - Lấy danh sách danh mục
GET    /api/categories/:id     - Lấy chi tiết danh mục
```

### Cart APIs (Cần authentication)

```
GET    /api/cart               - Lấy giỏ hàng
POST   /api/cart/add           - Thêm vào giỏ hàng
PUT    /api/cart/update        - Cập nhật giỏ hàng
DELETE /api/cart/remove/:id    - Xóa khỏi giỏ hàng
DELETE /api/cart/clear          - Xóa toàn bộ giỏ hàng
```

### Order APIs (Cần authentication)

```
POST   /api/orders/create      - Tạo đơn hàng
GET    /api/orders/history     - Lịch sử đơn hàng
GET    /api/orders/:id         - Chi tiết đơn hàng
```

### Review APIs

```
POST   /api/reviews            - Tạo đánh giá (cần auth)
GET    /api/reviews/:productId - Lấy đánh giá sản phẩm
```

### Admin APIs (Cần quyền admin)

```
# Products
POST   /api/admin/products     - Tạo sản phẩm
PUT    /api/admin/products/:id - Cập nhật sản phẩm
DELETE /api/admin/products/:id - Xóa sản phẩm

# Categories
POST   /api/admin/categories     - Tạo danh mục
PUT    /api/admin/categories/:id - Cập nhật danh mục
DELETE /api/admin/categories/:id - Xóa danh mục

# Orders
GET    /api/admin/orders       - Lấy tất cả đơn hàng
PUT    /api/admin/orders/:id   - Cập nhật trạng thái

# Users
GET    /api/admin/users        - Lấy tất cả users
PUT    /api/admin/users/:id/toggle-lock - Khóa/Mở user

# Statistics
GET    /api/admin/statistics   - Lấy thống kê
```

## HƯỚNG DẪN SỬ DỤNG

### Đăng ký tài khoản

1. Mở trang đăng ký
2. Điền thông tin: username, email, password, họ tên
3. Password phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường và số
4. Click "Đăng ký"

### Đăng nhập

1. Mở trang đăng nhập
2. Nhập email và password
3. Click "Đăng nhập"
4. Hệ thống sẽ khóa tài khoản sau 5 lần đăng nhập sai

### Mua sắm

1. Xem danh sách sản phẩm
2. Click vào sản phẩm để xem chi tiết
3. Click "Thêm vào giỏ hàng"
4. Vào giỏ hàng để xem và chỉnh sửa
5. Click "Đặt hàng" và điền thông tin giao hàng
6. Xác nhận đơn hàng
7. Nhận email xác nhận

### Quản trị (Admin)

1. Đăng nhập với tài khoản admin
2. Truy cập trang admin
3. Quản lý sản phẩm, danh mục, đơn hàng, users
4. Xem thống kê

## TÍNH NĂNG BẢO MẬT

### 1. Password Hashing
- Sử dụng bcrypt với salt rounds = 10
- Password không được lưu dạng plain text

### 2. JWT Authentication
- Token expire sau 7 ngày
- Token được gửi qua Authorization header
- Verify token mỗi request

### 3. Login Protection
- Giới hạn 5 lần đăng nhập sai
- Tự động khóa tài khoản 30 phút
- Admin có thể mở khóa thủ công

### 4. Rate Limiting
- Giới hạn 100 requests/15 phút
- Giới hạn 10 lần đăng nhập/15 phút

### 5. Input Validation
- Validate tất cả input với express-validator
- Kiểm tra format email, phone, v.v.

### 6. SQL Injection Prevention
- Sử dụng parameterized queries
- Không concatenate SQL strings

### 7. XSS Protection
- Sử dụng xss-clean middleware
- Sanitize HTML input

### 8. Security Headers
- Helmet middleware
- CORS configuration
- HPP protection

### 9. Logging
- Log tất cả requests
- Log security events
- Log login attempts

## TROUBLESHOOTING

### Lỗi kết nối Database

```
Error: Failed to connect to SQL Server
```

**Giải pháp:**
- Kiểm tra SQL Server đang chạy
- Kiểm tra thông tin kết nối trong `.env`
- Bật TCP/IP trong SQL Server Configuration Manager
- Kiểm tra firewall

### Lỗi không gửi được email

```
Error: Invalid login
```

**Giải pháp:**
- Kiểm tra email và app password trong `.env`
- Bật "Less secure app access" (hoặc dùng App Password)
- Kiểm tra kết nối internet

### Lỗi CORS

```
CORS policy: No 'Access-Control-Allow-Origin' header
```

**Giải pháp:**
- Kiểm tra `FRONTEND_URL` trong `.env`
- Đảm bảo CORS middleware được cấu hình đúng

## LIÊN HỆ HỖ TRỢ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra logs trong thư mục `backend/logs/`
2. Kiểm tra console của browser (F12)
3. Đọc lại hướng dẫn cài đặt

## LICENSE

Đồ án đại học - Chỉ sử dụng cho mục đích học tập

---

**Chúc bạn thành công với đồ án!** 🎉
