# Deployment Checklist - Tết Connect

Use this checklist to ensure a smooth deployment to production.

## Pre-Deployment

### Code Quality
- [ ] All tests pass (`npm test`)
- [ ] Property-based tests pass (100+ iterations)
- [ ] No TypeScript errors (`npm run build`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Code reviewed and approved
- [ ] All features tested manually
- [ ] Performance tested (Lighthouse score > 90)
- [ ] Security audit completed (`npm audit`)

### Documentation
- [ ] README.md updated
- [ ] API documentation complete
- [ ] Environment variables documented
- [ ] Deployment guide reviewed
- [ ] Changelog updated

### Dependencies
- [ ] All dependencies up to date
- [ ] No critical vulnerabilities
- [ ] Production dependencies only in package.json
- [ ] Lock file committed (package-lock.json)

---

## Environment Setup

### MongoDB Atlas
- [ ] Production cluster created
- [ ] Database user created with strong password
- [ ] IP whitelist configured
- [ ] Backup enabled
- [ ] Indexes created
- [ ] Connection string tested
- [ ] Connection string saved securely

### Cloudinary
- [ ] Production account created
- [ ] Upload presets configured
- [ ] API credentials generated
- [ ] Storage quotas set
- [ ] Credentials saved securely

### Google OAuth
- [ ] OAuth consent screen configured
- [ ] Production credentials created
- [ ] Redirect URIs added (production URL)
- [ ] Credentials saved securely

### Gemini AI
- [ ] Production API key generated
- [ ] Rate limits configured
- [ ] Usage quotas set
- [ ] API key saved securely

### NextAuth
- [ ] Production secret generated (`openssl rand -base64 32`)
- [ ] Production URL configured
- [ ] Secret saved securely

### Cron Jobs
- [ ] Cron secret generated
- [ ] Cron endpoints secured
- [ ] Secret saved securely

---

## Vercel Configuration

### Project Setup
- [ ] Repository connected to Vercel
- [ ] Project imported
- [ ] Framework preset: Next.js
- [ ] Node.js version: 18.x or 20.x
- [ ] Build command: `npm run build`
- [ ] Output directory: `.next`

### Environment Variables
Add all variables for **Production** environment:

- [ ] `MONGODB_URI`
- [ ] `NEXTAUTH_URL`
- [ ] `NEXTAUTH_SECRET`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`
- [ ] `GEMINI_API_KEY`
- [ ] `CRON_SECRET`

### Domain Configuration
- [ ] Custom domain added (if applicable)
- [ ] DNS configured
- [ ] SSL certificate provisioned
- [ ] `NEXTAUTH_URL` updated to custom domain
- [ ] Google OAuth redirect URIs updated

### Vercel Settings
- [ ] Cron jobs configured in `vercel.json`
- [ ] Security headers configured
- [ ] Analytics enabled (optional)
- [ ] Speed Insights enabled (optional)

---

## Deployment

### Initial Deployment
- [ ] Code pushed to main branch
- [ ] Vercel build started automatically
- [ ] Build completed successfully
- [ ] Deployment URL generated
- [ ] Health check endpoint accessible

### Verification
- [ ] Homepage loads correctly
- [ ] No console errors
- [ ] All assets load (images, fonts, etc.)
- [ ] Google login works
- [ ] Can create family
- [ ] Can generate AI content
- [ ] Can create posts
- [ ] Can upload photos
- [ ] Can create events
- [ ] Notifications work
- [ ] Cron jobs execute
- [ ] Realtime updates work

---

## Post-Deployment

### Testing
- [ ] Run smoke tests on production
- [ ] Test all critical user flows
- [ ] Test on multiple browsers (Chrome, Safari, Firefox)
- [ ] Test on mobile devices (iOS, Android)
- [ ] Test error scenarios
- [ ] Verify error tracking works

### Performance
- [ ] Run Lighthouse audit
- [ ] Check Core Web Vitals
- [ ] Verify page load times < 3s
- [ ] Check API response times < 1s
- [ ] Monitor initial deployment metrics

### Security
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] No secrets exposed in client code
- [ ] CORS configured correctly
- [ ] Rate limiting works
- [ ] Authentication required for protected routes

### Monitoring
- [ ] Vercel Analytics configured
- [ ] Error tracking configured (Sentry, optional)
- [ ] Uptime monitoring configured
- [ ] Alerts configured for critical issues
- [ ] Log monitoring set up

### Database
- [ ] MongoDB connection working
- [ ] Indexes created and working
- [ ] Backup verified
- [ ] Data integrity checked
- [ ] Performance metrics normal

---

## Communication

### Team
- [ ] Team notified of deployment
- [ ] Deployment notes shared
- [ ] Known issues documented
- [ ] Support plan in place

### Users (if applicable)
- [ ] Users notified of launch
- [ ] User guide available
- [ ] Support channels ready
- [ ] Feedback mechanism in place

---

## Rollback Plan

### Preparation
- [ ] Previous stable deployment identified
- [ ] Rollback procedure documented
- [ ] Team knows how to rollback
- [ ] Database backup available

### If Issues Occur
1. [ ] Identify issue severity
2. [ ] Decide: fix forward or rollback
3. [ ] If rollback: promote previous deployment
4. [ ] Verify rollback successful
5. [ ] Notify team and users
6. [ ] Document issue and resolution

---

## Maintenance

### Daily
- [ ] Check deployment status
- [ ] Review error logs
- [ ] Monitor performance metrics
- [ ] Check uptime

### Weekly
- [ ] Review analytics
- [ ] Check for security updates
- [ ] Review user feedback
- [ ] Update documentation if needed

### Monthly
- [ ] Security audit
- [ ] Performance review
- [ ] Dependency updates
- [ ] Backup verification

---

## Emergency Contacts

Document key contacts:

```
Vercel Support: https://vercel.com/support
MongoDB Support: https://support.mongodb.com
Cloudinary Support: https://support.cloudinary.com
Google Cloud Support: https://cloud.google.com/support

Team Lead: [Name] - [Email] - [Phone]
DevOps: [Name] - [Email] - [Phone]
On-Call: [Name] - [Email] - [Phone]
```

---

## Sign-Off

Deployment completed by: ___________________

Date: ___________________

Verified by: ___________________

Date: ___________________

---

## Notes

Use this space to document any deployment-specific notes, issues encountered, or deviations from the standard process:

```
[Add notes here]
```

---

**Deployment Status: [ ] Ready [ ] In Progress [ ] Complete**

**Production URL: ___________________**

**Deployment Date: ___________________**
