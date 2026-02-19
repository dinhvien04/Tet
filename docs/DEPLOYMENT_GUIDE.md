# Deployment Guide - Tết Connect

This guide covers the complete deployment process for Tết Connect to production.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Variables Setup](#environment-variables-setup)
3. [Vercel Deployment](#vercel-deployment)
4. [MongoDB Production Setup](#mongodb-production-setup)
5. [Cloudinary Production Setup](#cloudinary-production-setup)
6. [Google OAuth Production Setup](#google-oauth-production-setup)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Rollback Procedures](#rollback-procedures)

---

## Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All tests pass (`npm test`)
- [ ] Property-based tests pass with 100+ iterations
- [ ] No console errors in development
- [ ] All environment variables documented
- [ ] Database migrations tested
- [ ] Backup strategy in place
- [ ] Error tracking configured (optional: Sentry)
- [ ] Performance testing completed
- [ ] Security review completed
- [ ] HTTPS enforced
- [ ] CORS policies configured

---

## Environment Variables Setup

### 1. Create Production Environment Variables

Copy the production template:

```bash
cp .env.production.example .env.production
```

### 2. Configure Each Variable

#### MongoDB Configuration

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tet-connect-prod?retryWrites=true&w=majority
```

**Steps:**
1. Create production cluster in MongoDB Atlas
2. Create dedicated database user with strong password
3. Whitelist Vercel IP addresses (or use 0.0.0.0/0 with strong auth)
4. Enable connection pooling
5. Set up automated backups

**Security Notes:**
- Use different credentials than development
- Enable IP whitelist if possible
- Use strong, unique passwords
- Enable MongoDB audit logs

#### NextAuth Configuration

```env
NEXTAUTH_URL=https://your-production-domain.com
NEXTAUTH_SECRET=<generate-secure-secret>
```

**Generate secure secret:**
```bash
openssl rand -base64 32
```

**Important:**
- Use HTTPS URL only
- Never reuse development secret
- Store secret securely (use Vercel environment variables)

#### Google OAuth

```env
GOOGLE_CLIENT_ID=your-production-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-production-client-secret
```

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new OAuth 2.0 credentials (or use existing)
3. Add authorized redirect URIs:
   - `https://your-domain.com/api/auth/callback/google`
   - `https://your-domain.vercel.app/api/auth/callback/google`
4. Copy Client ID and Secret

#### Cloudinary Configuration

```env
CLOUDINARY_CLOUD_NAME=your-production-cloud-name
CLOUDINARY_API_KEY=your-production-api-key
CLOUDINARY_API_SECRET=your-production-api-secret
```

**Steps:**
1. Create production Cloudinary account (or use existing)
2. Configure upload presets
3. Set up transformations for image optimization
4. Configure storage quotas

#### Gemini AI

```env
GEMINI_API_KEY=your-production-gemini-api-key
```

**Steps:**
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Consider separate key for production
3. Set appropriate rate limits
4. Monitor usage quotas

#### Cron Job Security

```env
CRON_SECRET=your-secure-random-token
```

**Generate secure token:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Vercel Deployment

### Step 1: Prepare Repository

1. Ensure code is pushed to GitHub/GitLab/Bitbucket
2. Verify `package.json` has correct build scripts:
   ```json
   {
     "scripts": {
       "build": "next build",
       "start": "next start"
     }
   }
   ```

### Step 2: Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your Git repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (or your project root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Step 3: Configure Environment Variables

In Vercel project settings → Environment Variables, add:

**Production Environment:**
```
MONGODB_URI=<your-production-mongodb-uri>
NEXTAUTH_URL=<your-production-url>
NEXTAUTH_SECRET=<your-production-secret>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
CLOUDINARY_CLOUD_NAME=<your-cloudinary-name>
CLOUDINARY_API_KEY=<your-cloudinary-key>
CLOUDINARY_API_SECRET=<your-cloudinary-secret>
GEMINI_API_KEY=<your-gemini-key>
CRON_SECRET=<your-cron-secret>
```

**Important:**
- Select "Production" environment for each variable
- Never expose secrets in client-side code
- Use `NEXT_PUBLIC_` prefix only for client-accessible variables

### Step 4: Configure Vercel Settings

#### vercel.json Configuration

Ensure `vercel.json` is configured:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-notifications",
      "schedule": "0 * * * *"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Step 5: Deploy

1. Click "Deploy" in Vercel dashboard
2. Wait for build to complete
3. Verify deployment URL

### Step 6: Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Wait for SSL certificate provisioning
5. Update `NEXTAUTH_URL` to use custom domain

---

## MongoDB Production Setup

### 1. Create Production Cluster

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create new cluster or use existing
3. Choose appropriate tier (M10+ recommended for production)
4. Select region closest to your users

### 2. Database Configuration

```javascript
// Recommended production settings
{
  "name": "tet-connect-prod",
  "collections": [
    "users",
    "families",
    "posts",
    "events",
    "photos",
    "notifications"
  ]
}
```

### 3. Security Configuration

**Network Access:**
- Add Vercel IP ranges (or 0.0.0.0/0 with strong authentication)
- Enable VPC peering if available

**Database Users:**
```javascript
{
  "username": "tet-connect-prod",
  "password": "<strong-password>",
  "roles": [
    {
      "role": "readWrite",
      "db": "tet-connect-prod"
    }
  ]
}
```

### 4. Backup Strategy

1. Enable automated backups in Atlas
2. Configure backup schedule (daily recommended)
3. Test restore procedure
4. Document recovery process

### 5. Monitoring

1. Enable MongoDB monitoring
2. Set up alerts for:
   - High CPU usage
   - Memory usage
   - Connection pool exhaustion
   - Slow queries

---

## Cloudinary Production Setup

### 1. Account Configuration

1. Create production Cloudinary account
2. Upgrade to appropriate plan based on usage
3. Configure upload presets

### 2. Upload Presets

Create presets for different media types:

**Photos Preset:**
```json
{
  "name": "tet-connect-photos",
  "unsigned": false,
  "folder": "tet-connect/photos",
  "transformation": [
    {
      "width": 1920,
      "height": 1080,
      "crop": "limit",
      "quality": "auto:good",
      "fetch_format": "auto"
    }
  ]
}
```

**Thumbnails Preset:**
```json
{
  "name": "tet-connect-thumbnails",
  "unsigned": false,
  "folder": "tet-connect/thumbnails",
  "transformation": [
    {
      "width": 400,
      "height": 400,
      "crop": "fill",
      "quality": "auto:low",
      "fetch_format": "auto"
    }
  ]
}
```

### 3. Security Settings

1. Enable signed uploads
2. Configure allowed formats: `jpg,png,heic,mp4,webm`
3. Set max file size: 10MB for photos, 100MB for videos
4. Enable auto-moderation (optional)

---

## Google OAuth Production Setup

### 1. Configure OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → OAuth consent screen
3. Configure:
   - **App name**: Tết Connect
   - **User support email**: your-email@domain.com
   - **App logo**: Upload your logo
   - **Authorized domains**: your-domain.com
   - **Developer contact**: your-email@domain.com

### 2. Create OAuth 2.0 Credentials

1. Go to APIs & Services → Credentials
2. Create OAuth 2.0 Client ID
3. Application type: Web application
4. Add authorized redirect URIs:
   ```
   https://your-domain.com/api/auth/callback/google
   https://your-domain.vercel.app/api/auth/callback/google
   ```

### 3. Verification (if needed)

For apps requiring verification:
1. Submit app for verification
2. Provide privacy policy URL
3. Provide terms of service URL
4. Complete verification process

---

## Post-Deployment Verification

### 1. Smoke Tests

Test critical user flows:

- [ ] User can access homepage
- [ ] User can log in with Google
- [ ] User can create family
- [ ] User can generate AI content
- [ ] User can create posts
- [ ] User can upload photos
- [ ] User can create events
- [ ] Notifications work
- [ ] Realtime updates work

### 2. Performance Tests

- [ ] Page load time < 3 seconds
- [ ] Time to Interactive < 5 seconds
- [ ] Lighthouse score > 90
- [ ] No console errors
- [ ] Images load properly
- [ ] API responses < 1 second

### 3. Security Tests

- [ ] HTTPS enforced
- [ ] No exposed secrets in client code
- [ ] CORS configured correctly
- [ ] Rate limiting works
- [ ] Authentication required for protected routes
- [ ] File upload validation works

### 4. Database Verification

```bash
# Connect to production MongoDB
mongosh "mongodb+srv://cluster.mongodb.net/tet-connect-prod" --username <user>

# Verify collections exist
show collections

# Check sample data
db.users.findOne()
db.families.findOne()

# Verify indexes
db.users.getIndexes()
db.posts.getIndexes()
```

---

## Monitoring & Maintenance

### 1. Vercel Analytics

Enable Vercel Analytics:
1. Go to Project Settings → Analytics
2. Enable Web Analytics
3. Monitor:
   - Page views
   - Unique visitors
   - Performance metrics
   - Error rates

### 2. Error Tracking (Optional: Sentry)

```bash
npm install @sentry/nextjs
```

Configure Sentry:
```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 3. Uptime Monitoring

Set up uptime monitoring:
- Use Vercel's built-in monitoring
- Or external services: UptimeRobot, Pingdom
- Monitor critical endpoints:
  - `/` (homepage)
  - `/api/health` (create health check endpoint)
  - `/api/auth/session`

### 4. Log Monitoring

Monitor logs in Vercel:
1. Go to Project → Logs
2. Filter by:
   - Errors
   - Warnings
   - API routes
3. Set up alerts for critical errors

---

## Rollback Procedures

### Quick Rollback (Vercel)

1. Go to Vercel Dashboard → Deployments
2. Find last stable deployment
3. Click "..." → "Promote to Production"
4. Confirm rollback

### Database Rollback

If database migration fails:

```bash
# Restore from backup
mongorestore --uri="mongodb+srv://..." --archive=backup.archive

# Or restore specific collection
mongorestore --uri="mongodb+srv://..." --nsInclude="tet-connect-prod.users" backup/
```

### Environment Variables Rollback

1. Go to Vercel → Settings → Environment Variables
2. View history of changes
3. Restore previous values
4. Redeploy

---

## Troubleshooting

### Common Issues

**Issue: "NEXTAUTH_URL mismatch"**
- Solution: Ensure `NEXTAUTH_URL` matches your production domain exactly

**Issue: "MongoDB connection timeout"**
- Solution: Check IP whitelist, verify connection string, check network access

**Issue: "Google OAuth redirect_uri_mismatch"**
- Solution: Add production URL to authorized redirect URIs in Google Console

**Issue: "Cloudinary upload fails"**
- Solution: Verify API credentials, check upload preset configuration

**Issue: "Cron jobs not running"**
- Solution: Verify `CRON_SECRET` is set, check Vercel cron logs

### Getting Help

- Vercel Support: https://vercel.com/support
- MongoDB Support: https://support.mongodb.com
- Community: GitHub Issues

---

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use environment variables** for all sensitive data
3. **Enable HTTPS only** in production
4. **Implement rate limiting** on API routes
5. **Validate all user inputs** on server-side
6. **Use prepared statements** for database queries
7. **Enable CORS** only for trusted domains
8. **Regular security audits** with `npm audit`
9. **Keep dependencies updated**
10. **Monitor for suspicious activity**

---

## Performance Optimization

1. **Enable Next.js Image Optimization**
2. **Use CDN** for static assets (Vercel Edge Network)
3. **Implement caching** strategies (SWR, React Query)
4. **Lazy load** components and images
5. **Optimize bundle size** with code splitting
6. **Enable compression** (gzip/brotli)
7. **Use database indexes** for frequent queries
8. **Implement pagination** for large lists
9. **Monitor Core Web Vitals**
10. **Regular performance testing**

---

## Conclusion

Following this guide ensures a smooth, secure, and reliable deployment of Tết Connect to production. Remember to:

- Test thoroughly before deploying
- Monitor continuously after deployment
- Keep documentation updated
- Have rollback plan ready
- Regular backups and security updates

**Happy deploying! 🚀**
