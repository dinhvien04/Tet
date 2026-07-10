# Security — Tết Connect

## Threat model (ngắn)

| Tài sản | Rủi ro chính | Kiểm soát |
|---------|--------------|-----------|
| Tài khoản user | Account takeover, brute force | NextAuth JWT, password policy, Google OAuth; role chỉ từ DB |
| Dữ liệu family | Truy cập chéo nhà | Membership check + helper `requireFamilyMember/Admin` |
| AI API | Abuse / cost | Auth bắt buộc, rate limit + daily quota MongoDB |
| Upload ảnh | Malware MIME spoof, path abuse | Magic bytes, MIME allowlist, Cloudinary production, server-side filename |
| Cron | Trigger trái phép | `CRON_SECRET` bắt buộc production (fail closed 503) |
| Redirect | Open redirect | `getSafeRedirectPath` chỉ path nội bộ `/` |
| Bầu Cua | Race cược vượt số dư | Atomic `$expr` reserve, settlement CAS |

## Roles

- **System admin** (`User.role = admin` hoặc `SYSTEM_ADMIN_EMAILS`): `/admin`, đổi role user.
- **Family admin**: quản lý member, invite, settings, mở/quay Bầu Cua.
- **Member**: đọc/ghi nội dung nhà; RSVP; cược Bầu Cua.

Client **không** được tin `role` — JWT callback đồng bộ role từ MongoDB.

## Rate limiting

- AI: theo user + IP (window 1 phút) và quota ngày.
- Join family: 10 lần / giờ / user.
- Storage: MongoDB collection `RateLimit` (TTL), phù hợp serverless multi-instance.

## File upload

- Production: Cloudinary bắt buộc.
- Dev: có thể `public/uploads` (không dùng production).
- Từ chối SVG/executable; kiểm tra magic bytes; quota upload/ngày.

## Secrets

- Không commit `.env*`; chỉ `.env.example`.
- Không secret fallback kiểu `your-secret-key-change-in-production` trong production.
- `NEXTAUTH_SECRET`, `CRON_SECRET`, Cloudinary, MegaLLM qua env.

## Incident response (tối thiểu)

1. Thu hồi `NEXTAUTH_SECRET` / rotate OAuth secrets nếu lộ.
2. Disable cron secret cũ; tạo secret mới.
3. Kiểm tra audit logs: `[audit]` trên server (role change, account delete, join approve).
4. Buộc user đổi mật khẩu nếu credentials bị lộ.

## Report

Báo lỗ hổng: liên hệ qua email trong README footer / maintainer repo.
