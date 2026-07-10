# Changelog

## Unreleased / main

### P0 — Security & correctness
- NextAuth JWT làm nguồn session; bỏ MongoDBAdapter; secret fail-safe production
- AI: auth, validate, rate limit/quota, không lộ lỗi provider
- Bầu Cua: atomic reserve balance, settlement CAS, host/admin quay
- Upload: magic bytes, Cloudinary production, rollback storage
- Cron fail-closed; notification `dedupeKey`
- Open redirect helper; authorization helpers; last-admin guards

### P1 — Architecture & UX
- Dashboard summary API (không slice full list)
- Cursor pagination helpers; posts/photos
- Admin users pagination + search
- Landing page + Tết design tokens
- CI GitHub Actions; `.env.example`; validate-env MegaLLM
- Polling thay Supabase realtime

### P2 — Product
- CRUD post/event/task/photo/comment với authz
- Regenerate invite; join request + admin approve/reject; requireJoinApproval
- Invite expiry (optional days) + revoke via regenerate
- RSVP sự kiện; export `.ics`
- Profile: name/avatar, password, delete account, export JSON, notification prefs
- Notification mark all; event filter upcoming/past
- Bầu Cua UI: chips, countdown, admin controls, tiếng Việt
- Theme toggle (light/dark/system)
- Legacy Supabase tests moved to `tests/legacy-supabase/` (excluded from default Vitest)
- ARCHITECTURE/SECURITY docs reflect MongoDB stack

## Notes
- Game chỉ điểm ảo — không thanh toán.
- Stack: Next.js, MongoDB, NextAuth, Cloudinary, MegaLLM.
