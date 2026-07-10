# Tết Connect

Ứng dụng web giúp gia đình Việt Nam kết nối trong dịp Tết Nguyên Đán: tường nhà, sự kiện, album ảnh, AI lời chúc và Bầu Cua điểm ảo.

## Tính năng

- **AI nội dung Tết** — câu đối, lời chúc, thiệp (MegaLLM), có đăng nhập + rate limit
- **Gia đình (Nhà)** — tạo/join bằng mã mời, phân quyền admin/member
- **Bài đăng** — timeline, reaction, comment; sửa/xóa (author hoặc family admin)
- **Sự kiện & task** — lịch họp mặt, phân công, notification cron
- **Album ảnh** — Cloudinary (bắt buộc production), fallback local chỉ dev
- **Bầu Cua** — điểm ảo, atomic bet/settlement, chỉ host/admin quay
- **System admin** — `/admin`, phân trang user, đổi role

## Tech stack

| Lớp | Công nghệ |
|-----|-----------|
| Frontend | Next.js App Router, React, TypeScript, Tailwind, shadcn/ui |
| Auth | NextAuth (JWT) — Credentials + Google |
| Database | MongoDB + Mongoose |
| Storage | Cloudinary |
| AI | MegaLLM (OpenAI-compatible API) |
| Deploy | Vercel (+ Cron) |

## Cài đặt nhanh

```bash
npm install --legacy-peer-deps
cp .env.example .env.local
# điền biến môi trường
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

### Biến môi trường chính

Xem đầy đủ trong [`.env.example`](./.env.example):

- `MONGODB_URI`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (nếu dùng Google login)
- `MEGALLM_API_KEY`, `MEGALLM_MODEL`
- `CLOUDINARY_*` (bắt buộc production)
- `CRON_SECRET` (bắt buộc production)
- `SYSTEM_ADMIN_EMAILS` (optional)

```bash
npm run validate:env
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test:ci          # bộ test bảo mật + P1 cốt lõi
npm run deploy:check
```

## API nổi bật

| Endpoint | Mô tả |
|----------|--------|
| `POST /api/ai/generate` | AI (auth + rate limit) |
| `GET /api/dashboard/summary?familyId=` | Tóm tắt dashboard |
| `GET /api/posts?familyId=&cursor=&limit=` | Feed cursor pagination |
| `PATCH/DELETE /api/posts/:id` | Sửa / xóa bài |
| `GET/PATCH /api/notifications` | List + mark one / mark all |
| `POST /api/games/bau-cua/{start,bet,roll}` | Bầu Cua |
| `GET /api/cron/check-notifications` | Cron (Bearer `CRON_SECRET`) |

## Production checklist

Xem chi tiết: [`docs/PRODUCTION_CHECKLIST.md`](./docs/PRODUCTION_CHECKLIST.md)

- [ ] `NEXTAUTH_SECRET` mạnh (≥32 ký tự), không placeholder
- [ ] `CRON_SECRET` cấu hình; Vercel Cron gửi `Authorization: Bearer ...`
- [ ] Cloudinary production (không ghi `public/uploads`)
- [ ] MongoDB Atlas (replica set nếu dùng multi-doc transaction)
- [ ] Google OAuth callback trỏ đúng domain
- [ ] `npm run deploy:check` pass

## Tài liệu thêm

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- [`docs/SECURITY.md`](./docs/SECURITY.md)
- [`docs/MONGODB_INDEXES.md`](./docs/MONGODB_INDEXES.md)
- [`docs/DEPLOYMENT_GUIDE.md`](./docs/DEPLOYMENT_GUIDE.md)
- [`CHANGELOG.md`](./CHANGELOG.md)
- [`fix.md`](./fix.md) — kế hoạch nâng cấp P0/P1/P2

## License

MIT
