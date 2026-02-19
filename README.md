# Tết Connect 🎊

Ứng dụng web giúp các gia đình Việt Nam tổ chức và kết nối trong dịp Tết Nguyên Đán. Tạo không gian riêng tư, ấm cúng để gia đình lưu giữ khoảnh khắc, tổ chức gặp mặt, và tạo nội dung Tết độc đáo bằng AI.

## ✨ Tính năng chính

### 🤖 AI Câu đối & Thiệp Tết
- Tạo câu đối Tết độc đáo với AI (Google Gemini)
- Viết lời chúc Tết cá nhân hóa
- Tạo thiệp Tết với nội dung ý nghĩa
- Đăng và chia sẻ với gia đình

### 📅 Lịch họp mặt gia đình
- Tạo và quản lý sự kiện Tết (cúng tất niên, mùng 1, v.v.)
- Phân công công việc cho thành viên
- Nhận thông báo nhắc nhở tự động
- Theo dõi tiến độ hoàn thành công việc

### 📸 Album ảnh chung
- Upload và chia sẻ ảnh Tết
- Xem ảnh theo timeline (nhóm theo ngày)
- Tạo video recap tự động từ ảnh
- Lưu trữ khoảnh khắc đẹp của gia đình

### 💬 Tương tác realtime
- Thả tim, haha cho bài đăng
- Cập nhật tức thời khi có nội dung mới
- Thông báo realtime cho sự kiện và công việc

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, Shadcn/ui
- **Database**: MongoDB Atlas
- **Authentication**: NextAuth.js (Google OAuth)
- **Storage**: Cloudinary (ảnh, video)
- **AI**: Google Gemini API
- **Realtime**: Polling-based updates
- **Deployment**: Vercel

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ và npm
- Tài khoản MongoDB Atlas (free tier)
- Tài khoản Google Cloud (cho OAuth)
- Tài khoản Cloudinary (free tier)
- Gemini API key (free tier)

### 1. Clone repository

```bash
git clone <repository-url>
cd tet-connect
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình Environment Variables

Tạo file `.env.local` từ template:

```bash
cp .env.local.example .env.local
```

Cập nhật các giá trị trong `.env.local`:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tet-connect

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Cron (optional for development)
CRON_SECRET=your-cron-secret
```

**Hướng dẫn lấy credentials:**

