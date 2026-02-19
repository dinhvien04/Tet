# Quick Start Guide - MongoDB Migration

## Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

## Step 1: Install Dependencies

All dependencies are already in `package.json`. Just run:

```bash
npm install
```

## Step 2: Setup MongoDB Atlas (Free Tier)

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create a free account
3. Create a new cluster (M0 Free tier)
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Replace `<password>` with your database user password
7. Replace `<dbname>` with `tet-connect` (or your preferred name)

Example connection string:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/tet-connect?retryWrites=true&w=majority
```

## Step 3: Setup Cloudinary (Free Tier)

1. Go to https://cloudinary.com/users/register/free
2. Create a free account
3. Go to Dashboard
4. Copy:
   - Cloud Name
   - API Key
   - API Secret

## Step 4: Setup Google OAuth (Optional but Recommended)

1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/callback/google` (for production)
7. Copy Client ID and Client Secret

## Step 5: Generate NextAuth Secret

Run this command:
```bash
openssl rand -base64 32
```

Or use this online generator: https://generate-secret.vercel.app/32

## Step 6: Configure Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
copy .env.local.example .env.local
```

Edit `.env.local` and fill in all values:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/tet-connect?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-generated-secret-from-step-5

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# OpenAI (Optional - for AI features)
OPENAI_API_KEY=your-openai-api-key
```

## Step 7: Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Step 8: Test the Application

### Register a New User
1. Go to http://localhost:3000/register
2. Fill in the form:
   - Name: Your Name
   - Email: your@email.com
   - Password: YourPassword123
3. Click "Đăng ký"

### Login
1. Go to http://localhost:3000/login
2. Enter your email and password
3. Or click "Đăng nhập bằng Google" (if configured)

### Create a Family
1. After login, go to http://localhost:3000/family/create
2. Enter family name
3. Click "Tạo nhà"
4. You'll get an invite code

### Join a Family
1. Share the invite link: `http://localhost:3000/join/[INVITE_CODE]`
2. Other users can click the link to join

### Create a Post
1. Go to http://localhost:3000/posts/create
2. Select your family
3. Write content
4. Click "Đăng bài"

### Create an Event
1. Go to http://localhost:3000/events/create
2. Fill in event details
3. Click "Tạo sự kiện"

### Upload Photos
1. Go to http://localhost:3000/photos
2. Click "Upload Photos"
3. Select images
4. Add captions
5. Click "Upload"

## Troubleshooting

### MongoDB Connection Error
- Check your connection string is correct
- Verify your IP is whitelisted in MongoDB Atlas
- Check database user has correct permissions

### Google OAuth Not Working
- Verify redirect URI is exactly: `http://localhost:3000/api/auth/callback/google`
- Check Client ID and Secret are correct
- Make sure Google+ API is enabled

### Cloudinary Upload Fails
- Verify Cloud Name, API Key, and API Secret are correct
- Check you haven't exceeded free tier limits (25GB/month)

### NextAuth Session Issues
- Make sure NEXTAUTH_SECRET is set
- Clear browser cookies and try again
- Check NEXTAUTH_URL matches your domain

## Production Deployment

### Environment Variables
Update these for production:
```env
NEXTAUTH_URL=https://yourdomain.com
MONGODB_URI=your-production-mongodb-uri
```

### MongoDB Atlas
- Whitelist your production server IP
- Use a strong database password
- Enable backup (recommended)

### Cloudinary
- Consider upgrading plan for production traffic
- Enable automatic image optimization
- Setup custom domain (optional)

### Security
- Use strong NEXTAUTH_SECRET (32+ characters)
- Enable HTTPS in production
- Set secure cookie options in NextAuth
- Implement rate limiting
- Add CORS configuration

## Next Steps

1. ✅ Test all features thoroughly
2. ✅ Customize UI/branding
3. ✅ Add more family members
4. ✅ Create events and posts
5. ✅ Upload photos
6. ⏳ Deploy to production (Vercel, Netlify, etc.)

## Support

- MongoDB Atlas Docs: https://docs.atlas.mongodb.com
- NextAuth Docs: https://next-auth.js.org
- Cloudinary Docs: https://cloudinary.com/documentation
- Next.js Docs: https://nextjs.org/docs

## Migration Complete! 🎉

Your Tết Connect app is now running on:
- ✅ MongoDB Atlas (Database)
- ✅ NextAuth (Authentication)
- ✅ Cloudinary (File Storage)
- ✅ Polling (Realtime Updates)

Enjoy your new stack!
