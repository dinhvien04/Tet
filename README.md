# Tết Connect 🎊

Ứng dụng web giúp các gia đình Việt Nam kết nối và tổ chức hoạt động dịp Tết: tạo nhà riêng, đăng bài, lịch sự kiện, album ảnh, video recap và mini game.

## ✨ Tính năng chính

### 🤖 AI nội dung Tết
- Tạo câu đối, lời chúc, thiệp Tết bằng AI
- Cá nhân hóa theo người nhận và đặc điểm
- Đăng trực tiếp lên tường nhà

### 📅 Sự kiện gia đình
- Tạo sự kiện theo ngày giờ
- Phân công nhiệm vụ cho thành viên
- Theo dõi trạng thái hoàn thành

### 📸 Album ảnh chung
- Upload ảnh theo nhà (family)
- Xem theo timeline
- Tạo video recap từ ảnh

### 💬 Bài đăng tương tác
- Đăng bài theo chủ đề Tết
- Thả tim / haha
- Bình luận trực tiếp dưới bài viết

### 🎮 Bầu Cua Online
- Bàn chơi theo từng gia đình
- Cược điểm ảo (không tiền thật)
- Quay 3 xúc xắc, tính thắng/thua tự động
- Bảng xếp hạng điểm

## 🎮 Bau Cua Online (MVP)

### Route
- UI: `/games/bau-cua`

### API
- `GET /api/games/bau-cua?familyId=...`
  - Lấy trạng thái bàn: round, ví điểm, tổng cược, cược của bạn, leaderboard
- `POST /api/games/bau-cua/start`
  - Mở ván mới (status `betting`)
- `POST /api/games/bau-cua/bet`
  - Đặt cược theo cửa: `bau|cua|tom|ca|ga|nai`
- `POST /api/games/bau-cua/roll`
  - Quay xúc xắc, chốt kết quả, cập nhật ví

### Luật tính điểm
- Cửa không xuất hiện trong 3 mặt: thua toàn bộ điểm đặt cửa đó
- Cửa xuất hiện `n` lần: nhận `n x amount` cho cửa đó
- Ví dụ:
  - Đặt 50 vào `bau`, ra 2 `bau` -> +100
  - Đặt 50 vào `bau`, không ra `bau` -> -50

### Models MongoDB
- `lib/models/BauCuaRound.ts`
- `lib/models/BauCuaBet.ts`
- `lib/models/BauCuaWallet.ts`

### Bố cục bàn
- Hàng 1: `nai - bau - ga`
- Hàng 2: `ca - cua - tom`

## 🛠 Tech Stack
- Frontend: Next.js (App Router), React, TypeScript
- UI: Tailwind CSS, shadcn/ui
- Database: MongoDB
- Auth: NextAuth
- Media: Cloudinary
- AI: OpenAI-compatible API (MegaLLM)

## 🚀 Quick Start

### 1. Cài dependencies
```bash
npm install
```

### 2. Tạo env local
```bash
cp .env.local.example .env.local
```

### 3. Cấu hình `.env.local`
```env
MONGODB_URI=...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
MEGALLM_API_KEY=...
MEGALLM_MODEL=...
```

### 4. Chạy dev server
```bash
npm run dev
```

Mở: `http://localhost:3000`

## 🧪 Test & Quality
```bash
npm run lint
npx tsc --noEmit
npm test
```

## 📁 Cấu trúc chính
```text
tet-connect/
  app/
    api/
    dashboard/
    events/
    family/
    games/
    photos/
    posts/
  components/
  lib/
    models/
    hooks/
  docs/
```

## 📚 Tài liệu thêm
- `docs/API_DOCUMENTATION.md`
- `docs/DEPLOYMENT_GUIDE.md`
- `docs/QUICK_SETUP_GUIDE.md`
- `components/photos/README.md`
- `components/videos/README.md`

## 🔧 Ghi chú
- Game Bầu Cua dùng điểm ảo, không có giao dịch tiền thật.
- Nếu ảnh upload lỗi trên local, kiểm tra cấu hình `CLOUDINARY_*` trong `.env.local`.

---
Made with ❤️ for Vietnamese families.