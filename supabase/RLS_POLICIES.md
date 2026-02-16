# Row Level Security (RLS) Policies - Tết Connect

## Tổng quan

Row Level Security (RLS) là tính năng bảo mật của PostgreSQL cho phép kiểm soát quyền truy cập dữ liệu ở cấp độ hàng (row). Trong Tết Connect, RLS đảm bảo:

- Người dùng chỉ xem được dữ liệu của gia đình mình
- Người dùng chỉ sửa/xóa được dữ liệu của chính mình
- Admin có quyền quản lý gia đình
- Hệ thống vẫn có thể tạo thông báo tự động

## Cấu trúc Policies

### 1. Users Table

**Mục đích**: Bảo vệ thông tin cá nhân người dùng

| Policy | Quyền | Điều kiện |
|--------|-------|-----------|
| Users can read own data | SELECT | `auth.uid() = id` |
| Users can update own data | UPDATE | `auth.uid() = id` |

**Giải thích**: Người dùng chỉ đọc và cập nhật được thông tin của chính mình.

---

### 2. Families Table

**Mục đích**: Kiểm soát quyền truy cập và quản lý "Nhà"

| Policy | Quyền | Điều kiện |
|--------|-------|-----------|
| Members can read family | SELECT | User là thành viên của nhà |
| Authenticated users can create families | INSERT | User đã đăng nhập và là người tạo |
| Admins can update family | UPDATE | User là admin của nhà |
| Admins can delete family | DELETE | User là admin của nhà |

**Giải thích**: 
- Mọi thành viên đều xem được thông tin nhà
- Bất kỳ ai đã đăng nhập đều có thể tạo nhà mới
- Chỉ admin mới có thể sửa/xóa nhà

---

### 3. Family Members Table

**Mục đích**: Quản lý danh sách thành viên trong nhà

| Policy | Quyền | Điều kiện |
|--------|-------|-----------|
| Members can read family members | SELECT | User là thành viên của nhà |
| Users can join families | INSERT | User tự thêm mình vào nhà |
| Admins can manage family members | DELETE | User là admin của nhà |

**Giải thích**:
- Thành viên xem được danh sách thành viên khác
- Người dùng có thể tự tham gia nhà (qua invite code)
- Admin có thể xóa thành viên

---

### 4. Posts Table

**Mục đích**: Bảo vệ bài đăng trên tường nhà

| Policy | Quyền | Điều kiện |
|--------|-------|-----------|
| Members can read family posts | SELECT | Bài đăng thuộc nhà của user |
| Members can create posts | INSERT | User là thành viên và là tác giả |
| Users can update own posts | UPDATE | User là tác giả bài đăng |
| Users can delete own posts | DELETE | User là tác giả bài đăng |

**Giải thích**:
- Chỉ thành viên mới xem được bài đăng trong nhà
- Thành viên có thể tạo bài đăng mới
- Chỉ tác giả mới sửa/xóa được bài đăng của mình

---

### 5. Reactions Table

**Mục đích**: Kiểm soát reactions trên bài đăng

| Policy | Quyền | Điều kiện |
|--------|-------|-----------|
| Members can read reactions | SELECT | Reaction thuộc bài đăng trong nhà |
| Members can create reactions | INSERT | User là thành viên và là người react |
| Users can update own reactions | UPDATE | User là người tạo reaction |
| Users can delete own reactions | DELETE | User là người tạo reaction |

**Giải thích**:
- Thành viên xem được reactions trong nhà
- Thành viên có thể thêm reaction
- Chỉ người tạo mới sửa/xóa được reaction của mình

---

### 6. Events Table

**Mục đích**: Bảo vệ sự kiện gia đình

| Policy | Quyền | Điều kiện |
|--------|-------|-----------|
| Members can read family events | SELECT | Sự kiện thuộc nhà của user |
| Members can create events | INSERT | User là thành viên và là người tạo |
| Event creators can update events | UPDATE | User là người tạo sự kiện |
| Event creators can delete events | DELETE | User là người tạo sự kiện |

**Giải thích**:
- Thành viên xem được sự kiện trong nhà
- Thành viên có thể tạo sự kiện mới
- Chỉ người tạo mới sửa/xóa được sự kiện

---

### 7. Event Tasks Table

**Mục đích**: Quản lý công việc trong sự kiện

