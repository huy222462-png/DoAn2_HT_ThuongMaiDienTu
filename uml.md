# PHÂN TÍCH THIẾT KẾ UML - HỆ THỐNG THƯƠNG MẠI ĐIỆN TỬ

Tài liệu này đã được chuẩn hóa theo đúng 4 mục bạn yêu cầu:

1. Biểu đồ Use Case
2. Biểu đồ tuần tự
3. Biểu đồ lớp
4. Biểu đồ phân cấp chức năng

Phần DFD mức 0, 1, 2 được giữ lại ở phụ lục để phục vụ báo cáo chi tiết luồng dữ liệu.

## 1. Biểu đồ Use Case

```mermaid
flowchart LR
    khach([Khách vãng lai])
    nguoidung([Người dùng])
    quantri([Quản trị viên])

    subgraph hethong[Hệ thống thương mại điện tử]
        uc1((Đăng ký))
        uc2((Đăng nhập))
        uc3((Xem danh sách sản phẩm))
        uc4((Tìm kiếm sản phẩm))
        uc5((Xem chi tiết sản phẩm))
        uc6((Quản lý giỏ hàng))
        uc7((Đặt hàng))
        uc8((Xem lịch sử đơn hàng))
        uc9((Đánh giá sản phẩm))
        uc10((Quản lý yêu thích))
        uc11((Chatbot tư vấn))
        uc12((Quản lý sản phẩm))
        uc13((Quản lý danh mục))
        uc14((Quản lý đơn hàng))
        uc15((Quản lý người dùng))
        uc16((Xem thống kê))
        uc17((Xử lý trả hàng/hoàn tiền))
        uc18((Gửi email khuyến mãi))
    end

    khach --> uc1
    khach --> uc2
    khach --> uc3
    khach --> uc4
    khach --> uc5
    khach --> uc11

    nguoidung --> uc2
    nguoidung --> uc3
    nguoidung --> uc4
    nguoidung --> uc5
    nguoidung --> uc6
    nguoidung --> uc7
    nguoidung --> uc8
    nguoidung --> uc9
    nguoidung --> uc10
    nguoidung --> uc11

    quantri --> uc12
    quantri --> uc13
    quantri --> uc14
    quantri --> uc15
    quantri --> uc16
    quantri --> uc17
    quantri --> uc18
```

## 2. Biểu đồ tuần tự

### 2.1 Tuần tự đặt hàng

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant FE as Frontend
    participant OC as OrderController
    participant CM as CartModel
    participant OM as OrderModel
    participant PM as ProductModel/Variant
    participant ES as EmailService
    participant DB as SQL Server

    U->>FE: Nhấn "Đặt hàng"
    FE->>OC: POST /api/orders/create
    OC->>CM: Lấy giỏ hàng theo UserId
    CM->>DB: SELECT cart_items
    DB-->>CM: Danh sách sản phẩm trong giỏ
    CM-->>OC: Dữ liệu giỏ hàng

    OC->>OM: createOrder(user, items, shipping, payment)
    OM->>PM: Kiểm tra tồn kho sản phẩm/biến thể
    PM->>DB: SELECT stock
    DB-->>PM: Số lượng tồn
    PM-->>OM: Kết quả kiểm tra

    alt Đủ tồn kho
        OM->>DB: INSERT orders + order_items (transaction)
        OM->>DB: UPDATE stock sản phẩm/biến thể
        OM->>CM: clearCart(UserId)
        CM->>DB: DELETE cart_items
        OM->>ES: enqueueOrderConfirmation(order)
        ES-->>OM: Đã xếp hàng gửi mail
        OM-->>OC: Trả thông tin đơn hàng thành công
        OC-->>FE: 201 Created + order
        FE-->>U: Hiển thị xác nhận đơn hàng
    else Thiếu tồn kho
        OM-->>OC: Báo lỗi tồn kho
        OC-->>FE: 400 Bad Request
        FE-->>U: Hiển thị lỗi "không đủ hàng"
    end
