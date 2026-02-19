# Hướng Dẫn Cài Đặt - Tết Connect

## Yêu Cầu Hệ Thống

- Node.js 18+ và npm
- Tài khoản MongoDB Atlas (miễn phí)
- Tài khoản Google Cloud (cho OAuth)
- Tài khoản Cloudinary (miễn phí)
- Gemini API key (miễn phí)

## Bước 1: Clone Repository

```bash
git clone <repository-url>
cd tet-connect
```

## Bước 2: Cài Đặt Dependencies

```bash
npm install
```

## Bước 3: Thiết Lập MongoDB Atlas

### 3.1. Tạo Tài Khoản

1. Truy cập https://www.mongodb.com/cloud/atlas/register
2. Đăng ký tài khoản miễn phí
3. Xác nhận email

### 3.2. Tạo Cluster

1. Chọn "Build a Database"
2. Chọn "M0 Free" (miễn phí)
3. Chọn region gần nhất (Singapore cho Việt Nam)
4. Đặt tên cluster: `tet-connect`
5. Click "Create"

### 3.3. Tạo Database User

1. Vào "Database Access"
2. Click "Add New Database User"
3. Chọn "Password" authentication
4. Username: `tetconnect`
5. Password: Tạo mật khẩu mạnh (lưu lại)
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"

### 3.4. Whitelist IP Address

1. Vào "Network Access"
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"

### 3.5. Lấy Connection String

1. Vào "Database" → Click "Connect"
2. Chọn "Connect your application"
3. Copy connection string:
   ```
   mongodb+srv://tetconnect:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
   ```
4. Thay `<password>` bằng mật khẩu thực
5. Thêm tên database vào cuối:
   ```
   mongodb+srv://tetconnect:matkhau@cluster.mongodb.net/tet-connect?retryWrites=true&w=majority
   ```

## Bước 4: Thiết Lập Cloudinary

### 4.1. Tạo Tài Khoản

1. Truy cập https://cloudinary.com/users/register/free
2. Đăng ký tài khoản miễn phí
3. Xác nhận email

### 4.2. Lấy Credentials

1. Vào Dashboard
2. Copy các thông tin:
   - Cloud Name
   - API Key
   - API Secret

## Bước 5: Thiết Lập Google OAuth

### 5.1. Tạo Project

1. Truy cập https://console.cloud.google.com
2. Tạo project mới: "Tết Connect"
3. Chọn project vừa tạo

### 5.2. Cấu Hình OAuth Consent Screen

1. Vào "APIs & Services" → "OAuth consent screen"
2. Chọn "External"
3. Điền thông tin:
   - App name: Tết Connect
   - User support email: email của bạn
   - Developer contact: email của bạn
4. Click "Save and Continue"
5. Skip "Scopes"
6. Skip "Test users"
7. Click "Back to Dashboard"

### 5.3. Tạo OAuth Credentials

1. Vào "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
2. Application type: "Web application"
3. Name: "Tết Connect Web"
4. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
5. Click "Create"
6. Copy Client ID và Client Secret

## Bước 6: Lấy Gemini API Key

1. Truy cập https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Chọn project (hoặc tạo mới)
4. Copy API key

## Bước 7: Tạo NextAuth Secret

Chạy lệnh sau để tạo secret key:

```bash
openssl rand -base64 32
```

Hoặc truy cập: https://generate-secret.vercel.app/32

## Bước 8: Cấu Hình Environment Variables

### 8.1. Tạo File .env.local

```bash
copy .env.local.example .env.local
```

### 8.2. Điền Thông Tin

Mở file `.env.local` và điền các giá trị:

```env
# MongoDB
MONGODB_URI=mongodb+srv://tetconnect:matkhau@cluster.mongodb.net/tet-connect?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<secret-key-tu-buoc-7>

# Google OAuth
GOOGLE_CLIENT_ID=<client-id-tu-buoc-5>
GOOGLE_CLIENT_SECRET=<client-secret-tu-buoc-5>

# Cloudinary
CLOUDINARY_CLOUD_NAME=<cloud-name-tu-buoc-4>
CLOUDINARY_API_KEY=<api-key-tu-buoc-4>
CLOUDINARY_API_SECRET=<api-secret-tu-buoc-4>

# Gemini AI
GEMINI_API_KEY=<api-key-tu-buoc-6>
```

## Bước 9: Chạy Development Server

```bash
npm run dev
```

Mở trình duyệt và truy cập: http://localhost:3000

## Bước 10: Test Ứng Dụng

### 10.1. Đăng Ký Tài Khoản

1. Click "Đăng nhập bằng Google"
2. Chọn tài khoản Google
3. Cho phép quyền truy cập

### 10.2. Tạo Nhà (Family)

1. Sau khi đăng nhập, vào "Tạo nhà"
2. Nhập tên nhà: "Nhà Nguyễn"
3. Click "Tạo nhà"
4. Lưu lại mã mời (invite code)

### 10.3. Mời Thành Viên

1. Chia sẻ link: `http://localhost:3000/join/[MA-MOI]`
2. Thành viên khác click vào link
3. Đăng nhập và tham gia nhà

### 10.4. Tạo Nội Dung

1. Vào "Tạo bài viết"
2. Chọn nhà
3. Viết nội dung
4. Click "Đăng bài"

## Xử Lý Lỗi Thường Gặp

### Lỗi: "MongooseError: Operation buffering timed out"

**Nguyên nhân:** Không kết nối được MongoDB

**Giải pháp:**
1. Kiểm tra `MONGODB_URI` trong `.env.local`
2. Kiểm tra IP đã được whitelist chưa
3. Kiểm tra mật khẩu database user
4. Kiểm tra kết nối internet

### Lỗi: "Invalid Google OAuth credentials"

**Nguyên nhân:** Google OAuth chưa cấu hình đúng

**Giải pháp:**
1. Kiểm tra `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`
2. Kiểm tra redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Restart dev server sau khi thay đổi env

### Lỗi: "Cloudinary upload failed"

**Nguyên nhân:** Cloudinary credentials không đúng

**Giải pháp:**
1. Kiểm tra Cloud Name, API Key, API Secret
2. Kiểm tra quota (25GB/tháng miễn phí)
3. Kiểm tra kích thước file < 10MB

### Lỗi: "Gemini API rate limit exceeded"

**Nguyên nhân:** Vượt quá giới hạn miễn phí

**Giải pháp:**
1. Đợi 1 phút và thử lại
2. Kiểm tra quota tại Google AI Studio
3. Nâng cấp lên paid tier nếu cần

## Các Lệnh Hữu Ích

```bash
# Chạy development server
npm run dev

# Chạy tests
npm test

# Build production
npm run build

# Chạy production build
npm start

# Kiểm tra lỗi code
npm run lint

# Format code
npm run format
```

## Tài Liệu Tham Khảo

- [Hướng Dẫn Sử Dụng](./HUONG_DAN_SU_DUNG.md)
- [Hướng Dẫn Deploy](./HUONG_DAN_DEPLOY.md)
- [Cấu Hình MongoDB Production](./CAU_HINH_MONGODB.md)
- [API Documentation](./API_DOCUMENTATION.md)

## Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra lại từng bước
2. Xem phần "Xử Lý Lỗi Thường Gặp"
3. Tạo issue trên GitHub
4. Liên hệ qua email

---

**Chúc mừng! Bạn đã cài đặt thành công Tết Connect! 🎊**
