# Mau lenh cho Gemini - Ve Use Case tong quat den phan ra

Tai lieu nay duoc viet de ban copy vao Gemini va tao Use Case theo dung du an DoAn2_HT_ThuongMaiDienTu.

## 0) Ban do nhanh (de khoi nham)

Neu ban can bieu do Use Case:
- Dung muc 2 -> 10.

Neu ban can bieu do Tuan tu:
- Dung muc 11.

Neu ban can bieu do Phan cap chuc nang:
- Dung muc 12 (Prompt F1).

Neu ban can lam nhanh de kip tien do:
- Use Case: A -> F roi U1 -> U11.
- Tuan tu: S1 roi S-NHANH.
- Phan cap: F1.

## 0.1) Lo trinh TRONG TAM (chi 4-5 bang de nop nhanh)

Neu ban muon tap trung, thi bo hien tai la nhieu. Dung bo rut gon sau:

Phuong an 4 bang (rat gon):
1. Bang 1: Use Case tong quat (Prompt A).
2. Bang 2: Use Case muc 2 Dat hang (Prompt C).
3. Bang 3: Sequence Dat hang (Prompt S2-RIENG).
4. Bang 4: Functional Decomposition (Prompt F1).

Phuong an 5 bang (can doi hon):
1. Bang 1: Use Case tong quat (Prompt A).
2. Bang 2: Use Case muc 2 Dat hang (Prompt C).
3. Bang 3: Sequence Dat hang (Prompt S2-RIENG).
4. Bang 4: Sequence Quan tri cap nhat xu ly don hang (Prompt S3-RIENG).
5. Bang 5: Functional Decomposition tach rieng (Prompt F1, lam o phan rieng).

Ghi chu:
- Class Diagram sinh truc tiep tu SQL schema, khong tinh vao 4-5 bang prompt.
- Prompt E chi dung de review cuoi, khong bat buoc neu qua gap.
- Bang 5 (Phan cap chuc nang) de tach thanh mot muc rieng, dat cuoi bao cao cho de trinh bay.

## 1) Tom tat he thong de dua vao prompt

He thong: Thuong mai dien tu (Node.js + Express + SQL Server, frontend HTML/CSS/JS).

Module chinh:
- Xac thuc tai khoan: dang ky, dang nhap, ho so, doi mat khau, quen mat khau.
- San pham va danh muc: danh sach, tim kiem, chi tiet, danh muc.
- Gio hang va don hang: them gio, cap nhat so luong, xem gia, dat hang, lich su don, huy don, tra hang, giao hang qua don vi van chuyen.
- Tuong tac: danh gia san pham, wishlist, chatbot.
- Quan tri: quan ly san pham/danh muc/don hang/nguoi dung, thong ke, xu ly hoan tra, gui email khuyen mai.

Tac nhan (actors):
- Khach vang lai
- Nguoi dung da dang nhap
- Quan tri vien
- Cong thanh toan (ngoai he thong)
- Dich vu email (ngoai he thong)
- Don vi van chuyen (ngoai he thong)

## 2) Prompt A - Ve Use Case tong quat

Ban la chuyen gia phan tich he thong. Hay tao bieu do Use Case TONG QUAT cho he thong thuong mai dien tu voi cac yeu cau:

1. Actor gom: Khach vang lai, Nguoi dung da dang nhap, Quan tri vien, Cong thanh toan, Dich vu email, Don vi van chuyen.
2. Nhom use case theo 5 cum:
   - Xac thuc va ho so
   - San pham va danh muc
   - Gio hang va don hang
   - Tuong tac nguoi dung
   - Quan tri he thong
3. Ve theo chuan UML, dat ten use case bang tieng Viet ro nghia.
4. Tra ve 2 phien ban:
   - PlantUML usecase
   - Mermaid (flowchart mo phong use case)
5. Sau bieu do, liet ke bang mapping Actor -> Use Case.

