# Vercel Setup Guide - Tết Connect

Complete guide for deploying Tết Connect on Vercel.

## Prerequisites

- GitHub/GitLab/Bitbucket account with repository access
- Vercel account (free tier works for MVP)
- All environment variables ready (see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md))

---

## Step-by-Step Setup

### 1. Prepare Your Repository

Ensure your repository has:

```
✓ package.json with build scripts
✓ next.config.ts configured
✓ vercel.json with cron jobs
✓ .gitignore includes .env.local
✓ All code committed and pushed
```

### 2. Import Project to Vercel

#### Option A: Via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Select your Git provider (GitHub/GitLab/Bitbucket)
4. Authorize Vercel to access your repositories
5. Select the `tet-connect` repository
6. Click "Import"

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
cd tet-connect
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? No
# - Project name? tet-connect
# - Directory? ./
# - Override settings? No
```

### 3. Configure Project Settings

#### Framework Preset

Vercel should auto-detect Next.js. Verify:

- **Framework**: Next.js
- **Root Directory**: `./`
- **Build Command**: `npm run build` (or leave default)
- **Output Directory**: `.next` (or leave default)
- **Install Command**: `npm install` (or leave default)

#### Node.js Version

Set Node.js version (recommended: 18.x or 20.x):

1. Go to Project Settings → General
2. Scroll to "Node.js Version"
3. Select `18.x` or `20.x`
4. Save

### 4. Configure Environment Variables

Go to Project Settings → Environment Variables

Add the following variables for **Production** environment:

#### Required Variables

```bash
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tet-connect-prod?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

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

#### How to Add Variables

For each variable:
1. Click "Add New"
2. Enter **Key** (e.g., `MONGODB_URI`)
3. Enter **Value** (paste your actual value)
4. Select **Environment**: Production
5. Click "Save"

**Important Notes:**
- Never expose secrets in client code
- Use `NEXT_PUBLIC_` prefix only for client-accessible variables
- Double-check all values before saving
- Keep a secure backup of all environment variables

### 5. Configure Build Settings (Optional)

If you need custom build settings:

1. Go to Project Settings → General
2. Scroll to "Build & Development Settings"
3. Override settings if needed:
   ```
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   Development Command: npm run dev
   ```

### 6. Configure Domains

#### Using Vercel Domain

Your app is automatically available at:
```
https://tet-connect.vercel.app
https://tet-connect-<team>.vercel.app
```

Update `NEXTAUTH_URL` to match this domain.

#### Using Custom Domain

1. Go to Project Settings → Domains
2. Click "Add"
3. Enter your domain (e.g., `tet-connect.com`)
4. Follow DNS configuration instructions:

**For domain registrar:**
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

5. Wait for DNS propagation (can take up to 48 hours)
6. Vercel will automatically provision SSL certificate
7. Update `NEXTAUTH_URL` to use custom domain
8. Update Google OAuth redirect URIs

### 7. Configure Cron Jobs

Cron jobs are configured in `vercel.json`:

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

**Schedule Format (Cron Expression):**
- `0 * * * *` = Every hour at minute 0
- `*/30 * * * *` = Every 30 minutes
- `0 0 * * *` = Daily at midnight
- `0 9 * * 1` = Every Monday at 9 AM

**Verify Cron Jobs:**
1. Go to Project → Cron Jobs
2. Verify job is listed
3. Check execution logs after first run

**Secure Cron Endpoints:**

Ensure your cron endpoint validates the secret:

```typescript
// app/api/cron/check-notifications/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Your cron logic here
}
```

### 8. Deploy

#### Automatic Deployment

Vercel automatically deploys when you push to your main branch:

```bash
git add .
git commit -m "Ready for production"
git push origin main
```

Vercel will:
1. Detect the push
2. Start build process
3. Run `npm install`
4. Run `npm run build`
5. Deploy to production
6. Assign production URL

#### Manual Deployment

Via Vercel Dashboard:
1. Go to Deployments
2. Click "Deploy" button
3. Select branch to deploy
4. Click "Deploy"

Via Vercel CLI:
```bash
vercel --prod
```

### 9. Monitor Deployment

Watch deployment progress:
1. Go to Deployments tab
2. Click on latest deployment
3. View build logs in real-time
4. Check for errors

**Common Build Errors:**

**Error: "Module not found"**
```bash
# Solution: Ensure all dependencies are in package.json
npm install <missing-package> --save
```

**Error: "Environment variable not found"**
```bash
# Solution: Add missing env var in Vercel settings
```

**Error: "Build exceeded time limit"**
```bash
# Solution: Optimize build process or upgrade Vercel plan
```

### 10. Verify Deployment

After successful deployment:

#### Check Deployment URL
```bash
# Visit your deployment URL
https://tet-connect.vercel.app
```

#### Run Health Check
```bash
curl https://tet-connect.vercel.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "production",
  "checks": {
    "database": "healthy",
    "api": "healthy"
  },
  "responseTime": 150
}
```

#### Test Critical Flows

- [ ] Homepage loads
- [ ] Google login works
- [ ] Can create family
- [ ] Can generate AI content
- [ ] Can upload photos
- [ ] Cron jobs execute

---

## Advanced Configuration

### Preview Deployments

Vercel creates preview deployments for:
- Pull requests
- Non-production branches

**Configure Preview Environment:**
1. Go to Project Settings → Environment Variables
2. Add variables for "Preview" environment
3. Use different credentials than production

### Branch Deployments

Deploy specific branches:
1. Go to Project Settings → Git
2. Configure "Production Branch" (default: main)
3. All other branches get preview deployments

### Deployment Protection

Enable deployment protection:
1. Go to Project Settings → Deployment Protection
2. Enable "Vercel Authentication"
3. Require password for preview deployments

