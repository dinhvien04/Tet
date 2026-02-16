# Hướng dẫn Cài đặt Tết Connect

## Yêu cầu hệ thống

- Node.js 18.x hoặc cao hơn
- npm hoặc yarn
- Tài khoản Supabase (miễn phí)
- Tài khoản Google Cloud (để lấy Gemini API key)

## Bước 1: Clone và cài đặt dependencies

```bash
git clone <repository-url>
cd tet-connect
npm install
```

## Bước 2: Cấu hình Supabase

1. Tạo project mới trên [Supabase](https://supabase.com)
2. Vào Settings > API để lấy:
   - Project URL
   - Anon/Public key
3. Cấu hình Google OAuth:
   - Vào Authentication > Providers
   - Enable Google provider
   - Thêm Client ID và Client Secret từ Google Cloud Console

## Bước 3: Cấu hình Gemini API

1. Truy cập [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Tạo API key mới
3. Copy API key

## Bước 4: Cấu hình Environment Variables

Tạo file `.env.local` từ template:

```bash
cp .env.local.example .env.local
```

Cập nhật các giá trị:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

## Bước 5: Thiết lập Database

### 5.1. Tạo các bảng cơ sở dữ liệu

1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.com)
2. Chọn project của bạn
3. Vào **SQL Editor** từ sidebar
4. Tạo một query mới
5. Copy toàn bộ nội dung từ file `supabase/migrations/001_create_tables.sql`
6. Paste vào SQL Editor và nhấn **Run**

Hoặc sử dụng Supabase CLI:
```bash
supabase link --project-ref your-project-ref
supabase db push
```

### 5.2. Cấu hình Row Level Security (RLS)

1. Vào **SQL Editor** trên Supabase Dashboard
2. Copy nội dung từ file `supabase/migrations/002_enable_rls.sql`
3. Paste và nhấn **Run**

Điều này sẽ cấu hình RLS policies để đảm bảo:
- Users chỉ truy cập được dữ liệu của family họ
- Bảo mật dữ liệu ở database level

### 5.3. Thiết lập Storage Buckets

1. Vào **SQL Editor** trên Supabase Dashboard
2. Copy nội dung từ file `supabase/migrations/003_setup_storage.sql`
3. Paste và nhấn **Run**

Điều này sẽ tạo 2 storage buckets:
- **photos**: Lưu ảnh (max 10MB, jpg/png/heic)
- **videos**: Lưu video recap (max 100MB, mp4/webm)

Để kiểm tra buckets đã được tạo:
- Vào **Storage** từ sidebar
- Bạn sẽ thấy 2 buckets: `photos` và `videos`

Hoặc chạy script kiểm tra:
```bash
# Copy nội dung từ supabase/verify_storage.sql và chạy trong SQL Editor
```

## Bước 6: Chạy Development Server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

## Cấu trúc Dự án

```
tet-connect/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # Shadcn/ui components
│   ├── auth/             # Authentication components
│   ├── family/           # Family management components
│   ├── posts/            # Posts & reactions components
│   ├── events/           # Events & tasks components
│   └── photos/           # Photo album components
├── lib/                   # Utilities
│   ├── supabase.ts       # Supabase client
│   └── utils.ts          # Helper functions
├── types/                 # TypeScript types
│   └── database.ts       # Database schema types
└── public/               # Static assets
```

## Troubleshooting

### Lỗi kết nối Supabase
- Kiểm tra NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY
- Đảm bảo RLS policies đã được cấu hình đúng

### Lỗi Gemini API
- Kiểm tra GEMINI_API_KEY
- Đảm bảo API key có quyền truy cập Gemini Pro model

### Lỗi build
- Xóa folder `.next` và chạy lại `npm run build`
- Kiểm tra TypeScript errors với `npm run lint`

## Tài liệu tham khảo

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn/ui](https://ui.shadcn.com)
