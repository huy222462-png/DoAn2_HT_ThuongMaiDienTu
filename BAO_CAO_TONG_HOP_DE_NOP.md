# BAO CAO TONG HOP DE NOP (GITHUB + NOTEBOOK)

## 1) Muc tieu file nay

File nay gom tat ca viec can lam cho bao cao, ket hop:
- Du an hien tai DoAn2_HT_ThuongMaiDienTu.
- 2 file PDF quy dinh.
- 1 file DOCX mau bao cao 2023.

Ban co the:
- Dua file nay len GitHub de quan ly tien do.
- Dan truc tiep vao notebook va lam theo checklist.

---

## 2) Nguon tai lieu da tong hop

### Nguon 1: 1 QUY DINH LAM BAI BAO CAO.pdf
Tom tat noi dung chinh da trich xuat duoc:
1. Cam sao chep de tai, cam copy tu khoa truoc hoac tren mang.
2. Khong dung web ma nguon mo san CSDL/giao dien (OpenCart, Wordpress, Magento, ...).
3. Phan cong cong viec trong nhom ro rang, bao cao dung nguoi lam.
4. Bao cao phai theo dung mau quy dinh, sai mau co the bi tru/0 diem.
5. Chuong Phan tich thiet ke phai the hien du:
   - Actor he thong (hoac DFD muc 0).
   - Chuc nang he thong (Use Case tong quat hoac DFD muc 1).
   - Luong hoat dong chuc nang (Sequence hoac DFD muc 2).
6. Chuong CSDL can co cac noi dung cot loi: thuc the, ERD, PDM, luoc do quan he, database diagram, mo ta bang va rang buoc.
7. Loi thuong gap: sai ten GVHD/de tai, sai bo cuc, sai format, loi chinh ta, copy noi dung khong chinh sua.

### Nguon 2: 2 QD309_Quy dinh ve chach thuc lam bao cao.pdf
- File co 18 trang.
- PDF dang scan/anh nen khong trich xuat text tu dong duoc.
- Cach dung trong file nay: tao checklist doi chieu QD309 de ban tick thu cong theo van ban goc.

### Nguon 3: 3 Mau bao cao DO AN_2023.docx
Da tong hop duoc cac muc chinh cua mau:
1. Trang bia + thong tin SV + GVHD.
2. Loi cam ta.
3. Nhan xet GV huong dan, GV phan bien.
4. Danh sach bang, danh sach bieu do/hinh.
5. Khung bieu do trong bao cao:
   - Nhom Use Case (1.1.x, 1.2.x, 1.3.x)
   - Nhom Sequence (2.x)
   - Class Diagram (Hinh 3)
   - Functional Decomposition (Hinh 4)
6. Danh muc tu viet tat, tai lieu tham khao, phu luc.

---

## 3) Hien trang du an de dua vao bao cao

## 3.1 Cong nghe
- Backend: Node.js, Express.js, SQL Server, JWT, Bcrypt, Nodemailer.
- Frontend: HTML/CSS/JS (Bootstrap, Fetch API).
- Bao mat: auth middleware, validation, security headers, logging.

## 3.2 Cum module chinh (theo code hien tai)
1. Xac thuc/ho so: dang ky, dang nhap, profile, doi/quen mat khau.
2. San pham/danh muc: danh sach, chi tiet, tim kiem, filter.
3. Gio hang/don hang: them gio, cap nhat so luong, dat hang, lich su don.
4. Tuong tac: review, wishlist, chatbot.
5. Quan tri: quan ly nguoi dung, san pham, danh muc, don hang, thong ke, email, hoan tra.

## 3.3 Cac diem nghiep vu da co de dua vao mo ta
- Luong dat hang co kiem tra ton kho + tao don + cap nhat gio hang.
- Luong admin cap nhat trang thai don.
- Da bo sung nghiep vu van chuyen/tracking (carrier, tracking code, shipping status) phuc vu use case van chuyen.
- Class diagram co the sinh truc tiep tu SQL schema.

---

## 4) Lo trinh 5 bang trong tam (goi y nop nhanh)

Muc tieu: lam dung 5 bang/hinh cot loi, du bao phu nghiep vu va de bao ve.

1. Bang 1: Use Case tong quat (Prompt A)
2. Bang 2: Use Case muc 2 Dat hang (Prompt C)
3. Bang 3: Sequence Dat hang (Prompt S2-RIENG)
4. Bang 4: Sequence Quan tri cap nhat xu ly don hang (Prompt S3-RIENG)
5. Bang 5: Functional Decomposition day du (Prompt F1, tach rieng)

Ghi chu:
- Class Diagram (Hinh 3) sinh tu SQL schema, khong tinh vao 5 bang tren.
- Neu con thoi gian: bo sung Sequence Van chuyen (Prompt S4-RIENG).

---

## 5) Noi dung can viet theo chuong (ban de notebook)

## Chuong Mo dau
Checklist:
- [ ] Ly do chon de tai.
- [ ] Muc tieu de tai.
- [ ] Pham vi de tai.
- [ ] Cong nghe su dung.
- [ ] Cau truc bao cao.

## Chuong 1 - Phan tich he thong
Checklist:
- [ ] Mo ta actor va vai tro.
- [ ] Bang danh sach actor.
- [ ] Bang danh sach use case.
- [ ] Hinh Use Case tong quat.
- [ ] Hinh Use Case dat hang (phan ra muc 2).
- [ ] Mo ta luong chinh + luong ngoai le.

