# Hướng Dẫn Deploy Lên Production - Tết Connect

## Tổng Quan

Hướng dẫn này sẽ giúp bạn deploy Tết Connect lên Vercel với MongoDB Atlas.

## Chuẩn Bị Trước Khi Deploy

### Checklist

- [ ] Code đã push lên GitHub/GitLab
- [ ] Tất cả tests đã pass
- [ ] MongoDB Atlas production cluster đã sẵn sàng
- [ ] Cloudinary production account đã có
- [ ] Google OAuth đã cấu hình cho production
- [ ] Gemini API key đã có

## Bước 1: Thiết Lập MongoDB Production

### 1.1. Tạo Production Cluster

1. Đăng nhập MongoDB Atlas
2. Tạo cluster mới hoặc dùng cluster hiện có
3. Khuyến nghị: M10 trở lên cho production
4. Chọn region gần người dùng (Singapore cho VN)

### 1.2. Tạo Database User

```
Username: tet-connect-prod
Password: <tạo mật khẩu mạnh 32+ ký tự>
Role: Read and write to any database
```

### 1.3. Whitelist IP

Có 2 cách:

**Cách 1: Allow All (Dễ hơn)**
- IP: `0.0.0.0/0`
- Comment: "Vercel deployment"

**Cách 2: Whitelist Vercel IPs (An toàn hơn)**
- Xem danh sách IP tại: https://vercel.com/docs/concepts/edge-network/regions
- Thêm từng IP range

### 1.4. Lấy Connection String

```
mongodb+srv://tet-connect-prod:<password>@cluster.mongodb.net/tet-connect-prod?retryWrites=true&w=majority
```

Thay `<password>` bằng mật khẩu thực.

## Bước 2: Cấu Hình Google OAuth Production

### 2.1. Thêm Production URL

1. Vào Google Cloud Console
2. Chọn project
3. Vào "Credentials" → Chọn OAuth client
4. Thêm Authorized redirect URIs:
   ```
   https://your-domain.vercel.app/api/auth/callback/google
   https://your-custom-domain.com/api/auth/callback/google
   ```
5. Save

### 2.2. Lưu Credentials

- Client ID
- Client Secret

## Bước 3: Deploy Lên Vercel

### 3.1. Import Project

1. Đăng nhập https://vercel.com
2. Click "Add New Project"
3. Import Git repository
4. Chọn repository của bạn

### 3.2. Cấu Hình Project

```
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### 3.3. Thêm Environment Variables

Click "Environment Variables" và thêm:

```env
# MongoDB
MONGODB_URI=mongodb+srv://tet-connect-prod:password@cluster.mongodb.net/tet-connect-prod?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=<tạo mới bằng: openssl rand -base64 32>

# Google OAuth
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Cron Security
CRON_SECRET=<tạo bằng: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

**Lưu ý quan trọng:**
- Chọn "Production" cho tất cả variables
- KHÔNG dùng lại credentials từ development
- NEXTAUTH_SECRET phải khác development

### 3.4. Deploy

1. Click "Deploy"
2. Đợi build hoàn thành (2-5 phút)
3. Kiểm tra deployment URL

## Bước 4: Cấu Hình Custom Domain (Tùy chọn)

### 4.1. Thêm Domain

1. Vào Project Settings → Domains
2. Thêm domain của bạn: `tetconnect.com`
3. Vercel sẽ hướng dẫn cấu hình DNS

### 4.2. Cấu Hình DNS

Thêm records sau vào DNS provider:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 4.3. Đợi SSL Certificate

- Vercel tự động tạo SSL certificate
- Đợi 5-10 phút
- Domain sẽ có HTTPS

### 4.4. Cập Nhật Environment Variables

```env
NEXTAUTH_URL=https://tetconnect.com
```

Redeploy sau khi thay đổi.

## Bước 5: Kiểm Tra Sau Deploy

### 5.1. Smoke Tests

Kiểm tra các chức năng chính:

- [ ] Truy cập homepage
- [ ] Đăng nhập Google
- [ ] Tạo nhà
- [ ] Tạo bài viết
- [ ] Upload ảnh
- [ ] Tạo sự kiện
- [ ] Nhận thông báo
- [ ] Tạo nội dung AI

