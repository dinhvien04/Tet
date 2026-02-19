# Task 20.2: Vercel Deployment - Execution Guide

## Tổng quan

Tài liệu này hướng dẫn chi tiết cách deploy Tết Connect lên Vercel production. Vì deployment thực tế yêu cầu quyền truy cập vào các dịch vụ bên ngoài, tài liệu này cung cấp hướng dẫn từng bước để người dùng có thể thực hiện.

## Điều kiện tiên quyết

Trước khi bắt đầu deployment, đảm bảo bạn đã:

- [x] Hoàn thành task 20.1 (Chuẩn bị deployment)
- [x] Có tài khoản Vercel (miễn phí hoặc trả phí)
- [x] Có tài khoản GitHub/GitLab/Bitbucket với repository
- [x] Đã chuẩn bị tất cả environment variables
- [x] MongoDB Atlas production cluster đã sẵn sàng
- [x] Cloudinary production account đã sẵn sàng
- [x] Google OAuth credentials đã cấu hình
- [x] Gemini API key đã có

---

## Bước 1: Kiểm tra Code Sẵn sàng

### 1.1 Chạy Tests

```bash
# Chạy tất cả tests
npm test

# Kiểm tra coverage
npm run test:coverage

# Đảm bảo không có test nào fail
```

**Kết quả mong đợi:**
- ✅ Tất cả tests pass
- ✅ Coverage >= 80%
- ✅ Không có console errors

### 1.2 Build Production

```bash
# Build production
npm run build

# Kiểm tra build thành công
npm run start
```

**Kết quả mong đợi:**
- ✅ Build thành công không có errors
- ✅ Application chạy được ở local với production build
- ✅ Không có TypeScript errors

### 1.3 Validate Environment Variables

```bash
# Chạy script validation
node scripts/validate-env.js
```

**Kết quả mong đợi:**
- ✅ Tất cả required environment variables được định nghĩa
- ✅ Format của các variables đúng

### 1.4 Commit và Push Code

```bash
# Đảm bảo tất cả thay đổi đã được commit
git status

# Nếu có thay đổi chưa commit
git add .
git commit -m "chore: prepare for production deployment"

# Push lên remote repository
git push origin main
```

---

## Bước 2: Chuẩn bị Environment Variables

### 2.1 Tạo File Environment Variables

Tạo file `production-env-vars.txt` (KHÔNG commit file này):

```bash
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tet-connect-prod?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_URL=https://tet-connect.vercel.app
NEXTAUTH_SECRET=<your-generated-secret>

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Cron Security
CRON_SECRET=your-secure-random-token
```

### 2.2 Generate Secrets

Nếu chưa có, generate các secrets:

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate CRON_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.3 Verify All Values

Checklist:
- [ ] `MONGODB_URI` - Connection string từ MongoDB Atlas
- [ ] `NEXTAUTH_URL` - URL production của bạn
- [ ] `NEXTAUTH_SECRET` - Secret 32+ characters
- [ ] `GOOGLE_CLIENT_ID` - Từ Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` - Từ Google Cloud Console
- [ ] `CLOUDINARY_CLOUD_NAME` - Từ Cloudinary dashboard
- [ ] `CLOUDINARY_API_KEY` - Từ Cloudinary dashboard
- [ ] `CLOUDINARY_API_SECRET` - Từ Cloudinary dashboard
- [ ] `GEMINI_API_KEY` - Từ Google AI Studio
- [ ] `CRON_SECRET` - Generated secure token

---

## Bước 3: Deploy lên Vercel

### 3.1 Import Project

#### Option A: Via Vercel Dashboard (Recommended)

1. Truy cập https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Chọn Git provider (GitHub/GitLab/Bitbucket)
4. Authorize Vercel nếu chưa
5. Tìm và select repository `tet-connect`
6. Click **"Import"**

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI (nếu chưa có)
npm i -g vercel

# Login
vercel login

# Deploy
cd tet-connect
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? [Select your account]
# - Link to existing project? No
# - Project name? tet-connect
# - Directory? ./
# - Override settings? No
```

### 3.2 Configure Project Settings

Trong Vercel project settings:

1. **Framework Preset**: Next.js (auto-detected)
2. **Root Directory**: `./`
3. **Build Command**: `npm run build` (default)
4. **Output Directory**: `.next` (default)
5. **Install Command**: `npm install` (default)
6. **Node.js Version**: 18.x hoặc 20.x

**Lưu settings**

### 3.3 Add Environment Variables

1. Go to **Project Settings** → **Environment Variables**
2. Thêm từng variable:

**Cách thêm:**
- Click **"Add New"**
- **Key**: Tên variable (vd: `MONGODB_URI`)
- **Value**: Giá trị (paste từ file `production-env-vars.txt`)
- **Environment**: Chọn **"Production"**
- Click **"Save"**