```

### 2.2 Tuần tự đăng nhập

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant FE as Frontend
    participant AC as AuthController
    participant UM as UserModel
    participant DB as SQL Server

    U->>FE: Nhập email/tên đăng nhập + mật khẩu
    FE->>AC: POST /api/auth/login
    AC->>UM: findByLoginIdentifier(identifier)
    UM->>DB: SELECT user by email/username
    DB-->>UM: Hồ sơ người dùng
    UM-->>AC: User
    AC->>UM: comparePassword(password)

    alt Đăng nhập hợp lệ
        AC->>UM: resetLoginAttempts()
        AC-->>FE: 200 OK + JWT + profile
        FE-->>U: Chuyển trang chính
    else Sai mật khẩu
        AC->>UM: incrementLoginAttempts()
        AC-->>FE: 401 Unauthorized
        FE-->>U: Thông báo lỗi đăng nhập
    end
```

## 3. Biểu đồ lớp

```mermaid
classDiagram
    class User {
      +int UserId
      +string Username
      +string Email
      +string Password
      +string FullName
      +string Phone
      +string Address
      +bool IsAdmin
      +bool IsLocked
      +int LoginAttempts
      +datetime LockedUntil
      +create()
      +findByEmail()
      +findByLoginIdentifier()
      +comparePassword()
      +incrementLoginAttempts()
      +resetLoginAttempts()
    }

    class Product {
      +int ProductId
      +string ProductName
      +string Description
      +decimal Price
      +decimal SalePrice
      +int Stock
      +int CategoryId
      +getAll()
      +findById()
      +search()
      +create()
      +update()
      +delete()
    }

    class ProductVariant {
      +int VariantId
      +int ProductId
      +string VariantName
      +decimal Price
      +int Stock
      +string VariantImageUrl
      +string VariantImagesJson
    }

    class Category {
      +int CategoryId
      +string CategoryName
      +string Description
      +getAll()
      +create()
      +update()
      +delete()
    }

    class Cart {
      +int CartId
      +int UserId
      +int ProductId
      +int VariantId
      +int Quantity
      +getCartByUserId()
      +findCartItem()
      +addToCart()
      +updateQuantity()
      +removeFromCart()
      +clearCart()
    }

    class Order {
      +int OrderId
      +int UserId
      +decimal TotalAmount
      +string ShippingAddress
      +string Phone
      +string PaymentMethod
      +string CouponCode
      +decimal DiscountAmount
      +string Status
      +datetime OrderDate
      +create()
      +findById()
      +getOrderHistory()
      +updateStatus()
      +cancelOrder()
      +requestReturn()
    }

    class OrderItem {
      +int OrderItemId
      +int OrderId
      +int ProductId
      +int VariantId
      +string VariantName
      +int Quantity
      +decimal Price
      +decimal Subtotal
    }

    class Review {
      +int ReviewId
      +int UserId
      +int ProductId
      +int Rating
      +string Comment
      +create()
      +getByProductId()
    }

    class Wishlist {
      +int WishlistId
      +int UserId
      +int ProductId
      +add()
      +remove()
      +exists()
      +getByUserId()
    }

    class AuthController {
      +register()
      +login()
      +getProfile()
      +updateProfile()
      +changePassword()
      +forgotPassword()
      +resetPassword()
    }

    class AdminController {
      +createProduct()
      +updateProduct()
      +deleteProduct()
      +getStatistics()
      +getAllUsers()
      +getAllOrders()
      +updateOrderStatus()
      +processReturnRequest()
    }

    class OrderController {
      +createOrder()
      +previewOrderPricing()
      +getOrderHistory()
      +getOrderById()
      +cancelOrder()
      +requestReturn()
    }

    class EmailService {
      +enqueueOrderConfirmation()
      +sendPromotionCampaign()
    }

    User "1" --> "n" Cart : sở hữu
    User "1" --> "n" Order : đặt
    User "1" --> "n" Review : viết
    User "1" --> "n" Wishlist : yêu thích

    Category "1" --> "n" Product : phân loại
    Product "1" --> "n" ProductVariant : có biến thể
    Product "1" --> "n" Review : nhận đánh giá
    Product "1" --> "n" Cart : được thêm vào

    Order "1" --> "n" OrderItem : chứa
    OrderItem "n" --> "1" Product : tham chiếu

    AuthController --> User : thao tác
    AdminController --> Product : quản trị
    AdminController --> Category : quản trị
    AdminController --> Order : quản trị
    OrderController --> Cart : đọc
    OrderController --> Order : tạo
    OrderController --> ProductVariant : cập nhật tồn kho
    OrderController --> EmailService : kích hoạt gửi mail
```