Thong tin he thong:
[Dan phan tom tat he thong o muc 1 vao day]

## 3) Prompt B - Phan ra Use Case muc 1 theo phan he

Hay phan ra Use Case thanh 5 bieu do muc 1 (moi bieu do cho 1 phan he):

- Phan he 1: Xac thuc va ho so
- Phan he 2: San pham va danh muc
- Phan he 3: Gio hang va don hang
- Phan he 4: Tuong tac nguoi dung
- Phan he 5: Quan tri he thong

Yeu cau:
1. Moi phan he phai co actor lien quan, use case chinh, va quan he include/extend neu co.
2. Ket qua moi phan he gom:
   - So do PlantUML
   - Danh sach use case va mo ta 1 dong cho tung use case
3. Neu co luong bat buoc (vi du: Dat hang phai bao gom kiem tra ton kho), dung include.
4. Neu co luong mo rong tuy dieu kien (vi du: Ap ma giam gia), dung extend.

Thong tin he thong:
[Dan phan tom tat he thong o muc 1 vao day]

## 4) Prompt C - Phan ra Use Case muc 2 cho Dat hang

Hay tao Use Case PHAN RA MUC 2 cho use case Dat hang trong he thong thuong mai dien tu.

Yeu cau chi tiet:
1. Actor chinh: Nguoi dung da dang nhap.
2. Actor phu: Cong thanh toan, Dich vu email.
3. Phan ra thanh cac buoc/use case con:
   - Xem gio hang
   - Chon dia chi giao hang
   - Chon phuong thuc thanh toan
   - Kiem tra ton kho san pham/variant
   - Tinh tong tien va giam gia
   - Tao don hang
   - Tru ton kho
   - Gui xac nhan email
   - Cap nhat lich su don
4. The hien include/extend va dieu kien tien/hau dieu kien.
5. Tra ve:
   - PlantUML
   - Bang dac ta use case (ten, actor, tien dieu kien, hau dieu kien, luong chinh, ngoai le)

Thong tin he thong:
[Dan phan tom tat he thong o muc 1 vao day]

## 5) Prompt D - Phan ra Use Case muc 2 cho Quan tri don hang

Hay tao Use Case PHAN RA MUC 2 cho phan he Quan tri don hang voi actor Quan tri vien.

Use case can co:
- Xem danh sach don
- Xem chi tiet don
- Cap nhat trang thai don
- Xu ly yeu cau tra hang
- Duyet/Tu choi hoan tien
- Gui thong bao cho khach

Yeu cau:
1. Dung include/extend dung logic nghiep vu.
2. Co cac ngoai le: don khong ton tai, trang thai khong hop le, khong du quyen.
3. Tra ve PlantUML + mo ta ngan cho tung use case.

## 6) Prompt E - Kiem tra chat luong bieu do

Hay review bo use case da tao va kiem tra 8 diem sau:
1. Co thieu actor nao khong?
2. Co use case nao dat ten mo ho khong?
3. Quan he include/extend da dung chua?
4. Co nham lan giua actor va he thong khong?
5. Co use case nao trung lap khong?
6. Co phan ra qua sau hoac qua nong khong?
7. Da bao phu day du user flow mua hang va admin flow chua?
8. De xuat 5 cai tien cu the.

Tra ve theo dang checklist dat/khong dat.

## 7) Prompt F - Mot lenh full (neu ban muon Gemini tu lam tu A->E)

Ban la chuyen gia UML. Dua tren he thong thuong mai dien tu sau, hay tao bo Use Case day du tu tong quat den phan ra:

Giai doan 1: Ve Use Case tong quat cho toan he thong.
Giai doan 2: Tach 5 so do muc 1 theo phan he (xac thuc, san pham, gio hang-don hang, tuong tac, quan tri).
Giai doan 3: Phan ra muc 2 cho 2 use case trong tam: Dat hang va Quan tri don hang.
Giai doan 4: Lap bang Actor -> Use Case va bang mo ta use case quan trong.
Giai doan 5: Tu review chat luong theo checklist 8 diem va de xuat cai tien.

