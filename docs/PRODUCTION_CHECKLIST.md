# Production checklist — Tết Connect

## Trước deploy

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # hoặc cấu hình trên Vercel
npm run deploy:check
```

`deploy:check` = lint + typecheck + test:ci + build + validate:env

## Env bắt buộc (production)

| Biến | Ghi chú |
|------|---------|
| `MONGODB_URI` | Atlas (replica set khuyến nghị) |
| `NEXTAUTH_URL` | `https://your-domain` |
| `NEXTAUTH_SECRET` | ≥32 ký tự, random |
| `GOOGLE_CLIENT_ID` / `SECRET` | OAuth callback production |
| `MEGALLM_API_KEY` / `MEGALLM_MODEL` | AI |
| `CLOUDINARY_*` | Bắt buộc — không fallback `public/uploads` |
| `CRON_SECRET` | Bearer cho `/api/cron/check-notifications` |
| `SYSTEM_ADMIN_EMAILS` | optional |

## Vercel

1. Import repo, framework Next.js  
2. Set env variables  
3. Cron: `vercel.json` → hourly notifications; header `Authorization: Bearer $CRON_SECRET`  
4. Domain + Google OAuth redirect URIs  

## Sau deploy

- [ ] `/` landing load  
- [ ] Login credentials + Google  
- [ ] Tạo nhà / join mã mời  
- [ ] Upload ảnh (Cloudinary URL)  
- [ ] AI generate (đã login)  
- [ ] Bầu Cua: admin mở/quay, member cược  
- [ ] Cron: gọi cron path với secret đúng → 200; sai → 401  

## Rollback

1. Revert deploy trên Vercel (previous deployment)  
2. Nếu migration schema: giữ field optional/backward-compatible (Mongoose)  
3. Rotate secrets nếu nghi lộ  

Chi tiết dài: `docs/DEPLOYMENT_GUIDE.md`, bảo mật: `docs/SECURITY.md`.