### 5.2. Performance Tests

- [ ] Trang load < 3 giây
- [ ] Lighthouse score > 90
- [ ] Không có lỗi console
- [ ] Ảnh load đúng
- [ ] API response < 1 giây

### 5.3. Security Tests

- [ ] HTTPS hoạt động
- [ ] Không có secrets trong client code
- [ ] Authentication hoạt động
- [ ] File upload validation hoạt động

## Bước 6: Thiết Lập Monitoring

### 6.1. Vercel Analytics

1. Vào Project Settings → Analytics
2. Enable "Web Analytics"
3. Enable "Speed Insights"

### 6.2. MongoDB Monitoring

1. Vào MongoDB Atlas → Metrics
2. Thiết lập alerts:
   - Connections > 80%
   - Disk space > 80%
   - Memory > 80%

### 6.3. Uptime Monitoring

Sử dụng dịch vụ như:
- UptimeRobot (miễn phí)
- Pingdom
- StatusCake

Monitor các endpoints:
- `/` (homepage)
- `/api/health` (health check)

## Xử Lý Lỗi

### Lỗi: "NEXTAUTH_URL mismatch"

**Giải pháp:**
- Kiểm tra `NEXTAUTH_URL` khớp với domain production
- Redeploy sau khi sửa

### Lỗi: "MongoDB connection timeout"

**Giải pháp:**
- Kiểm tra IP whitelist
- Kiểm tra connection string
- Kiểm tra database user permissions

### Lỗi: "Google OAuth redirect_uri_mismatch"

**Giải pháp:**
- Thêm production URL vào Google Console
- Format: `https://domain.com/api/auth/callback/google`

### Lỗi: "Cloudinary upload fails"

**Giải pháp:**
- Kiểm tra credentials
- Kiểm tra quota (upgrade nếu cần)
- Kiểm tra file size limits

## Rollback Nếu Có Lỗi

### Rollback Nhanh

1. Vào Vercel Dashboard → Deployments
2. Tìm deployment ổn định trước đó
3. Click "..." → "Promote to Production"
4. Xác nhận

### Rollback Qua CLI

```bash
# List deployments
vercel ls

# Promote deployment cũ
vercel promote <deployment-url>
```

## Bảo Trì Thường Xuyên

### Hàng Ngày
- Kiểm tra error logs
- Kiểm tra uptime
- Kiểm tra performance metrics

### Hàng Tuần
- Review slow queries
- Kiểm tra backup status
- Update dependencies nếu có

### Hàng Tháng
- Test backup restore
- Security audit
- Performance optimization
- Review costs

## Chi Phí Ước Tính

### Vercel (Free Tier)
- Bandwidth: 100 GB/tháng
- Function execution: 100 GB-hours/tháng
- **Chi phí: $0/tháng**

### MongoDB Atlas
- M10 cluster (khuyến nghị)
- 2 GB RAM, 10 GB storage
- **Chi phí: ~$57/tháng**

### Cloudinary (Free Tier)
- 25 GB storage
- 25 GB bandwidth/tháng
- **Chi phí: $0/tháng**

### Tổng
- **Tối thiểu: ~$57/tháng**
- **Với traffic cao: ~$100-200/tháng**

## Tối Ưu Chi Phí

1. **Sử dụng Free Tiers**
   - Vercel free tier đủ cho traffic vừa
   - Cloudinary free tier đủ cho ~1000 ảnh/tháng

2. **Optimize MongoDB**
   - Tạo indexes đúng
   - Xóa data cũ không cần
   - Sử dụng projection

3. **Optimize Images**
   - Cloudinary auto-optimization
   - Lazy loading
   - Responsive images

## Tài Liệu Tham Khảo

- [Cấu Hình MongoDB Production](./CAU_HINH_MONGODB.md)
- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com)

## Hỗ Trợ

- Vercel Support: https://vercel.com/support
- MongoDB Support: https://support.mongodb.com
- GitHub Issues: Tạo issue nếu gặp vấn đề

---

**Chúc mừng! Ứng dụng của bạn đã lên production! 🚀**