## Chuong 2 - Thiet ke va mo hinh dong
Checklist:
- [ ] Sequence Dat hang.
- [ ] Sequence Admin xu ly don.
- [ ] (Neu co) Sequence Van chuyen.
- [ ] Mo ta message/chuyen trang thai.

## Chuong 3 - Thiet ke CSDL
Checklist:
- [ ] Liet ke thuc the/chuc nang du lieu.
- [ ] ERD.
- [ ] PDM (neu GV yeu cau).
- [ ] Luoc do quan he.
- [ ] Database Diagram tren SQL Server.
- [ ] Mo ta bang, kieu du lieu, PK/FK, rang buoc.
- [ ] Hinh Class Diagram tong quat (sinh tu schema/code).

## Chuong 4 - Phan cap chuc nang
Checklist:
- [ ] 1 hinh Functional Decomposition day du (Cap 0 -> Cap 1 -> Cap 2).
- [ ] Co the them Cap 3 cho 2 nhanh quan trong (Dat hang, Xu ly don/Van chuyen).
- [ ] Viet doan tong ket 7-10 dong.

## Chuong 5 - Cai dat, kiem thu, danh gia
Checklist:
- [ ] Mo ta kien truc backend/frontend.
- [ ] Mo ta API chinh theo module.
- [ ] Minh chung chuc nang da hoat dong.
- [ ] Kiem thu case thanh cong + case loi.
- [ ] Danh gia ket qua, han che, huong phat trien.

## Phan cuoi
Checklist:
- [ ] Ket luan.
- [ ] Huong phat trien.
- [ ] Tai lieu tham khao.
- [ ] Phu luc hinh/chup man hinh.

---

## 6) Mapping bao cao <-> code hien tai (de chung minh)

## 6.1 Xac thuc va nguoi dung
- backend/controllers/authController.js
- backend/routes/authRoutes.js
- backend/models/UserModel.js
- frontend/js/login.js, frontend/js/register.js, frontend/js/profile.js

## 6.2 San pham va danh muc
- backend/controllers/productController.js
- backend/controllers/categoryController.js
- backend/routes/productRoutes.js
- backend/routes/categoryRoutes.js
- backend/models/ProductModel.js
- backend/models/CategoryModel.js
- frontend/js/products.js, frontend/js/product-detail.js

## 6.3 Gio hang va don hang
- backend/controllers/cartController.js
- backend/controllers/orderController.js
- backend/models/CartModel.js
- backend/models/OrderModel.js
- backend/routes/cartRoutes.js
- backend/routes/orderRoutes.js
- frontend/js/cart.js, frontend/js/orders.js

## 6.4 Tuong tac
- backend/controllers/reviewController.js
- backend/controllers/chatController.js
- backend/routes/reviewRoutes.js
- backend/routes/chatRoutes.js
- frontend/js/chat-widget.js

## 6.5 Quan tri
- backend/controllers/adminController.js
- backend/routes/adminRoutes.js
- frontend/js/admin.js

## 6.6 Bao mat va middleware
- backend/middleware/auth.js
- backend/middleware/security.js
- backend/middleware/validation.js
- backend/middleware/errorHandler.js
- backend/middleware/logger.js

---

## 7) Checklist doi chieu QD309 (tick thu cong theo PDF goc)

Luu y: QD309 la PDF scan, can mo file goc de doi chieu cau hinh format.

- [ ] Font chu dung dung quy dinh QD309.
- [ ] Co chu dung dung quy dinh.
- [ ] Kich thuoc chu dong nhat tieu de/noi dung.
- [ ] Can le trang dung quy dinh.
- [ ] Gian dong, gian doan dung quy dinh.
- [ ] Danh so chuong/muc dung format.
- [ ] Danh sach hinh, bang, muc luc dung mau.
- [ ] Trich dan tai lieu tham khao dung quy dinh.
- [ ] Khong loi chinh ta, khong loi dau cau.

---

## 8) Ke hoach lam nhanh 2 ngay (co the sua)

Ngay 1:
1. Chot 5 bang trong tam (A, C, S2, S3, F1).
2. Sinh Class Diagram tu SQL schema.
3. Lap chuong 1-3 khung noi dung.

Ngay 2:
1. Hoan thien chuong 4-5.
2. Chen minh chung API/man hinh.
3. Doi chieu checklist QD309.
4. Soat loi chinh ta, bo cuc, ten GVHD/ten de tai.

---

## 9) Mau copy vao notebook (task board)

## TODO BAT BUOC
- [ ] Dien thong tin bia, GVHD, MSSV, lop.
- [ ] Hoan thanh 5 bang trong tam: A, C, S2-RIENG, S3-RIENG, F1.
- [ ] Sinh Class Diagram tu SQL.
- [ ] Hoan thanh chuong 1 -> 5.
- [ ] Them ket luan + huong phat trien + tai lieu tham khao.
- [ ] Doi chieu QD309 truoc khi nop.

## TODO MINH CHUNG DU AN
- [ ] Chup man hinh dang ky/dang nhap.
- [ ] Chup man hinh danh sach san pham/chi tiet.
- [ ] Chup man hinh gio hang/dat hang.
- [ ] Chup man hinh admin quan ly don.
- [ ] Chup man hinh van chuyen/tracking (neu co).

---

## 10) Tep lien quan da tao de ban theo doi

- Bao cao tong hop de nop: BAO_CAO_TONG_HOP_DE_NOP.md
- Tep trich xuat noi dung nguon: REPORT_SOURCES_EXTRACT.md
- Tep thu trich QD309 (scan): 2_QD309_extract.txt

Ket thuc. Ban chi can bam theo checklist de day nhanh tien do va giam thieu sot.
