# Tet Connect

Tet Connect la ung dung web giup gia dinh Viet Nam ket noi trong dip Tet.

## Main Features

### AI Content
- Tao cau doi, loi chuc, thiep Tet bang AI
- Dang thang noi dung len tuong nha

### Family Events
- Tao su kien
- Phan cong nhiem vu
- Theo doi tien do hoan thanh

### Photo Album
- Upload anh theo family
- Xem timeline anh
- Tao video recap

### Posts
- Dang bai theo chu de Tet
- Tha tim / haha
- Binh luan truc tiep duoi bai

### Bau Cua Online
- Ban choi rieng cho tung gia dinh
- Cuoc diem ao (khong tien that)
- Quay 3 xuc xac va tinh ket qua tu dong

### Family Admin Management
- Family creator duoc gan role `admin`
- Admin co the cap quyen admin cho thanh vien
- Admin co the ha quyen admin thanh member
- Admin co the xoa thanh vien khoi gia dinh
- He thong chan thao tac lam mat admin cuoi cung

### System Admin Management
- Co trang quan tri web tai `/admin`
- Chi user co role `admin` moi vao duoc
- Admin co the promote/demote role cua user toan he thong
- Co thong ke tong users, families, posts, events, photos

## Bau Cua Routes
- UI: `/games/bau-cua`
- API:
  - `GET /api/games/bau-cua?familyId=...`
  - `POST /api/games/bau-cua/start`
  - `POST /api/games/bau-cua/bet`
  - `POST /api/games/bau-cua/roll`

## Family Member Admin API
- `GET /api/families/:id/members`
- `PATCH /api/families/:id/members`
  - body: `{ "memberId": "...", "role": "admin|member" }`
- `DELETE /api/families/:id/members?memberId=...`

## System Admin API
- `GET /api/admin/users`
- `PATCH /api/admin/users`
  - body: `{ "userId": "...", "role": "user|admin" }`

## Tech Stack
- Next.js (App Router)
- React + TypeScript
- Tailwind CSS + shadcn/ui
- MongoDB
- NextAuth
- Cloudinary

## Quick Start

1. Install dependencies
```bash
npm install
```

2. Create env file
```bash
cp .env.local.example .env.local
```

3. Fill `.env.local`
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
SYSTEM_ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

4. Run dev server
```bash
npm run dev
```

Open: `http://localhost:3000`

## Quality
```bash
npm run lint
npx tsc --noEmit
npm test
```