Yeu cau output:
- Co PlantUML cho tat ca cac muc.
- Co mo ta ngan de dua vao bao cao.
- Dat ten use case bang tieng Viet, ro nghia, khong trung lap.

Thong tin he thong:
He thong: Thuong mai dien tu (Node.js + Express + SQL Server, frontend HTML/CSS/JS).
Module: xac thuc, san pham-danh muc, gio hang-don hang, review-wishlist-chatbot, admin-thong ke-hoan tra.
Actor: Khach vang lai, Nguoi dung da dang nhap, Quan tri vien, Cong thanh toan, Dich vu email.

## 8) Cach dung nhanh

- Buoc 1: Dung Prompt A de lay so do tong quat.
- Buoc 2: Dung Prompt B de co 5 so do muc 1.
- Buoc 3: Dung Prompt C va D cho muc 2.
- Buoc 4: Dung Prompt E de review va chot ban bao cao.
- Buoc 5: Neu muon nhanh, dung Prompt F.
## 9) [USE CASE] Cum prompt Use Case (lam het truoc)

Ban nen lam theo thu tu sau de de bam:

1. Prompt A -> F (co bo use case tong quat den phan ra co ban)
2. Prompt U1 -> U10 (bo sung dung theo danh muc hinh 1.x)
3. Prompt U11 (bo sung use case van chuyen voi don vi van chuyen)
4. Prompt E de review chat luong use case

## 10) [USE CASE] Prompt bo sung cho danh muc hinh Use Case (1.x)

### Prompt U1 - Hinh 1.1.2 Use Case Nguoi dung

Hay tao bieu do Use Case rieng cho tac nhan Nguoi dung da dang nhap.

Yeu cau:
1. Chi ve cac use case cua nguoi dung: xem san pham, tim kiem, xem chi tiet, quan ly gio hang, dat mua, xem lich su don, danh gia, wishlist, cap nhat ho so, doi mat khau, yeu cau tra hang.
2. Neu can, su dung include/extend dung nghiep vu.
3. Tra ve PlantUML + bang mo ta actor-use case.

### Prompt U2 - Hinh 1.1.3 Use Case Admin

Hay tao bieu do Use Case rieng cho tac nhan Quan tri vien.

Yeu cau:
1. Bao gom: quan ly nguoi dung, quan ly san pham, quan ly danh muc, quan ly don, xu ly hoan tra, thong ke, quan ly khuyen mai, gui email.
2. Co include/extend neu co buoc bat buoc/mo rong.
3. Tra ve PlantUML + mo ta ngan moi use case.

### Prompt U3 - Hinh 1.2.1 Phan ra chuc nang Quan ly thong tin

Hay tao use case phan ra cho chuc nang Quan ly thong tin.

Rang buoc:
1. Tach thanh cac use case con: xem thong tin, cap nhat thong tin, doi mat khau, xem dia chi giao hang, cap nhat dia chi.
2. Neu dang nhap la tien dieu kien thi ghi ro precondition.
3. Tra ve PlantUML + bang tien dieu kien/hau dieu kien.

### Prompt U4 - Hinh 1.2.2 Phan ra chuc nang Tim kiem

Hay tao use case phan ra cho chuc nang Tim kiem.

Rang buoc:
1. Gom: tim theo tu khoa, loc theo danh muc, loc theo gia, sap xep, xem ket qua, xem chi tiet tu ket qua.
2. Actor: khach vang lai va nguoi dung da dang nhap.
3. Tra ve PlantUML + mo ta luong chinh + 2 luong ngoai le (khong co ket qua, du lieu khong hop le).

### Prompt U5 - Hinh 1.2.3 Phan ra chuc nang Thong ke