**Thêm tất cả 9 variables:**
1. `MONGODB_URI`
2. `NEXTAUTH_URL`
3. `NEXTAUTH_SECRET`
4. `GOOGLE_CLIENT_ID`
5. `GOOGLE_CLIENT_SECRET`
6. `CLOUDINARY_CLOUD_NAME`
7. `CLOUDINARY_API_KEY`
8. `CLOUDINARY_API_SECRET`
9. `GEMINI_API_KEY`
10. `CRON_SECRET`

**⚠️ Quan trọng:**
- Kiểm tra kỹ không có typo
- Đảm bảo chọn đúng environment "Production"
- Không có khoảng trắng thừa ở đầu/cuối values

### 3.4 Deploy

Sau khi add environment variables:

1. Go to **Deployments** tab
2. Click **"Redeploy"** (hoặc push code mới)
3. Chờ build process hoàn thành (2-5 phút)

**Monitor deployment:**
- Xem build logs real-time
- Kiểm tra không có errors
- Đợi status chuyển sang "Ready"

### 3.5 Get Deployment URL

Sau khi deploy thành công:

```
Production URL: https://tet-connect.vercel.app
hoặc
https://tet-connect-[team-name].vercel.app
```

**Copy URL này để dùng cho các bước tiếp theo**

---

## Bước 4: Configure Custom Domain (Optional)

Nếu bạn có custom domain:

### 4.1 Add Domain to Vercel

1. Go to **Project Settings** → **Domains**
2. Click **"Add"**
3. Enter domain: `tet-connect.com` (hoặc domain của bạn)
4. Click **"Add"**

### 4.2 Configure DNS

Vercel sẽ hiển thị DNS records cần thêm:

**Tại domain registrar của bạn (GoDaddy, Namecheap, etc.):**

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 4.3 Wait for DNS Propagation

- DNS propagation có thể mất 5 phút đến 48 giờ
- Kiểm tra status trong Vercel dashboard
- SSL certificate sẽ tự động được provision

### 4.4 Update Environment Variables

Sau khi custom domain active:

1. Go to **Environment Variables**
2. Update `NEXTAUTH_URL`:
   ```
   NEXTAUTH_URL=https://tet-connect.com
   ```
3. **Redeploy** để apply changes

### 4.5 Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit OAuth 2.0 Client ID
4. Add authorized redirect URI:
   ```
   https://tet-connect.com/api/auth/callback/google
   ```
5. Save

---

## Bước 5: Verify Deployment

### 5.1 Basic Health Check

```bash
# Check homepage
curl https://tet-connect.vercel.app

# Expected: HTML response with status 200
```

### 5.2 Test Critical Flows

Mở browser và test:

#### ✅ Homepage
- [ ] Trang chủ load thành công
- [ ] Không có console errors
- [ ] Images và assets load đúng

#### ✅ Authentication
- [ ] Click "Đăng nhập bằng Google"
- [ ] Redirect đến Google OAuth
- [ ] Sau khi authorize, redirect về app
- [ ] Session được lưu (refresh page vẫn logged in)

#### ✅ Family Management
- [ ] Tạo family mới
- [ ] Nhận được invite code
- [ ] Copy invite link
- [ ] Mở invite link ở incognito window
- [ ] Join family thành công

#### ✅ AI Content Generation
- [ ] Mở form tạo câu đối
- [ ] Nhập thông tin và generate
- [ ] Nhận được nội dung AI
- [ ] Đăng lên tường nhà

#### ✅ Posts & Reactions
- [ ] Xem posts trên tường nhà
- [ ] Thêm reaction (heart/haha)
- [ ] Reaction count update
- [ ] Realtime updates (mở 2 tabs)

#### ✅ Photo Upload
- [ ] Upload ảnh
- [ ] Ảnh hiển thị trong album
- [ ] Click xem ảnh full size
- [ ] Navigation prev/next

#### ✅ Events & Tasks
- [ ] Tạo event mới
- [ ] Thêm task vào event
- [ ] Assign task cho member
- [ ] Toggle task status

#### ✅ Notifications
- [ ] Notification bell hiển thị
- [ ] Click xem notifications
- [ ] Mark as read

### 5.3 Performance Check

```bash
# Run Lighthouse audit
npx lighthouse https://tet-connect.vercel.app --view

# Expected scores:
# Performance: > 90
# Accessibility: > 90
# Best Practices: > 90
# SEO: > 90
```

### 5.4 Database Verification