- **MongoDB**: Xem [MongoDB Production Setup](docs/MONGODB_PRODUCTION_SETUP.md)
- **Google OAuth**: Xem [Quick Setup Guide](docs/QUICK_SETUP_GUIDE.md)
- **Cloudinary**: Đăng ký tại [cloudinary.com](https://cloudinary.com)
- **Gemini API**: Lấy key tại [Google AI Studio](https://makersuite.google.com/app/apikey)

### 4. Chạy Development Server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trong browser.

### 5. Tạo tài khoản và bắt đầu sử dụng

1. Click "Đăng nhập bằng Google"
2. Tạo "Nhà" mới cho gia đình
3. Chia sẻ link mời với thành viên
4. Bắt đầu tạo nội dung Tết! 🎊

## 🧪 Testing

Tết Connect sử dụng dual testing approach với unit tests và property-based tests.

### Chạy tất cả tests

```bash
npm test
```

### Chạy property-based tests

```bash
npm test -- tests/*.property.test.ts
```

### Chạy unit tests

```bash
npm test -- --grep -v "property"
```

### Test coverage

```bash
npm run test:coverage
```

### Test structure

- **Unit tests**: Kiểm tra các trường hợp cụ thể và edge cases
- **Property tests**: Kiểm tra tính đúng đắn tổng quát với 100+ iterations
- **Integration tests**: Kiểm tra luồng hoàn chỉnh end-to-end

Xem thêm: [Property Tests Summary](docs/PROPERTY_TESTS_SUMMARY.md)

## 📁 Cấu trúc Project

```
tet-connect/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── ai/           # AI generation endpoints
│   │   ├── auth/         # Authentication
│   │   ├── cron/         # Background jobs
│   │   ├── events/       # Events & tasks
│   │   ├── families/     # Family management
│   │   ├── notifications/# Notifications
│   │   ├── photos/       # Photo upload
│   │   ├── posts/        # Posts & reactions
│   │   └── videos/       # Video creation
│   ├── dashboard/         # Dashboard page
│   ├── events/            # Events pages
│   ├── join/              # Join family page
│   ├── login/             # Login page
│   ├── photos/            # Photos page
│   ├── posts/             # Posts page
│   └── register/          # Register page
├── components/            # React components
│   ├── ai/               # AI content generation
│   ├── auth/             # Authentication components
│   ├── errors/           # Error handling
│   ├── events/           # Events & tasks
│   ├── family/           # Family management
│   ├── layout/           # Layout components
│   ├── notifications/    # Notifications
│   ├── photos/           # Photo album
│   ├── posts/            # Posts & reactions
│   ├── ui/               # UI components (Shadcn)
│   └── videos/           # Video recap
├── lib/                   # Utility functions
│   ├── cache/            # Caching strategies
│   ├── errors/           # Error handling
│   ├── hooks/            # Custom React hooks
│   ├── models/           # MongoDB models
│   ├── auth.ts           # NextAuth configuration
│   ├── cloudinary.ts     # Cloudinary client
│   ├── mongodb.ts        # MongoDB connection
│   └── notifications.ts  # Notification helpers
├── docs/                  # Documentation
├── tests/                 # Test files
│   ├── *.test.ts(x)      # Unit tests
│   └── *.property.test.ts# Property-based tests
├── types/                 # TypeScript types
└── public/                # Static assets
```

## 🚢 Deployment

### Quick Deployment to Vercel

1. Push code lên GitHub
2. Import project vào [Vercel](https://vercel.com)
3. Configure environment variables (xem `.env.production.example`)
4. Deploy!

### Detailed Guides

- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Complete deployment process
- **[Vercel Setup](docs/VERCEL_SETUP.md)** - Step-by-step Vercel configuration
- **[MongoDB Production Setup](docs/MONGODB_PRODUCTION_SETUP.md)** - MongoDB Atlas setup
- **[Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md)** - Pre/post-deployment checklist

### Required Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generate-secure-secret>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Storage
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# AI
GEMINI_API_KEY=...

# Cron Jobs
CRON_SECRET=<generate-secure-token>
```

**Generate secrets:**
```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# CRON_SECRET
openssl rand -hex 32
```

## 📚 Documentation

### Setup & Configuration
- **[Quick Setup Guide](docs/QUICK_SETUP_GUIDE.md)** - Hướng dẫn setup nhanh
- **[Setup Guide](docs/SETUP.md)** - Hướng dẫn setup chi tiết
- **[Quick Start MongoDB](docs/QUICK_START_MONGODB.md)** - MongoDB setup
- **[User Guide](docs/USER_GUIDE.md)** - Hướng dẫn sử dụng cho người dùng cuối ⭐
- **[API Documentation](docs/API_DOCUMENTATION.md)** - REST API reference ⭐

### Architecture & Design
- **[Architecture](docs/ARCHITECTURE.md)** - Kiến trúc hệ thống
- **[Caching Strategy](docs/CACHING.md)** - Chiến lược caching
- **[Error Handling](components/errors/README.md)** - Xử lý lỗi

### Features
- **[Toast Notifications](docs/TOAST_NOTIFICATIONS.md)** - Hệ thống thông báo
- **[Lazy Loading](docs/LAZY_LOADING.md)** - Tối ưu tải trang
- **[Loading States](docs/LOADING_STATES.md)** - Trạng thái loading
- **[Mobile Optimizations](docs/MOBILE_OPTIMIZATIONS.md)** - Tối ưu mobile

### Testing
- **[Property Tests Summary](docs/PROPERTY_TESTS_SUMMARY.md)** - Property-based testing
- **[Integration Testing](docs/TASK_19.3_INTEGRATION_TESTING.md)** - Integration tests
- **[Manual Testing Guide](docs/MANUAL_TESTING_QUICK_GUIDE.md)** - Manual testing
- **[Browser Compatibility](docs/BROWSER_COMPATIBILITY_MATRIX.md)** - Browser support

### Deployment
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- **[Vercel Setup](docs/VERCEL_SETUP.md)** - Vercel configuration
- **[Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md)** - Deployment checklist

### Component Documentation
- **[Photos Module](components/photos/README.md)** - Photo album components
- **[Videos Module](components/videos/README.md)** - Video recap components
- **[Notifications](components/notifications/README.md)** - Notification components
- **[Family Management](components/family/README.md)** - Family components
- **[Layout Components](components/layout/README.md)** - Layout components

## 🔧 Troubleshooting

### Lỗi "MongooseError: Operation buffering timed out"

**Nguyên nhân**: Không kết nối được MongoDB

**Giải pháp**:
1. Kiểm tra `MONGODB_URI` trong `.env.local`
2. Đảm bảo IP address được whitelist trong MongoDB Atlas
3. Kiểm tra network connection

### Lỗi "Invalid Google OAuth credentials"

**Nguyên nhân**: Google OAuth chưa được cấu hình đúng

**Giải pháp**:
1. Kiểm tra `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`
2. Đảm bảo redirect URI được thêm trong Google Console: `http://localhost:3000/api/auth/callback/google`
3. Restart dev server sau khi thay đổi env variables

### Lỗi "Cloudinary upload failed"

**Nguyên nhân**: Cloudinary credentials không đúng hoặc quota đã hết

**Giải pháp**:
1. Kiểm tra credentials trong `.env.local`
2. Kiểm tra quota trong Cloudinary dashboard
3. Đảm bảo file size < 10MB

### Lỗi "Gemini API rate limit exceeded"

**Nguyên nhân**: Đã vượt quá giới hạn free tier

**Giải pháp**:
1. Đợi 1 phút và thử lại
2. Nâng cấp lên paid tier nếu cần
3. Implement caching cho AI responses

### Tests fail

**Giải pháp**:
1. Chạy `npm install` để đảm bảo dependencies đầy đủ
2. Kiểm tra MongoDB connection cho integration tests
3. Xem logs chi tiết: `npm test -- --reporter=verbose`

### Development server không start

**Giải pháp**:
1. Xóa `.next` folder: `rm -rf .next`
2. Xóa `node_modules` và reinstall: `rm -rf node_modules && npm install`
3. Kiểm tra port 3000 có bị chiếm: `lsof -i :3000`

Xem thêm: [Manual Testing Quick Guide](docs/MANUAL_TESTING_QUICK_GUIDE.md)

## 🤝 Contributing

Chúng tôi hoan nghênh mọi đóng góp! Để contribute:

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Mở Pull Request

### Development Guidelines

- Viết tests cho tất cả features mới
- Follow existing code style (Prettier + ESLint)
- Update documentation khi cần
- Đảm bảo tất cả tests pass trước khi submit PR

### Code Style

```bash
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run type-check
```

## 📄 License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 💬 Support

Nếu có vấn đề hoặc câu hỏi:

- 📖 Xem [Documentation](docs/)
- 🐛 Tạo [Issue](https://github.com/your-repo/issues) trên GitHub
- 💡 Đọc [Troubleshooting](#-troubleshooting)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Cloudinary](https://cloudinary.com/) - Media storage
- [Google Gemini](https://ai.google.dev/) - AI generation
- [Shadcn/ui](https://ui.shadcn.com/) - UI components
- [Vercel](https://vercel.com/) - Hosting platform

---

**Chúc mừng năm mới! 🎊🧧**

Made with ❤️ for Vietnamese families
