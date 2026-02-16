# Database Schema Documentation

## Tổng quan

Database schema cho Tết Connect được thiết kế để hỗ trợ 3 tính năng cốt lõi:
1. **AI Content Generation**: Tạo và chia sẻ câu đối, lời chúc Tết
2. **Event Management**: Quản lý lịch họp mặt và phân công công việc
3. **Photo Album**: Lưu trữ và chia sẻ ảnh gia đình

## Entity Relationship Diagram

```
users ──┬─── families (created_by)
        │
        ├─── family_members ───┬─── families
        │                      │
        ├─── posts ────────────┤
        │                      │
        ├─── reactions         │
        │                      │
        ├─── events ───────────┤
        │                      │
        ├─── event_tasks       │
        │                      │
        ├─── photos ───────────┤
        │                      │
        └─── notifications     │
                               │
        reactions ─── posts ───┘
        event_tasks ─── events ┘
```

## Tables

### 1. users

Lưu thông tin người dùng từ Google OAuth.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | User ID (auto-generated) |
| email | TEXT | UNIQUE, NOT NULL | Email từ Google |
| name | TEXT | NOT NULL | Tên hiển thị |
| avatar | TEXT | NULL | URL avatar từ Google |
| created_at | TIMESTAMP | DEFAULT NOW() | Thời gian tạo |

**Indexes:**
- Primary key: `id`
- Unique index: `email`

**Validates Requirements:** 1.3, 1.4

---

### 2. families

Lưu thông tin "Nhà" (family space) - không gian riêng của mỗi gia đình.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Family ID |
| name | TEXT | NOT NULL | Tên nhà |
| invite_code | TEXT | UNIQUE, NOT NULL | Mã mời (8 ký tự) |
| created_by | UUID | FK → users(id) | Người tạo nhà |
| created_at | TIMESTAMP | DEFAULT NOW() | Thời gian tạo |

**Indexes:**
- Primary key: `id`
- Unique index: `invite_code`
- Index: `created_by`

**Validates Requirements:** 2.3

---

### 3. family_members

Quan hệ nhiều-nhiều giữa users và families. Một user có thể thuộc nhiều nhà, một nhà có nhiều thành viên.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Member ID |
| family_id | UUID | FK → families(id) | ID của nhà |
| user_id | UUID | FK → users(id) | ID của user |
| role | TEXT | CHECK IN ('admin', 'member') | Vai trò |
| joined_at | TIMESTAMP | DEFAULT NOW() | Thời gian tham gia |

**Constraints:**
- UNIQUE(family_id, user_id) - Một user chỉ có thể tham gia một nhà một lần

**Indexes:**
- Primary key: `id`
- Unique composite: `(family_id, user_id)`
- Index: `user_id`

**Validates Requirements:** 2.4, 3.5

---

### 4. posts

Lưu bài đăng trên tường nhà (câu đối, lời chúc, thiệp Tết).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Post ID |
| family_id | UUID | FK → families(id) | Nhà chứa bài đăng |
| user_id | UUID | FK → users(id) | Người đăng |
| content | TEXT | NOT NULL | Nội dung bài đăng |
| type | TEXT | CHECK IN ('cau-doi', 'loi-chuc', 'thiep-tet') | Loại nội dung |
| created_at | TIMESTAMP | DEFAULT NOW() | Thời gian đăng |

**Indexes:**
- Primary key: `id`
- Index: `family_id` (để query nhanh)
- Index: `created_at DESC` (để sắp xếp timeline)

**Validates Requirements:** 5.1, 5.2, 5.3, 5.4, 5.5

---

### 5. reactions

Lưu reactions của người dùng trên bài đăng (tim, haha).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Reaction ID |
| post_id | UUID | FK → posts(id) | Bài đăng được react |
| user_id | UUID | FK → users(id) | Người react |
| type | TEXT | CHECK IN ('heart', 'haha') | Loại reaction |
| created_at | TIMESTAMP | DEFAULT NOW() | Thời gian react |

**Constraints:**
- UNIQUE(post_id, user_id) - Mỗi user chỉ có 1 reaction trên mỗi post

**Indexes:**
- Primary key: `id`
- Unique composite: `(post_id, user_id)`
- Index: `post_id`

**Validates Requirements:** 6.2, 6.3, 6.4, 6.5

---

### 6. events