## 4. Biểu đồ phân cấp chức năng

```mermaid
flowchart TD
    F0([Hệ thống thương mại điện tử])

    F0 --> F1([1. Quản lý tài khoản])
    F0 --> F2([2. Quản lý sản phẩm])
    F0 --> F3([3. Quản lý giỏ hàng và đơn hàng])
    F0 --> F4([4. Tương tác người dùng])
    F0 --> F5([5. Quản trị hệ thống])

    F1 --> F11([1.1 Đăng ký])
    F1 --> F12([1.2 Đăng nhập/Đăng xuất])
    F1 --> F13([1.3 Hồ sơ cá nhân])
    F1 --> F14([1.4 Quên/Đặt lại mật khẩu])

    F2 --> F21([2.1 Danh mục sản phẩm])
    F2 --> F22([2.2 Danh sách sản phẩm])
    F2 --> F23([2.3 Chi tiết sản phẩm])
    F2 --> F24([2.4 Tìm kiếm/Lọc/Sắp xếp])

    F3 --> F31([3.1 Thêm/Cập nhật/Xóa giỏ hàng])
    F3 --> F32([3.2 Xem phí và mã giảm giá])
    F3 --> F33([3.3 Tạo đơn hàng])
    F3 --> F34([3.4 Lịch sử/chi tiết đơn])
    F3 --> F35([3.5 Hủy đơn/Trả hàng])

    F4 --> F41([4.1 Đánh giá sản phẩm])
    F4 --> F42([4.2 Danh sách yêu thích])
    F4 --> F43([4.3 Chatbot tư vấn])

    F5 --> F51([5.1 Quản lý người dùng])
    F5 --> F52([5.2 Quản lý sản phẩm và biến thể])
    F5 --> F53([5.3 Quản lý danh mục])
    F5 --> F54([5.4 Quản lý đơn hàng/hoàn tiền])
    F5 --> F55([5.5 Thống kê doanh thu])
    F5 --> F56([5.6 Gửi email khuyến mãi])
```

## 5. Phụ lục: DFD mức 0, 1, 2

### 5.1 DFD mức 0 (Context Diagram)

```mermaid
flowchart LR
    customer([Người dùng])
    admin([Quản trị viên])
    payment([Cổng thanh toán/COD])
    mail([Dịch vụ Email])

    p0((P0: Nền tảng thương mại điện tử))

    customer -- Đăng ký/đăng nhập, tìm sản phẩm, đặt hàng --> p0
    p0 -- Kết quả tìm kiếm, dữ liệu giỏ hàng, trạng thái đơn --> customer

    admin -- Quản lý sản phẩm, đơn hàng, người dùng --> p0
    p0 -- Báo cáo thống kê và kết quả xử lý --> admin

    p0 -- Yêu cầu thanh toán --> payment
    payment -- Kết quả thanh toán --> p0

    p0 -- Gửi email xác nhận/khuyến mãi --> mail
    mail -- Trạng thái gửi mail --> p0
```

### 5.2 DFD mức 1

```mermaid
flowchart TB
    customer([Người dùng])
    admin([Quản trị viên])
    mail([Dịch vụ Email])

    p1((1.0 Xác thực và hồ sơ))
    p2((2.0 Quản lý sản phẩm và danh mục))
    p3((3.0 Giỏ hàng và đơn hàng))
    p4((4.0 Đánh giá và yêu thích))
    p5((5.0 Quản trị và thống kê))

    d1[(D1 Users)]
    d2[(D2 Products)]
    d3[(D3 ProductVariants)]
    d4[(D4 Categories)]
    d5[(D5 Cart)]
    d6[(D6 Orders)]
    d7[(D7 OrderItems)]
    d8[(D8 Reviews)]
    d9[(D9 Wishlist)]

    customer --> p1
    p1 --> customer
    p1 <--> d1

    customer --> p2
    p2 --> customer
    p2 <--> d2
    p2 <--> d3
    p2 <--> d4

    customer --> p3
    p3 --> customer
    p3 <--> d5
    p3 <--> d6
    p3 <--> d7
    p3 <--> d2
    p3 <--> d3
    p3 --> mail

    customer --> p4
    p4 --> customer
    p4 <--> d8
    p4 <--> d9
    p4 <--> d2

    admin --> p5
    p5 --> admin
    p5 <--> d1
    p5 <--> d2
    p5 <--> d3
    p5 <--> d4
    p5 <--> d6
    p5 <--> d7
    p5 --> mail
```

