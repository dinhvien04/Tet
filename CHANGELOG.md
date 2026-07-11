# Changelog

## Unreleased / main

### Round 3 — Production hardening (2026-07)
- Next.js 16.2.10 + NextAuth 4.24.14; removed unused `@google/generative-ai`
- Bầu Cua: FamilyState lock (betRevision + betting→rolling CAS), start idle→starting CAS, no aborted-tx continue, reserved invariant without clamp, requireReplicaSet
- Account delete: password required only when credentials+active; TX + StorageCleanupJob outbox
- Family/System admin CAS locks (`FamilyAdminState`, `SystemAdminState`)
- AI daily quota reserve-before-provider + exact bucket release
- Rate limit: E11000 upsert retry, exact bucketKey release, hashed invite codes
- Upload: delete Photo on post-create failure; Cloudinary cleanup enqueue; no email in DTO; max processed bytes
- CSP: no `unsafe-eval` in production; diagnostics token ≠ CRON_SECRET
- Cursor validation (ObjectId, size, extra fields); camelCase API DTOs; CI runs integration + audit (no `|| true`)
- Scripts: `migration:round3:audit|apply`
- Event/post delete cascade (tasks/RSVP/comments/reactions/notifications) in TX
- Cron `/api/cron/storage-cleanup`; middleware skips all `/api/*`
- Real RS integration tests (skip without Mongo); E2E protected routes when `E2E_BASE_URL` set

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