### Analytics

Enable Vercel Analytics:
1. Go to Analytics tab
2. Click "Enable Analytics"
3. Add analytics script to your app (optional)

### Speed Insights

Enable Speed Insights:
1. Go to Speed Insights tab
2. Click "Enable Speed Insights"
3. Monitor Core Web Vitals

---

## Vercel CLI Commands

Useful commands for managing deployments:

```bash
# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# List deployments
vercel ls

# View deployment logs
vercel logs <deployment-url>

# Remove deployment
vercel rm <deployment-url>

# Link local project to Vercel project
vercel link

# Pull environment variables
vercel env pull .env.local

# Add environment variable
vercel env add VARIABLE_NAME

# List environment variables
vercel env ls

# View project info
vercel inspect

# Open project in browser
vercel open
```

---

## Troubleshooting

### Deployment Fails

**Check build logs:**
1. Go to Deployments
2. Click failed deployment
3. View "Building" logs
4. Look for error messages

**Common fixes:**
- Verify all dependencies in package.json
- Check environment variables
- Ensure build command is correct
- Check for TypeScript errors

### Environment Variables Not Working

**Verify variables:**
1. Go to Project Settings → Environment Variables
2. Check variable names (case-sensitive)
3. Verify environment (Production/Preview/Development)
4. Redeploy after adding variables

**Access in code:**
```typescript
// Server-side (API routes, getServerSideProps)
const secret = process.env.MY_SECRET;

// Client-side (must use NEXT_PUBLIC_ prefix)
const publicKey = process.env.NEXT_PUBLIC_API_KEY;
```

### Cron Jobs Not Running

**Check cron configuration:**
1. Verify `vercel.json` syntax
2. Check cron schedule format
3. Verify endpoint exists
4. Check cron logs in Vercel dashboard

**Test cron endpoint manually:**
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.vercel.app/api/cron/check-notifications
```

### Custom Domain Not Working

**Check DNS configuration:**
```bash
# Check A record
dig your-domain.com A

# Check CNAME record
dig www.your-domain.com CNAME
```

**Verify in Vercel:**
1. Go to Domains
2. Check domain status
3. Look for DNS configuration errors
4. Wait for DNS propagation (up to 48 hours)

### SSL Certificate Issues

Vercel automatically provisions SSL certificates. If issues occur:
1. Verify domain ownership
2. Check DNS configuration
3. Wait for certificate provisioning (can take a few minutes)
4. Contact Vercel support if persists

---

## Performance Optimization

### Enable Edge Functions

For faster response times:
1. Use Edge Runtime for API routes:
```typescript
export const runtime = 'edge';
```

### Configure Caching

Add cache headers:
```typescript
export async function GET() {
  return new Response(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  });
}
```

### Image Optimization

Use Next.js Image component:
```typescript
import Image from 'next/image';

<Image
  src="/photo.jpg"
  width={800}
  height={600}
  alt="Photo"
/>
```

### Bundle Analysis

Analyze bundle size:
```bash
npm install @next/bundle-analyzer

# Add to next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true npm run build
```

---

## Security Best Practices

1. **Never commit secrets** to Git
2. **Use environment variables** for all sensitive data
3. **Enable Deployment Protection** for preview deployments
4. **Implement rate limiting** on API routes
5. **Validate CRON_SECRET** in cron endpoints
6. **Use HTTPS only** (Vercel enforces this)
7. **Regular security audits**: `npm audit`
8. **Keep dependencies updated**: `npm update`
9. **Monitor deployment logs** for suspicious activity
10. **Enable Vercel Firewall** (Pro plan)

---

## Monitoring & Maintenance

### View Logs

Real-time logs:
1. Go to Project → Logs
2. Filter by:
   - Time range
   - Status (errors, warnings)
   - Source (API routes, functions)

Via CLI:
```bash
vercel logs <deployment-url>
```

### Monitor Performance

1. Go to Analytics tab
2. Monitor:
   - Page views
   - Unique visitors
   - Top pages
   - Referrers

3. Go to Speed Insights tab
4. Monitor Core Web Vitals:
   - LCP (Largest Contentful Paint)
   - FID (First Input Delay)
   - CLS (Cumulative Layout Shift)

### Set Up Alerts

Configure alerts for:
- Deployment failures
- High error rates
- Performance degradation
- Quota limits

---

## Rollback Procedures

### Instant Rollback

1. Go to Deployments
2. Find last stable deployment
3. Click "..." menu
4. Select "Promote to Production"
5. Confirm

### Rollback via CLI

```bash
# List deployments
vercel ls

# Promote specific deployment
vercel promote <deployment-url>
```

---

## Cost Optimization

### Free Tier Limits

Vercel Free tier includes:
- 100 GB bandwidth/month
- 100 GB-hours serverless function execution
- 1000 cron job executions/month
- Unlimited deployments

### Monitor Usage

1. Go to Settings → Usage
2. Monitor:
   - Bandwidth
   - Function execution time
   - Build minutes
   - Cron executions

### Optimize Costs

- Use Edge Functions (faster, cheaper)
- Implement caching
- Optimize images
- Reduce bundle size
- Use ISR (Incremental Static Regeneration)

---

## Support & Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Vercel Support**: https://vercel.com/support
- **Community**: https://github.com/vercel/vercel/discussions
- **Status Page**: https://vercel-status.com

---

## Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Cron jobs tested
- [ ] Health check endpoint working
- [ ] Google OAuth redirect URIs updated
- [ ] MongoDB connection working
- [ ] Cloudinary uploads working
- [ ] Error tracking configured
- [ ] Analytics enabled
- [ ] Performance tested
- [ ] Security review completed
- [ ] Backup strategy in place
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Team notified

---

**You're ready to deploy! 🚀**
