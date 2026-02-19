# MongoDB Migration - Phase 1 Complete ✅

## Đã hoàn thành

### 1. Dependencies đã cài đặt
```bash
✅ mongodb@7.1.0
✅ mongoose@^8.x
✅ bcryptjs
✅ jsonwebtoken
✅ next-auth
✅ @auth/mongodb-adapter
✅ cloudinary
✅ @types/bcryptjs
✅ @types/jsonwebtoken
```

### 2. MongoDB Connection
- ✅ `lib/mongodb.ts` - MongoDB client singleton và Mongoose connection
- ✅ Hỗ trợ cả MongoClient (cho NextAuth) và Mongoose (cho models)
- ✅ Development mode caching để tránh multiple connections

### 3. Mongoose Models
Tất cả 9 models đã được tạo với đầy đủ schema, indexes và TypeScript types:

- ✅ `lib/models/User.ts` - Users với email/password và OAuth
- ✅ `lib/models/Family.ts` - Families với invite codes
- ✅ `lib/models/FamilyMember.ts` - Family memberships
- ✅ `lib/models/Post.ts` - Posts với types
- ✅ `lib/models/Reaction.ts` - Reactions (heart, haha)
- ✅ `lib/models/Event.ts` - Events với dates
- ✅ `lib/models/EventTask.ts` - Tasks với status
- ✅ `lib/models/Photo.ts` - Photos với Cloudinary URLs
- ✅ `lib/models/Notification.ts` - Notifications
- ✅ `lib/models/index.ts` - Export tất cả models

### 4. Cloudinary Setup
- ✅ `lib/cloudinary.ts` - Cloudinary configuration
- ✅ `uploadImage()` helper function
- ✅ `deleteImage()` helper function

### 5. Auth Utilities
- ✅ `lib/auth.ts` - Authentication utilities
  - `hashPassword()` - Hash passwords với bcrypt
  - `verifyPassword()` - Verify passwords
  - `generateToken()` - Generate JWT tokens
  - `verifyToken()` - Verify JWT tokens
  - `getUserFromRequest()` - Get user from request
  - `isValidEmail()` - Email validation
  - `isValidPassword()` - Password strength validation

### 6. Environment Variables
- ✅ Updated `.env.local.example` với:
  - MongoDB URI
  - NextAuth configuration
  - Google OAuth (optional)
  - Cloudinary credentials
  - Gemini API key

## MongoDB Schema Design

### Collections Structure

```
tet-connect (database)
├── users
│   ├── _id: ObjectId
│   ├── email: string (unique, indexed)
│   ├── password: string (hashed, optional for OAuth)
│   ├── name: string
│   ├── avatar: string
│   ├── provider: 'credentials' | 'google'
│   └── timestamps
│
├── families
│   ├── _id: ObjectId
│   ├── name: string
│   ├── inviteCode: string (unique, indexed)
│   ├── createdBy: ObjectId → users
│   └── timestamps
│
├── familymembers
│   ├── _id: ObjectId
│   ├── familyId: ObjectId → families
│   ├── userId: ObjectId → users
│   ├── role: 'admin' | 'member'
│   ├── joinedAt: Date
│   └── unique index on (familyId, userId)
│
├── posts
│   ├── _id: ObjectId
│   ├── familyId: ObjectId → families
│   ├── userId: ObjectId → users
│   ├── content: string
│   ├── type: 'cau-doi' | 'loi-chuc' | 'thiep-tet'
│   └── timestamps
│
├── reactions
│   ├── _id: ObjectId
│   ├── postId: ObjectId → posts
│   ├── userId: ObjectId → users
│   ├── type: 'heart' | 'haha'
│   ├── createdAt: Date
│   └── unique index on (postId, userId)
│
├── events
│   ├── _id: ObjectId
│   ├── familyId: ObjectId → families
│   ├── title: string
│   ├── date: Date (indexed)
│   ├── location: string
│   ├── createdBy: ObjectId → users
│   └── timestamps
│
├── eventtasks
│   ├── _id: ObjectId
│   ├── eventId: ObjectId → events
│   ├── task: string
│   ├── assignedTo: ObjectId → users
│   ├── status: 'pending' | 'completed'
│   └── timestamps
│
├── photos
│   ├── _id: ObjectId
│   ├── familyId: ObjectId → families
│   ├── userId: ObjectId → users
│   ├── url: string (Cloudinary URL)
│   ├── publicId: string (Cloudinary public_id)
│   └── uploadedAt: Date (indexed)
│
└── notifications
    ├── _id: ObjectId
    ├── userId: ObjectId → users
    ├── type: 'event_reminder' | 'task_reminder'
    ├── title: string
    ├── content: string
    ├── link: string
    ├── read: boolean (indexed)
    └── createdAt: Date
```