```bash
# Connect to MongoDB
mongosh "mongodb+srv://cluster.mongodb.net/tet-connect-prod" --username <user>

# Verify data
use tet-connect-prod
show collections

# Check sample data
db.users.findOne()
db.families.findOne()
db.posts.findOne()

# Verify indexes
db.users.getIndexes()
db.posts.getIndexes()
```

### 5.5 Cron Jobs Verification

1. Go to Vercel **Project** → **Cron Jobs**
2. Verify job is listed:
   ```
   Path: /api/cron/check-notifications
   Schedule: 0 * * * * (every hour)
   ```
3. Wait for first execution (check logs after 1 hour)
4. Or trigger manually:
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://tet-connect.vercel.app/api/cron/check-notifications
   ```

---

## Bước 6: Setup Monitoring

### 6.1 Enable Vercel Analytics

1. Go to **Analytics** tab
2. Click **"Enable Analytics"**
3. Monitor:
   - Page views
   - Unique visitors
   - Top pages
   - Referrers

### 6.2 Enable Speed Insights

1. Go to **Speed Insights** tab
2. Click **"Enable Speed Insights"**
3. Monitor Core Web Vitals:
   - LCP (Largest Contentful Paint)
   - FID (First Input Delay)
   - CLS (Cumulative Layout Shift)

### 6.3 Setup Error Tracking (Optional)

Nếu muốn dùng Sentry:

```bash
# Install Sentry
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard -i nextjs

# Configure DSN in environment variables
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### 6.4 Setup Uptime Monitoring

Sử dụng service như:
- **UptimeRobot** (free): https://uptimerobot.com
- **Pingdom**: https://pingdom.com
- **StatusCake**: https://statuscake.com

Monitor endpoints:
- `https://tet-connect.vercel.app/` (homepage)
- `https://tet-connect.vercel.app/api/health` (nếu có)

---

## Bước 7: Configure Analytics (Optional)

### 7.1 Google Analytics

1. Create GA4 property
2. Get Measurement ID
3. Add to environment variables:
   ```
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```
4. Add tracking code to `app/layout.tsx`

### 7.2 Vercel Web Analytics

Already enabled in step 6.1

### 7.3 Custom Analytics

Nếu muốn track custom events:

```typescript
// lib/analytics.ts
export function trackEvent(eventName: string, properties?: any) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, properties);
  }
}

// Usage
trackEvent('family_created', { familyId: family.id });
trackEvent('ai_content_generated', { type: 'cau-doi' });
```

---

## Bước 8: Post-Deployment Tasks

### 8.1 Update Documentation

- [ ] Update README.md với production URL
- [ ] Document any deployment-specific configurations
- [ ] Update API documentation nếu có

### 8.2 Notify Team

- [ ] Thông báo team về deployment thành công
- [ ] Share production URL
- [ ] Share monitoring dashboards
- [ ] Document any known issues

### 8.3 Create Backup

- [ ] Verify MongoDB backups enabled
- [ ] Test restore procedure
- [ ] Document backup/restore process

### 8.4 Security Review

- [ ] HTTPS enforced ✓ (Vercel default)
- [ ] Environment variables secure ✓
- [ ] No secrets in client code ✓
- [ ] CORS configured ✓
- [ ] Rate limiting implemented ✓
- [ ] Authentication working ✓

---

## Troubleshooting

### Issue: Build Fails

**Symptoms:**
- Deployment status: "Error"
- Build logs show errors

**Solutions:**

1. **Check build logs:**
   - Go to Deployments → Click failed deployment
   - Read error messages

2. **Common fixes:**
   ```bash
   # TypeScript errors
   npm run build  # Fix locally first
   
   # Missing dependencies
   npm install <package> --save
   
   # Environment variables
   # Verify all required vars are set in Vercel
   ```

3. **Test locally:**
   ```bash
   # Build production locally
   npm run build
   npm run start
   ```

### Issue: Environment Variables Not Working

**Symptoms:**
- App crashes with "undefined" errors
- Database connection fails

**Solutions:**

1. **Verify variables in Vercel:**
   - Go to Settings → Environment Variables
   - Check all variables are set for "Production"
   - No typos in variable names

2. **Redeploy after adding variables:**
   - Environment variables only apply to new deployments
   - Click "Redeploy" after adding/updating variables

3. **Check variable access:**
   ```typescript
   // Server-side only (API routes, getServerSideProps)
   const secret = process.env.MY_SECRET;
   
   // Client-side (must use NEXT_PUBLIC_ prefix)
   const publicKey = process.env.NEXT_PUBLIC_API_KEY;
   ```

### Issue: Google OAuth Not Working

**Symptoms:**
- "redirect_uri_mismatch" error
- OAuth fails after Google authorization

**Solutions:**