### 5.3 DFD mức 2 - Quy trình 1.0 (Xác thực và hồ sơ)

```mermaid
flowchart TB
    user([Người dùng])
    d1[(D1 Users)]
    mail([Dịch vụ Email])

    p11((1.1 Đăng ký tài khoản))
    p12((1.2 Đăng nhập + khóa tài khoản))
    p13((1.3 Cập nhật hồ sơ))
    p14((1.4 Quên/Đặt lại mật khẩu))

    user -- Thông tin đăng ký --> p11
    p11 -- Kết quả tạo tài khoản --> user
    p11 <--> d1

    user -- Identifier + mật khẩu --> p12
    p12 <--> d1
    p12 -- JWT/Thông báo lỗi --> user

    user -- Yêu cầu cập nhật hồ sơ --> p13
    p13 <--> d1
    p13 -- Hồ sơ đã cập nhật --> user

    user -- Yêu cầu đặt lại mật khẩu --> p14
    p14 <--> d1
    p14 --> mail
    p14 -- Liên kết reset/Thông báo --> user
```

### 5.4 DFD mức 2 - Quy trình 3.0 (Giỏ hàng và đơn hàng)

```mermaid
flowchart TB
    user([Người dùng])
    d2[(D2 Products)]
    d3[(D3 ProductVariants)]
    d5[(D5 Cart)]
    d6[(D6 Orders)]
    d7[(D7 OrderItems)]
    mail([Dịch vụ Email])

    p31((3.1 Thêm/Cập nhật/Xóa giỏ hàng))
    p32((3.2 Xem trước giá + mã giảm giá))
    p33((3.3 Tạo đơn hàng))
    p34((3.4 Lịch sử + chi tiết đơn))
    p35((3.5 Hủy đơn/Trả hàng))

    user --> p31
    p31 <--> d5
    p31 <--> d2
    p31 <--> d3
    p31 --> user

    user --> p32
    p32 <--> d5
    p32 --> user

    user --> p33
    p33 <--> d5
    p33 <--> d2
    p33 <--> d3
    p33 <--> d6
    p33 <--> d7
    p33 --> mail
    p33 --> user

    user --> p34
    p34 <--> d6
    p34 <--> d7
    p34 --> user

    user --> p35
    p35 <--> d6
    p35 <--> d7
    p35 <--> d2
    p35 <--> d3
    p35 --> user
```

### 5.5 DFD mức 2 - Quy trình 5.0 (Quản trị và thống kê)

```mermaid
flowchart TB
    admin([Quản trị viên])
    d1[(D1 Users)]
    d2[(D2 Products)]
    d3[(D3 ProductVariants)]
    d4[(D4 Categories)]
    d6[(D6 Orders)]
    d7[(D7 OrderItems)]
    mail([Dịch vụ Email])

    p51((5.1 CRUD sản phẩm + biến thể))
    p52((5.2 CRUD danh mục))
    p53((5.3 Quản lý đơn + hoàn trả))
    p54((5.4 Quản lý người dùng))
    p55((5.5 Thống kê doanh thu + top sản phẩm))
    p56((5.6 Gửi email khuyến mãi))

    admin --> p51
    p51 <--> d2
    p51 <--> d3
    p51 --> admin

    admin --> p52
    p52 <--> d4
    p52 --> admin

    admin --> p53
    p53 <--> d6
    p53 <--> d7
    p53 --> admin

    admin --> p54
    p54 <--> d1
    p54 --> admin

    admin --> p55
    p55 <--> d6
    p55 <--> d7
    p55 <--> d2
    p55 --> admin

    admin --> p56
    p56 <--> d1
    p56 --> mail
    p56 --> admin
```

## 6. Kết luận mức độ đầy đủ

- Với yêu cầu 4 mục UML (Use Case, tuần tự, lớp, phân cấp chức năng): tài liệu hiện tại đã đầy đủ.
- Nếu giảng viên yêu cầu thêm phân tích luồng dữ liệu, phần phụ lục DFD mức 0/1/2 đã sẵn sàng.
- Có thể tách mỗi biểu đồ thành một hình riêng trong báo cáo để dễ đánh số hình và thuyết minh.