Hay tao use case phan ra cho chuc nang Thong ke (actor: admin).

Rang buoc:
1. Gom: thong ke doanh thu, thong ke don theo trang thai, top san pham ban chay, thong ke nguoi dung, loc theo khoang thoi gian.
2. Co buoc xuat bao cao (neu co).
3. Tra ve PlantUML + mo ta nghiep vu ngan.

### Prompt U6 - Hinh 1.3.1 Phan ra chuc nang Quan ly nguoi dung

Hay tao use case phan ra cho Quan ly nguoi dung (admin).

Bao gom:
- xem danh sach
- xem chi tiet
- khoa/mo khoa tai khoan
- cap quyen admin/user
- tim kiem nguoi dung

Tra ve PlantUML + bang loi nghiep vu co the xay ra.

### Prompt U7 - Hinh 1.3.2 Phan ra chuc nang Quan ly san pham

Hay tao use case phan ra cho Quan ly san pham (admin).

Bao gom:
- them san pham
- cap nhat san pham
- xoa san pham
- quan ly bien the
- cap nhat ton kho
- gan danh muc

Tra ve PlantUML + ghi ro include/extend.

### Prompt U8 - Hinh 1.3.3 Phan ra chuc nang Dat mua

Hay tao use case phan ra cho Dat mua (nguoi dung).

Bao gom:
- them vao gio hang
- cap nhat so luong
- nhap ma giam gia
- chon thanh toan
- tao don
- xac nhan don

Tra ve PlantUML + bang dac ta use case Dat mua chi tiet.

### Prompt U9 - Hinh 1.3.4 Chuc nang Xu ly don hang

Hay tao use case phan ra cho Xu ly don hang (admin).

Bao gom:
- tiep nhan don
- xac nhan don
- chuan bi hang
- ban giao don vi van chuyen
- nhan/cap nhat ma van don
- giao hang
- cap nhat hoan tat/huy
- xu ly tra hang

Tra ve PlantUML + cac quy tac chuyen trang thai hop le + mapping trang thai voi don vi van chuyen.

### Prompt U11 - Use Case van chuyen voi don vi van chuyen

Hay tao use case phan ra cho chuc nang Van chuyen (admin + don vi van chuyen + nguoi dung).

Bao gom:
- tao yeu cau giao hang
- chon don vi van chuyen
- ban giao hang cho doi tac
- nhan ma van don
- cap nhat trang thai van chuyen
- nguoi dung theo doi hanh trinh
- xac nhan giao thanh cong/that bai

Yeu cau:
1. The hien actor Don vi van chuyen la actor ngoai he thong.
2. Dung include cho buoc bat buoc: tao yeu cau -> nhan ma van don.
3. Dung extend cho tinh huong giao that bai/hoan hang.
4. Tra ve PlantUML + bang mo ta use case va du lieu trao doi (ma van don, trang thai, thoi gian cap nhat).

### Prompt U10 - Hinh 1.3.5 Quan ly san pham khuyen mai

Hay tao use case phan ra cho Quan ly san pham khuyen mai (admin).

Bao gom:
- tao chuong trinh khuyen mai
- gan san pham vao khuyen mai
- dat % giam/so tien giam
- dat thoi gian ap dung
- bat/tat khuyen mai
- xem hieu qua khuyen mai

Tra ve PlantUML + luat nghiep vu de tranh trung khuyen mai.

## 11) [TUAN TU] Cum prompt Tuan tu (chi lam sau khi xong Use Case)

### Prompt S1 - Tuan tu tong quat (muc he thong)

Ban la chuyen gia UML. Hay tao BO BIEU DO TUAN TU cho he thong thuong mai dien tu nay.

Yeu cau:
1. Tao it nhat 4 sequence diagram:
   - Dang nhap
   - Dat hang
   - Huy don/Tra hang
   - Quan tri cap nhat trang thai don