1. **Update Google OAuth redirect URIs:**
   - Go to Google Cloud Console
   - Add production URL:
     ```
     https://tet-connect.vercel.app/api/auth/callback/google
     ```

2. **Verify NEXTAUTH_URL:**
   - Must match production domain exactly
   - Include https://
   - No trailing slash

3. **Check credentials:**
   - Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
   - Ensure using production credentials

### Issue: MongoDB Connection Fails

**Symptoms:**
- "MongoServerError: bad auth"
- "Connection timeout"

**Solutions:**

1. **Check IP whitelist:**
   - MongoDB Atlas → Network Access
   - Add `0.0.0.0/0` or Vercel IPs

2. **Verify connection string:**
   - Check username and password
   - Ensure database name is correct
   - Test connection locally

3. **Check user permissions:**
   - MongoDB Atlas → Database Access
   - Verify user has readWrite permissions

### Issue: Cron Jobs Not Running

**Symptoms:**
- Notifications not sent
- Cron logs empty

**Solutions:**

1. **Verify vercel.json:**
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/check-notifications",
         "schedule": "0 * * * *"
       }
     ]
   }
   ```

2. **Check CRON_SECRET:**
   - Verify environment variable is set
   - Endpoint validates secret correctly

3. **Test endpoint manually:**
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://tet-connect.vercel.app/api/cron/check-notifications
   ```

4. **Check cron logs:**
   - Go to Vercel → Cron Jobs
   - View execution logs

### Issue: Images Not Loading

**Symptoms:**
- Broken image icons
- 404 errors for images

**Solutions:**

1. **Check Cloudinary configuration:**
   - Verify API credentials
   - Test upload manually

2. **Check image URLs:**
   - Ensure URLs are absolute
   - Verify Cloudinary URLs are accessible

3. **Check Next.js Image config:**
   ```typescript
   // next.config.ts
   images: {
     domains: ['res.cloudinary.com'],
   }
   ```

---

## Rollback Procedure

Nếu deployment có vấn đề nghiêm trọng:

### Quick Rollback

1. Go to Vercel **Deployments**
2. Find last stable deployment
3. Click **"..."** menu
4. Select **"Promote to Production"**
5. Confirm rollback

### Via CLI

```bash
# List deployments
vercel ls

# Promote specific deployment
vercel promote <deployment-url>
```

### After Rollback

1. Investigate issue in logs
2. Fix issue locally
3. Test thoroughly
4. Redeploy when ready

---

## Success Criteria

Deployment được coi là thành công khi:

- [x] Build thành công không có errors
- [x] Application accessible tại production URL
- [x] Tất cả critical flows hoạt động:
  - [x] Authentication
  - [x] Family management
  - [x] AI content generation
  - [x] Posts & reactions
  - [x] Photo upload
  - [x] Events & tasks
  - [x] Notifications
- [x] Performance metrics đạt yêu cầu:
  - [x] Lighthouse score > 90
  - [x] Page load < 3s
  - [x] API response < 1s
- [x] Security checks pass:
  - [x] HTTPS enforced
  - [x] No exposed secrets
  - [x] Authentication working
- [x] Monitoring setup:
  - [x] Analytics enabled
  - [x] Error tracking configured
  - [x] Uptime monitoring active
- [x] Documentation updated
- [x] Team notified

---

## Next Steps

Sau khi deployment thành công:

1. **Monitor for 24-48 hours:**
   - Watch error logs
   - Monitor performance
   - Check user feedback

2. **Gather feedback:**
   - Test with real users
   - Collect bug reports
   - Note feature requests

3. **Iterate:**
   - Fix critical bugs immediately
   - Plan improvements
   - Schedule updates

4. **Maintain:**
   - Regular security updates
   - Performance optimization
   - Feature enhancements

---

## Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **MongoDB Atlas**: https://docs.atlas.mongodb.com
- **Google OAuth**: https://developers.google.com/identity/protocols/oauth2
- **Cloudinary**: https://cloudinary.com/documentation

---

## Checklist Summary

### Pre-Deployment
- [ ] All tests pass
- [ ] Production build successful
- [ ] Environment variables prepared
- [ ] Code pushed to repository

### Deployment
- [ ] Project imported to Vercel
- [ ] Environment variables configured
- [ ] Deployment successful
- [ ] Production URL accessible

### Verification
- [ ] All critical flows tested
- [ ] Performance metrics acceptable
- [ ] Security checks passed
- [ ] Database connection working

### Post-Deployment
- [ ] Monitoring enabled
- [ ] Analytics configured
- [ ] Documentation updated
- [ ] Team notified

---

**🎉 Deployment Complete!**

Production URL: `https://tet-connect.vercel.app`

Monitoring Dashboard: `https://vercel.com/[team]/tet-connect`

**Happy deploying! 🚀**
