# Tết Connect

Tết Connect là một web application giúp các gia đình Việt Nam tổ chức và kết nối trong dịp Tết Nguyên Đán. Ứng dụng cung cấp một không gian riêng tư, ấm cúng để gia đình lưu giữ khoảnh khắc, tổ chức gặp mặt, và tạo nội dung Tết độc đáo bằng AI.

## Tính năng chính

- 🎋 **Tạo câu đối & lời chúc Tết bằng AI**: Sử dụng Gemini AI để tạo nội dung Tết độc đáo
- 📅 **Quản lý lịch họp mặt**: Tổ chức sự kiện và phân công công việc cho thành viên
- 📸 **Album ảnh gia đình**: Upload và chia sẻ ảnh Tết với timeline
- 🎬 **Video recap tự động**: Tạo video tổng hợp ảnh với nhạc nền
- 💬 **Tương tác realtime**: Reactions và cập nhật tức thời
- 🔐 **Đăng nhập Google OAuth**: Xác thực nhanh chóng và an toàn

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, Shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **AI**: Google Gemini API
- **Deployment**: Vercel

## Cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd tet-connect
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Cấu hình environment variables:
```bash
cp .env.local.example .env.local
```

Cập nhật các giá trị trong `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: URL của Supabase project
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon key của Supabase
- `GEMINI_API_KEY`: API key của Google Gemini

4. Chạy development server:
```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) để xem ứng dụng.

## Cấu trúc thư mục

```
├── app/                 # Next.js App Router pages
├── components/          # React components
├── lib/                 # Utility functions và configurations
│   ├── supabase.ts     # Supabase client
│   └── utils.ts        # Helper functions
├── types/              # TypeScript type definitions
│   └── database.ts     # Database schema types
├── public/             # Static assets
└── .kiro/              # Spec documents
    └── specs/
        └── tet-connect/
            ├── requirements.md
            ├── design.md
            └── tasks.md
```

## Database Setup

Xem file `.kiro/specs/tet-connect/design.md` để biết chi tiết về database schema và RLS policies.

## Testing

```bash
# Chạy tất cả tests
npm run test

# Chạy với coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Deployment

Ứng dụng được thiết kế để deploy lên Vercel:

1. Push code lên GitHub
2. Import project vào Vercel
3. Cấu hình environment variables
4. Deploy!

## License

MIT
