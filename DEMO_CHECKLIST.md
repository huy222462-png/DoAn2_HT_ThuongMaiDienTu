# DEMO CHECKLIST - LumiCart

Checklist nhanh truoc khi bao cao do an 2.

## 1) Khoi dong he thong

- Backend:
  - `npm --prefix backend start`
  - Xac nhan API song: `http://localhost:5000/health`
- Frontend:
  - Chay static server frontend (neu dang dung).

## 2) Kiem tra san sang bang 1 lenh

- Chay:
  - `npm --prefix backend run demo:check`
- Muc tieu:
  - Khong co `[FAIL]`
  - Cac `[WARN]` duoc hieu ro va chap nhan duoc trong demo.

## 3) Du lieu demo

- Co it nhat:
  - 1 san pham thuong
  - 1 san pham dang sale
  - 1 san pham co bien the + anh bien the
- Co category day du de loc.

## 4) Luong demo bat buoc

- Nguoi dung:
  - Dang ky / Dang nhap
  - Xem danh sach san pham
  - Xem chi tiet + chon bien the
  - Them gio hang + dat hang
  - Xem lich su don
- Admin:
  - Sua san pham
  - Them/sua bien the
  - Cap nhat sale
  - Xem dashboard doanh thu (ngay/thang/quy)
  - Duyet don

## 5) Diem can tranh loi khi demo

- Tranh chay 2 backend cung luc (xung dot cong).
- Neu cong 5000 bi ban, bat `AUTO_PORT_FALLBACK=true` trong `backend/.env`.
- Trinh duyet: dung Ctrl+F5 de tranh cache JS/CSS cu.

## 6) Plan B khi co su co

- Kich ban A: loi frontend cache
  - Ctrl+F5, mo Incognito.
- Kich ban B: backend khong len
  - Kiem tra `npm --prefix backend start` log
  - Kiem tra `http://localhost:5000/health`
- Kich ban C: loi du lieu
  - Chuyen sang data mau da duoc xac minh truoc.