| Policy | Quyền | Điều kiện |
|--------|-------|-----------|
| Members can read event tasks | SELECT | Task thuộc sự kiện trong nhà |
| Members can create event tasks | INSERT | User là thành viên của nhà |
| Assigned users can update tasks | UPDATE | User được phân công task |
| Event creators can delete tasks | DELETE | User là người tạo sự kiện |

**Giải thích**:
- Thành viên xem được tasks trong nhà
- Thành viên có thể tạo task mới
- Người được phân công có thể cập nhật trạng thái task
- Người tạo sự kiện có thể xóa task

---

### 8. Photos Table

**Mục đích**: Bảo vệ album ảnh gia đình

| Policy | Quyền | Điều kiện |
|--------|-------|-----------|
| Members can read family photos | SELECT | Ảnh thuộc nhà của user |
| Members can upload photos | INSERT | User là thành viên và là người upload |
| Users can delete own photos | DELETE | User là người upload ảnh |

**Giải thích**:
- Thành viên xem được ảnh trong nhà
- Thành viên có thể upload ảnh mới
- Chỉ người upload mới xóa được ảnh của mình

---

### 9. Notifications Table

**Mục đích**: Bảo vệ thông báo cá nhân

| Policy | Quyền | Điều kiện |
|--------|-------|-----------|
| Users can read own notifications | SELECT | Thông báo của user |
| Users can update own notifications | UPDATE | Thông báo của user (mark as read) |
| System can create notifications | INSERT | Luôn cho phép (cho background jobs) |
| Users can delete own notifications | DELETE | Thông báo của user |

**Giải thích**:
- User chỉ xem được thông báo của mình
- User có thể đánh dấu đã đọc
- Hệ thống có thể tạo thông báo tự động
- User có thể xóa thông báo của mình

---

## Kiểm tra RLS

### Chạy verification script

```bash
# Kết nối đến Supabase database
psql $DATABASE_URL -f supabase/verify_rls.sql
```

### Kiểm tra thủ công

```sql
-- Kiểm tra RLS đã bật chưa
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Xem tất cả policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### Test RLS policies

```sql
-- Set user context (giả lập user đăng nhập)
SET request.jwt.claim.sub = 'user-uuid-here';

-- Thử query dữ liệu
SELECT * FROM posts; -- Chỉ thấy posts của nhà mình

-- Thử insert dữ liệu
INSERT INTO posts (family_id, user_id, content, type)
VALUES ('family-uuid', 'user-uuid', 'Test', 'loi-chuc');
-- Chỉ thành công nếu user là thành viên của family
```

---

## Lưu ý Quan trọng

### 1. auth.uid()

`auth.uid()` là function của Supabase trả về UUID của user hiện tại từ JWT token. Nếu không có token (chưa đăng nhập), function trả về NULL và tất cả policies sẽ fail.

### 2. Performance

RLS policies được evaluate cho mỗi query, có thể ảnh hưởng performance. Để tối ưu:

- Đảm bảo có indexes trên các cột được dùng trong policies
- Tránh subqueries phức tạp trong policies
- Sử dụng `USING` clause cho SELECT và `WITH CHECK` cho INSERT/UPDATE

### 3. Testing

Luôn test RLS policies với nhiều scenarios:

- User chưa đăng nhập
- User đăng nhập nhưng không thuộc nhà
- User là member
- User là admin
- User cố gắng truy cập dữ liệu của nhà khác

### 4. Debugging

Nếu query bị reject bởi RLS:

```sql
-- Tắt RLS tạm thời để debug (chỉ dùng trong development)
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;

-- Bật lại sau khi debug xong
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
```

### 5. Bypass RLS

Service role key của Supabase có thể bypass RLS. Chỉ dùng service role key cho:

- Background jobs (tạo notifications)
- Admin operations
- Data migrations

**KHÔNG BAO GIỜ** expose service role key ra client!

---

## Migration

### Apply migration

```bash
# Local development
supabase db push

# Production
supabase db push --linked
```

### Rollback (nếu cần)

```sql
-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE families DISABLE ROW LEVEL SECURITY;
-- ... (tương tự cho các bảng khác)

-- Drop all policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Members can read family" ON families;
-- ... (tương tự cho các policies khác)
```

---

## Tham khảo

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Tết Connect Design Document](../.kiro/specs/tet-connect/design.md)