2. Moi diagram phai co:
   - Actor
   - Frontend
   - Controller
   - Model/Service
   - Database
3. The hien duoc nhanh alt/opt khi co loi (vi du: sai mat khau, het hang).
4. Tra ve:
   - PlantUML
   - Mermaid sequenceDiagram
   - Mo ta 5-7 dong cho moi luong.

Thong tin he thong:
He thong: Thuong mai dien tu (Node.js + Express + SQL Server, frontend HTML/CSS/JS).
Module: xac thuc, san pham-danh muc, gio hang-don hang, review-wishlist-chatbot, admin-thong ke-hoan tra.

### S-RUT-GON - Lo trinh 3 bieu do tuan tu (khi gap thoi gian)

Neu ban da lam Prompt S1, thi de kip tien do hay lam tiep 3 prompt rieng le duoi day (khong gop):

Bo 3 bieu do nay da gom du:
- Luong khach hang dat mua.
- Luong xu ly don hang cua admin.
- Luong giao tiep don vi van chuyen va theo doi van don.

### Prompt S2-RIENG - Dat hang

Ban la chuyen gia UML. Toi da co bieu do tong quat (S1). Hay tao bieu do tuan tu RIENG cho use case Dat hang.

Yeu cau:
1. Doi tuong: Nguoi dung, Frontend, OrderController, CartModel, OrderModel, ProductModel/ProductVariant, EmailService, SQL Server.
2. Luong chinh: gui yeu cau dat hang -> lay gio hang -> kiem tra ton kho -> tinh tong tien -> tao order + order_items (transaction) -> tru ton kho -> xoa gio hang -> gui email xac nhan -> tra ket qua thanh cong.
3. Luong alt: gio hang rong, khong du ton kho, loi DB rollback.
4. Tra ve ca PlantUML va Mermaid sequenceDiagram + mo ta ngan 5-7 dong.

### Prompt S3-RIENG - Quan tri cap nhat xu ly don hang

Ban la chuyen gia UML. Toi da co bieu do tong quat (S1). Hay tao bieu do tuan tu RIENG cho use case Quan tri cap nhat xu ly don hang.

Yeu cau:
1. Doi tuong: Quan tri vien, Frontend Admin, middleware auth/admin, AdminController, OrderModel, SQL Server, EmailService.
2. Luong chinh: admin gui yeu cau cap nhat -> xac thuc quyen -> kiem tra don ton tai -> cap nhat trang thai don -> gui thong bao cho khach.
3. Luong alt: 401/403, don khong ton tai, trang thai khong hop le.
4. Tra ve ca PlantUML va Mermaid sequenceDiagram + mo ta ngan 5-7 dong.

### Prompt S4-RIENG - Van chuyen voi don vi van chuyen

Ban la chuyen gia UML. Toi da co bieu do tong quat (S1). Hay tao bieu do tuan tu RIENG cho use case Van chuyen voi don vi van chuyen.

Yeu cau:
1. Doi tuong: Admin, Frontend Admin, AdminController, OrderModel, Don vi van chuyen (API ngoai he thong), SQL Server, Nguoi dung.
2. Luong chinh bat buoc: chon don vi van chuyen -> tao shipment request -> nhan ma van don -> luu ma van don -> cap nhat trang thai van chuyen -> gui tracking cho nguoi dung -> ket thuc giao hang.
3. Luong alt: API don vi van chuyen loi, khong nhan duoc ma van don, callback sai ma don.
4. Tra ve ca PlantUML va Mermaid sequenceDiagram + mo ta ngan 5-7 dong.

Thong tin he thong:
He thong: Thuong mai dien tu (Node.js + Express + SQL Server, frontend HTML/CSS/JS).
Module: xac thuc, san pham-danh muc, gio hang-don hang, review-wishlist-chatbot, admin-thong ke-hoan tra.
Actor: Nguoi dung, Quan tri vien, Don vi van chuyen, Email service.

