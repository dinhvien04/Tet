# Supabase Database Migrations

Thư mục này chứa các SQL migration files để thiết lập database schema cho Tết Connect.

## Cách chạy migrations

### Phương án 1: Sử dụng Supabase Dashboard (Khuyến nghị cho MVP)

1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.com)
2. Chọn project của bạn
3. Vào **SQL Editor** từ sidebar
4. Tạo một query mới
5. Copy toàn bộ nội dung từ file `migrations/001_create_tables.sql`
6. Paste vào SQL Editor và nhấn **Run**

### Phương án 2: Sử dụng Supabase CLI

Nếu bạn đã cài đặt [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
# Link project với local
supabase link --project-ref your-project-ref

# Chạy migrations
supabase db push
```

## Migrations

### 001_create_tables.sql

Tạo tất cả các bảng cơ sở dữ liệu:

- **users**: Thông tin người dùng từ Google OAuth
- **families**: Thông tin "Nhà" (family space)
- **family_members**: Quan hệ nhiều-nhiều giữa users và families
- **posts**: Bài đăng trên tường nhà
- **reactions**: Reactions của người dùng trên bài đăng
- **events**: Sự kiện Tết của gia đình
- **event_tasks**: Công việc được phân công trong sự kiện
- **photos**: Metadata của ảnh (file lưu trong Storage)
- **notifications**: Thông báo cho người dùng

Tất cả các bảng đều có:
- Foreign keys với ON DELETE CASCADE
- Indexes phù hợp để tối ưu query performance
- Constraints để đảm bảo data integrity

### 002_enable_rls.sql

Cấu hình Row Level Security (RLS) policies cho tất cả các bảng để đảm bảo:
- Users chỉ đọc được thông tin của chính mình
- Members chỉ truy cập được dữ liệu của nhà mình
- Bảo mật dữ liệu ở database level

### 003_setup_storage.sql

Thiết lập Storage Buckets cho photos và videos:

**Photos Bucket:**
- Public access: true
- File size limit: 10MB
- Allowed MIME types: image/jpeg, image/png, image/heic

**Videos Bucket:**
- Public access: true
- File size limit: 100MB
- Allowed MIME types: video/mp4, video/webm

**Storage Policies:**
- Users có thể upload files vào folder của family họ
- Users có thể xem files của family họ
- Users có thể xóa files của chính họ

## Bước tiếp theo

Sau khi chạy tất cả migrations, bạn có thể:

1. Chạy script `verify_tables.sql` để kiểm tra database schema
2. Chạy script `verify_storage.sql` để kiểm tra storage buckets
3. Bắt đầu implement application logic

## Kiểm tra

Để kiểm tra xem các bảng đã được tạo thành công:

```sql
-- Liệt kê tất cả các bảng
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Kiểm tra foreign keys
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

## Rollback

Nếu cần xóa tất cả các bảng (cẩn thận - sẽ mất hết dữ liệu!):

```sql
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS event_tasks CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS reactions CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS family_members CASCADE;
DROP TABLE IF EXISTS families CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```
