# Quick Setup Guide - Tết Connect với MongoDB

## Bước 1: Tạo MongoDB Atlas Account (5 phút)

1. Truy cập: https://www.mongodb.com/cloud/atlas/register
2. Đăng ký với email (hoặc Google)
3. Chọn **FREE** tier (M0 Sandbox)
4. Chọn region: **Singapore** (gần VN nhất)
5. Tạo cluster (đợi 3-5 phút)

## Bước 2: Cấu hình MongoDB

1. **Tạo Database User**:
   - Click "Database Access" (sidebar trái)
   - Click "Add New Database User"
   - Username: `tetconnect`
   - Password: Tạo password mạnh (copy lưu lại!)
   - Database User Privileges: **Read and write to any database**
   - Click "Add User"

2. **Whitelist IP**:
   - Click "Network Access" (sidebar trái)
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"

3. **Get Connection String**:
   - Click "Database" (sidebar trái)
   - Click "Connect" button
   - Click "Connect your application"
   - Copy connection string
   - Thay `<password>` bằng password bạn tạo ở bước 1

## Bước 3: Tạo Cloudinary Account (3 phút)

1. Truy cập: https://cloudinary.com/users/register/free
2. Đăng ký (Free tier: 25GB storage)
3. Vào Dashboard
4. Copy 3 giá trị:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

## Bước 4: Generate NextAuth Secret

Mở PowerShell và chạy:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Copy kết quả.

## Bước 5: Update .env.local

Mở file `.env.local` và điền các giá trị:

```env
# MongoDB - Paste connection string từ Bước 2
MONGODB_URI=mongodb+srv://tetconnect:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/tet-connect?retryWrites=true&w=majority

# NextAuth - Paste secret từ Bước 4
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<paste-secret-here>

# Google OAuth - BỎ QUA nếu không dùng Google login
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudinary - Paste từ Bước 3
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>

# Gemini AI - Nếu có
GEMINI_API_KEY=your-gemini-api-key
```

## Bước 6: Chạy Development Server

```bash
npm run dev
```

Mở http://localhost:3000

## Bước 7: Test Authentication

1. **Đăng ký tài khoản mới**:
   - Truy cập: http://localhost:3000/register
   - Điền thông tin:
     - Tên: Test User
     - Email: test@example.com
     - Password: Test1234
     - Confirm: Test1234
   - Click "Đăng ký"
   - Nếu thành công → tự động đăng nhập → redirect /dashboard

2. **Đăng xuất và đăng nhập lại**:
   - Logout (nếu có nút logout)
   - Truy cập: http://localhost:3000/login
   - Điền email/password
   - Click "Đăng nhập"
   - Nếu thành công → redirect /dashboard

3. **Test protected route**:
   - Logout
   - Truy cập: http://localhost:3000/dashboard
   - Nên redirect về /login
   - Login lại → redirect về /dashboard

## Troubleshooting

### Lỗi: "MongoServerError: bad auth"
- **Nguyên nhân**: Password sai hoặc user chưa được tạo
- **Giải pháp**: Kiểm tra lại username/password trong MongoDB Atlas

### Lỗi: "MongooseServerSelectionError: connect ETIMEDOUT"
- **Nguyên nhân**: IP chưa được whitelist
- **Giải pháp**: Vào Network Access → Add IP → Allow from anywhere

### Lỗi: "Invalid Cloudinary credentials"
- **Nguyên nhân**: Cloud name/API key/secret sai
- **Giải pháp**: Kiểm tra lại trong Cloudinary Dashboard

### Lỗi: "NEXTAUTH_SECRET is not set"
- **Nguyên nhân**: Chưa set NEXTAUTH_SECRET
- **Giải pháp**: Generate secret và thêm vào .env.local

### Server không khởi động
- **Giải pháp**: 
  1. Xóa folder `.next`
  2. Chạy `npm install`
  3. Chạy `npm run dev`

## Optional: Setup Google OAuth

Nếu muốn có nút "Đăng nhập bằng Google":

1. Truy cập: https://console.cloud.google.com/
2. Tạo project mới
3. Enable Google+ API
4. Tạo OAuth 2.0 credentials
5. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID và Client Secret
7. Paste vào `.env.local`

## Next Steps

Sau khi authentication hoạt động:

1. ✅ Phase 1: MongoDB & Auth setup (DONE)
2. ✅ Phase 2: NextAuth implementation (DONE)
3. 🔄 Phase 3: Migrate API routes to MongoDB (NEXT)
4. 🔄 Phase 4: Update components to use MongoDB

Xem chi tiết trong `docs/MIGRATION_TO_MONGODB.md`

## Support

Nếu gặp vấn đề:
1. Check console logs (F12 → Console)
2. Check terminal logs
3. Check MongoDB Atlas logs
4. Đọc error message carefully

Good luck! 🚀🧧