Lưu sự kiện Tết của gia đình (cúng tất niên, mùng 1, v.v.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Event ID |
| family_id | UUID | FK → families(id) | Nhà tổ chức sự kiện |
| title | TEXT | NOT NULL | Tiêu đề sự kiện |
| date | TIMESTAMP | NOT NULL | Ngày giờ diễn ra |
| location | TEXT | NULL | Địa điểm |
| created_by | UUID | FK → users(id) | Người tạo sự kiện |
| created_at | TIMESTAMP | DEFAULT NOW() | Thời gian tạo |

**Indexes:**
- Primary key: `id`
- Index: `family_id`
- Index: `date` (để query sự kiện sắp tới)

**Validates Requirements:** 7.4, 7.5

---

### 7. event_tasks

Lưu công việc được phân công trong sự kiện.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Task ID |
| event_id | UUID | FK → events(id) | Sự kiện chứa công việc |
| task | TEXT | NOT NULL | Mô tả công việc |
| assigned_to | UUID | FK → users(id) | Người được phân công |
| status | TEXT | CHECK IN ('pending', 'completed'), DEFAULT 'pending' | Trạng thái |
| created_at | TIMESTAMP | DEFAULT NOW() | Thời gian tạo |

**Indexes:**
- Primary key: `id`
- Index: `event_id`
- Index: `assigned_to`

**Validates Requirements:** 8.4, 8.5, 8.7

---

### 8. photos

Lưu metadata của ảnh. File ảnh thực tế được lưu trong Supabase Storage.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Photo ID |
| family_id | UUID | FK → families(id) | Nhà chứa ảnh |
| user_id | UUID | FK → users(id) | Người upload |
| url | TEXT | NOT NULL | URL ảnh trong Storage |
| uploaded_at | TIMESTAMP | DEFAULT NOW() | Thời gian upload |

**Indexes:**
- Primary key: `id`
- Index: `family_id`
- Index: `uploaded_at DESC` (để sắp xếp timeline)

**Validates Requirements:** 10.4, 10.5, 10.6, 11.1, 11.2

---

### 9. notifications

Lưu thông báo nhắc nhở cho người dùng.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Notification ID |
| user_id | UUID | FK → users(id) | Người nhận thông báo |
| type | TEXT | CHECK IN ('event_reminder', 'task_reminder') | Loại thông báo |
| title | TEXT | NOT NULL | Tiêu đề |
| content | TEXT | NOT NULL | Nội dung |
| link | TEXT | NULL | Link đến trang liên quan |
| read | BOOLEAN | DEFAULT FALSE | Đã đọc chưa |
| created_at | TIMESTAMP | DEFAULT NOW() | Thời gian tạo |

**Indexes:**
- Primary key: `id`
- Index: `user_id`
- Index: `read` (để query thông báo chưa đọc)

**Validates Requirements:** 9.1, 9.2, 9.3, 9.4, 9.5

---

## Foreign Key Relationships

Tất cả foreign keys đều có `ON DELETE CASCADE` để đảm bảo data integrity:

- Khi xóa user → xóa tất cả families, posts, reactions, events, tasks, photos, notifications của user đó
- Khi xóa family → xóa tất cả members, posts, events, photos của family đó
- Khi xóa post → xóa tất cả reactions của post đó
- Khi xóa event → xóa tất cả tasks của event đó

## Data Integrity Constraints

### CHECK Constraints

1. **family_members.role**: Chỉ cho phép 'admin' hoặc 'member'
2. **posts.type**: Chỉ cho phép 'cau-doi', 'loi-chuc', hoặc 'thiep-tet'
3. **reactions.type**: Chỉ cho phép 'heart' hoặc 'haha'
4. **event_tasks.status**: Chỉ cho phép 'pending' hoặc 'completed'
5. **notifications.type**: Chỉ cho phép 'event_reminder' hoặc 'task_reminder'

### UNIQUE Constraints

1. **users.email**: Mỗi email chỉ có một tài khoản
2. **families.invite_code**: Mỗi mã mời là duy nhất
3. **family_members(family_id, user_id)**: Một user chỉ tham gia một nhà một lần
4. **reactions(post_id, user_id)**: Một user chỉ có một reaction trên mỗi post

## Performance Optimization

### Indexes

Các indexes được tạo để tối ưu các query phổ biến:

1. **Timeline queries**: Index trên `created_at DESC` và `uploaded_at DESC`
2. **Family filtering**: Index trên `family_id` cho tất cả bảng liên quan
3. **User lookups**: Index trên `email`, `user_id`
4. **Event reminders**: Index trên `events.date`
5. **Unread notifications**: Index trên `notifications.read`

### Query Patterns

Các query patterns được tối ưu:

```sql
-- Lấy posts của một family (sử dụng idx_posts_family_id và idx_posts_created_at)
SELECT * FROM posts 
WHERE family_id = ? 
ORDER BY created_at DESC;

-- Lấy thông báo chưa đọc (sử dụng idx_notifications_user_id và idx_notifications_read)
SELECT * FROM notifications 
WHERE user_id = ? AND read = false 
ORDER BY created_at DESC;

-- Lấy sự kiện sắp tới (sử dụng idx_events_family_id và idx_events_date)
SELECT * FROM events 
WHERE family_id = ? AND date >= NOW() 
ORDER BY date ASC;
```

## Storage Buckets

### Photos Bucket

**Configuration:**
- **Bucket ID**: `photos`
- **Public Access**: `true` (để dễ dàng hiển thị ảnh)
- **File Size Limit**: 10MB (10,485,760 bytes)
- **Allowed MIME Types**: 
  - `image/jpeg`
  - `image/png`
  - `image/heic`

**Storage Structure:**
```
photos/
  └── {family_id}/
      └── {timestamp}-{filename}
```

**Storage Policies:**
- Users có thể upload ảnh vào folder của family họ
- Users có thể xem ảnh của family họ
- Users có thể xóa ảnh của chính họ

### Videos Bucket

**Configuration:**
- **Bucket ID**: `videos`
- **Public Access**: `true`
- **File Size Limit**: 100MB (104,857,600 bytes)
- **Allowed MIME Types**: 
  - `video/mp4`
  - `video/webm`

**Storage Structure:**
```
videos/
  └── {family_id}/
      └── recap-{timestamp}.mp4
```

**Storage Policies:**
- Users có thể upload video vào folder của family họ
- Users có thể xem video của family họ
- Users có thể xóa video của chính họ

## Security Considerations

1. **Row Level Security (RLS)**: Đã được cấu hình trong task 2.2 để đảm bảo users chỉ truy cập được dữ liệu của gia đình mình
2. **Storage Policies**: Đã được cấu hình trong task 2.3 để bảo vệ files trong Storage
3. **Cascade Deletes**: Tự động xóa dữ liệu liên quan khi xóa parent record
4. **Data Validation**: CHECK constraints đảm bảo dữ liệu hợp lệ
5. **Unique Constraints**: Ngăn chặn duplicate data
6. **File Size Limits**: Giới hạn kích thước file để tránh lạm dụng storage

## Next Steps

Sau khi hoàn thành database setup, cần thực hiện:

1. **Task 3+**: Implement application logic và UI