### Indexes Created

**Performance indexes:**
- `users`: email (unique)
- `families`: inviteCode (unique), createdBy
- `familymembers`: (familyId, userId) unique compound, userId
- `posts`: (familyId, createdAt desc), userId
- `reactions`: (postId, userId) unique compound, postId
- `events`: (familyId, date), date
- `eventtasks`: eventId, (assignedTo, status)
- `photos`: (familyId, uploadedAt desc), userId
- `notifications`: (userId, read, createdAt desc)

## Next Steps - Phase 2

### Cần làm tiếp:
1. **Setup NextAuth.js**
   - Tạo `/app/api/auth/[...nextauth]/route.ts`
   - Configure Credentials provider
   - Configure Google OAuth provider
   - Setup MongoDB adapter

2. **Tạo Register API**
   - `/app/api/auth/register/route.ts`
   - Validate input
   - Hash password
   - Create user

3. **Tạo Register Page**
   - `/app/register/page.tsx`
   - Register form component
   - Form validation
   - Error handling

4. **Update Login Page**
   - Thêm email/password form
   - Giữ Google OAuth button
   - Integrate với NextAuth

5. **Update Middleware**
   - Thay Supabase session check
   - Dùng NextAuth session
   - Giữ protected routes logic

6. **Update AuthProvider**
   - Dùng NextAuth SessionProvider
   - Update auth hooks
   - Update user context

## Setup Instructions

### 1. Tạo MongoDB Atlas Account (Free)

1. Truy cập https://www.mongodb.com/cloud/atlas/register
2. Đăng ký account miễn phí
3. Tạo cluster mới (chọn Free tier M0)
4. Chọn region gần nhất (Singapore cho VN)
5. Tạo database user với username/password
6. Whitelist IP address (0.0.0.0/0 cho development)
7. Get connection string

### 2. Tạo Cloudinary Account (Free)

1. Truy cập https://cloudinary.com/users/register/free
2. Đăng ký account miễn phí (25GB storage)
3. Vào Dashboard
4. Copy Cloud Name, API Key, API Secret

### 3. Generate NextAuth Secret

```bash
# Trên Linux/Mac
openssl rand -base64 32

# Trên Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 4. Update .env.local

Copy từ `.env.local.example` và điền các giá trị:

```env
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/tet-connect?retryWrites=true&w=majority

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generated-secret-from-step-3>

# Optional - nếu muốn Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

GEMINI_API_KEY=your-gemini-api-key
```

### 5. Test MongoDB Connection

Tạo file test:

```typescript
// test-mongodb.ts
import { connectDB } from './lib/mongodb'

async function test() {
  try {
    await connectDB()
    console.log('✅ MongoDB connected successfully!')
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error)
  }
}

test()
```

Run: `npx tsx test-mongodb.ts`

## Files Created

```
lib/
├── mongodb.ts              ✅ MongoDB connection
├── cloudinary.ts           ✅ Cloudinary config
├── auth.ts                 ✅ Auth utilities
└── models/
    ├── index.ts           ✅ Export all models
    ├── User.ts            ✅ User model
    ├── Family.ts          ✅ Family model
    ├── FamilyMember.ts    ✅ FamilyMember model
    ├── Post.ts            ✅ Post model
    ├── Reaction.ts        ✅ Reaction model
    ├── Event.ts           ✅ Event model
    ├── EventTask.ts       ✅ EventTask model
    ├── Photo.ts           ✅ Photo model
    └── Notification.ts    ✅ Notification model

docs/
└── MONGODB_MIGRATION_PHASE1_COMPLETE.md  ✅ This file

.env.local.example         ✅ Updated with new vars
```

## Status

✅ **Phase 1 Complete!**

Ready to proceed to Phase 2: NextAuth setup and authentication implementation.