## 12) [PHAN CAP CHUC NANG] Prompt cho Hinh 4

Phan nay la MUC TACH RIENG (de lam Bang 5).
Khong gop voi cum Use Case/Tuan tu de tranh roi.

Ghi chu cho Hinh 3 (Class Diagram):
- Khong can sinh bang prompt trong tai lieu nay.
- Ban sinh truc tiep tu SQL schema (ERD/Database Diagram) de nhanh va sat CSDL thuc te.

### Prompt F1 - Hinh 4 Bieu do phan cap chuc nang

Hay tao Functional Decomposition Diagram DAY DU cho toan bo he thong thuong mai dien tu (chi 1 bang duy nhat, nhung bao phu het chuc nang).

Rang buoc cau truc:
1. Cap 0: He thong Thuong mai dien tu.
2. Cap 1: 5 nhom chuc nang lon:
   - Quan ly tai khoan va ho so
   - Quan ly san pham va danh muc
   - Gio hang, dat hang va thanh toan
   - Tuong tac nguoi dung
   - Quan tri va van hanh
3. Cap 2: Phan ra DAY DU chuc nang con cua tung nhom, co lay het nghiep vu trong du an:
   - Dang ky, dang nhap, quen/doi mat khau, cap nhat ho so, dia chi giao hang.
   - Danh sach san pham, tim kiem, loc/sap xep, chi tiet san pham, quan ly bien the-ton kho, gan danh muc.
   - Quan ly gio hang, dat hang, thanh toan, tao don, cap nhat trang thai don, huy don, tra hang/hoan tien, lich su don.
   - Danh gia san pham, wishlist, chatbot, thong bao email.
   - Quan ly nguoi dung, quan ly san pham/danh muc/don hang, thong ke, khuyen mai, van chuyen voi don vi van chuyen, theo doi ma van don.
4. Neu can, cho phep Cap 3 toi da 2 nhanh quan trong: Dat hang va Xu ly don/Van chuyen (khong can phan ra toan bo cap 3).

Yeu cau output:
1. Mermaid flowchart TD cho 1 bang duy nhat, bo cuc de doc tren A4 ngang.
2. Cay phan cap dang danh sach danh so: 1, 1.1, 1.1.1.
3. Doan mo ta tong ket 7-10 dong, nhan manh pham vi bao phu toan du an.

Thong tin he thong de bam sat:
- He thong: Thuong mai dien tu (Node.js + Express + SQL Server, frontend HTML/CSS/JS).
- Module: xac thuc, san pham-danh muc, gio hang-don hang, review-wishlist-chatbot, admin-thong ke-hoan tra.
- Tich hop ngoai he thong: cong thanh toan, email service, don vi van chuyen.

Muc tieu trinh bay (Bang 5):
- Chi 1 hinh phan cap chuc nang duy nhat nhung DAY DU nghiep vu trong du an.
- Uu tien ro rang, de doc, de dua truc tiep vao bao cao.

## 13) Lo trinh chay khong bi nham

Neu ban can dung danh muc hinh giong de cuong, chay theo thu tu:

1. A -> F (bo use case nen)
2. U1 -> U10 (hoan thien nhom hinh 1.x)
3. U11 (bo sung use case van chuyen)
4. Prompt E (review use case)
5. S1 (bat dau nhom TUAN TU)
6. S2-RIENG -> S3-RIENG -> S4-RIENG (lam tung bieu do tuan tu)
7. Hinh 3 sinh truc tiep tu SQL schema (khong dung prompt)
8. F1 (nhom PHAN CAP CHUC NANG)
9. Prompt E (review tong cuoi truoc khi dua vao bao cao)

### Lo trinh sieu gon de chay ngay (4-5 bang)

Neu can nop nhanh, chay dung thu tu sau:

1. A
2. C
3. S2-RIENG
4. S3-RIENG
5. F1 (tach rieng thanh Bang 5)
