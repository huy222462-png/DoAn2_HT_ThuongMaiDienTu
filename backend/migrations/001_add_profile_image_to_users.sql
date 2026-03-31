-- Migration: Thêm cột ProfileImage vào bảng Users
-- Ngày: 2026-03-20
-- Mô tả: Thêm cột ProfileImage để lưu đường dẫn ảnh đại diện người dùng

-- Kiểm tra xem cột đã tồn tại chưa
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'ProfileImage'
)
BEGIN
    -- Thêm cột ProfileImage vào bảng Users
    ALTER TABLE Users
    ADD ProfileImage NVARCHAR(500) NULL;
    
    PRINT 'Cột ProfileImage đã được thêm vào bảng Users';
END
ELSE
BEGIN
    PRINT 'Cột ProfileImage đã tồn tại trong bảng Users';
END;
