# Migration Plan: Supabase → MongoDB + Custom Auth

## Tổng quan

Chuyển đổi Tết Connect từ Supabase sang MongoDB với authentication tự xây dựng.

## Thay đổi chính

### 1. Database: Supabase PostgreSQL → MongoDB
- Thay thế Supabase client bằng MongoDB driver
- Chuyển đổi schema từ SQL sang MongoDB collections
- Xóa RLS policies (thay bằng middleware authorization)

### 2. Authentication: Google OAuth → Email/Password + Google OAuth
- Thêm đăng ký với email/password
- Thêm đăng nhập với email/password
- Giữ lại Google OAuth (optional)
- Sử dụng NextAuth.js hoặc tự implement với JWT

### 3. File Storage: Supabase Storage → Cloudinary/AWS S3
- Upload ảnh/video lên cloud storage
- Lưu URL trong MongoDB

### 4. Realtime: Supabase Realtime → Socket.io hoặc Polling
- Implement WebSocket với Socket.io
- Hoặc giữ polling mechanism đã có

## Kế hoạch triển khai

### Phase 1: Setup MongoDB & Auth Infrastructure

#### 1.1. Cài đặt dependencies
```bash
npm install mongodb mongoose
npm install bcryptjs jsonwebtoken
npm install next-auth @auth/mongodb-adapter
npm install cloudinary # hoặc aws-sdk
```

#### 1.2. Tạo MongoDB Schema
- Chuyển đổi từ SQL schema sang Mongoose models
- Tạo indexes cho performance

#### 1.3. Setup NextAuth.js
- Credentials provider (email/password)
- Google OAuth provider
- MongoDB adapter
- JWT strategy

### Phase 2: Migrate Database Layer

#### 2.1. Tạo MongoDB connection
- `lib/mongodb.ts` - Connection singleton
- `lib/models/` - Mongoose models

#### 2.2. Thay thế Supabase calls
- Tìm tất cả `supabase.from()` calls
- Thay bằng Mongoose queries
- Update API routes

#### 2.3. Migrate file upload
- Setup Cloudinary/S3
- Update upload API routes
- Migrate existing files (nếu có)

### Phase 3: Implement Authentication

#### 3.1. Tạo auth pages
- `/app/register/page.tsx` - Đăng ký
- `/app/login/page.tsx` - Đăng nhập (update)
- `/app/api/auth/[...nextauth]/route.ts` - NextAuth config

#### 3.2. Update middleware
- Thay Supabase session check bằng NextAuth session
- Giữ nguyên protected routes logic

#### 3.3. Update AuthProvider
- Sử dụng NextAuth SessionProvider
- Update auth hooks

### Phase 4: Testing & Migration

#### 4.1. Update tests
- Mock MongoDB thay vì Supabase
- Update integration tests

#### 4.2. Data migration script
- Export data từ Supabase (nếu có)
- Import vào MongoDB

#### 4.3. End-to-end testing
- Test tất cả flows
- Fix bugs

## Chi tiết Implementation

### MongoDB Schema Design

```typescript
// users collection
{
  _id: ObjectId,
  email: string,
  password: string, // hashed with bcrypt
  name: string,
  avatar: string,
  provider: 'credentials' | 'google',
  createdAt: Date,
  updatedAt: Date
}

// families collection
{
  _id: ObjectId,
  name: string,
  inviteCode: string, // unique index
  createdBy: ObjectId, // ref to users
  createdAt: Date
}

// family_members collection
{
  _id: ObjectId,
  familyId: ObjectId, // ref to families
  userId: ObjectId, // ref to users
  role: 'admin' | 'member',
  joinedAt: Date
}

// posts collection
{
  _id: ObjectId,
  familyId: ObjectId,
  userId: ObjectId,
  content: string,
  type: 'cau-doi' | 'loi-chuc' | 'thiep-tet',
  createdAt: Date
}

// reactions collection
{
  _id: ObjectId,
  postId: ObjectId,
  userId: ObjectId,
  type: 'heart' | 'haha',
  createdAt: Date
}

// events collection
{
  _id: ObjectId,
  familyId: ObjectId,
  title: string,
  date: Date,
  location: string,
  createdBy: ObjectId,
  createdAt: Date
}

// event_tasks collection
{
  _id: ObjectId,
  eventId: ObjectId,
  task: string,
  assignedTo: ObjectId,
  status: 'pending' | 'completed',
  createdAt: Date
}

// photos collection
{
  _id: ObjectId,
  familyId: ObjectId,
  userId: ObjectId,
  url: string, // Cloudinary/S3 URL
  publicId: string, // Cloudinary public_id
  uploadedAt: Date
}

// notifications collection
{
  _id: ObjectId,
  userId: ObjectId,
  type: 'event_reminder' | 'task_reminder',
  title: string,
  content: string,
  link: string,
  read: boolean,
  createdAt: Date
}
```

### NextAuth Configuration

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import clientPromise from '@/lib/mongodb'
import bcrypt from 'bcryptjs'

export const authOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Verify email & password
        const user = await User.findOne({ email: credentials.email })
        if (!user) return null
        
        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null
        
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.avatar
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

### Register API Route

```typescript
// app/api/auth/register/route.ts
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import User from '@/lib/models/User'

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()
    
    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    await connectDB()
    
    // Check if user exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      provider: 'credentials',
    })
    
    return NextResponse.json({
      id: user._id,
      email: user.email,
      name: user.name,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
```

## Files cần tạo mới

```
lib/
├── mongodb.ts              # MongoDB connection
├── models/                 # Mongoose models
│   ├── User.ts
│   ├── Family.ts
│   ├── FamilyMember.ts
│   ├── Post.ts
│   ├── Reaction.ts
│   ├── Event.ts
│   ├── EventTask.ts
│   ├── Photo.ts
│   └── Notification.ts
├── cloudinary.ts           # Cloudinary config (nếu dùng)
└── auth.ts                 # Auth utilities

app/
├── register/
│   └── page.tsx           # Register page
└── api/
    ├── auth/
    │   ├── [...nextauth]/
    │   │   └── route.ts   # NextAuth config
    │   └── register/
    │       └── route.ts   # Register API
    └── upload/
        └── route.ts       # Cloudinary upload

components/
└── auth/
    └── RegisterForm.tsx   # Register form component
```

## Files cần xóa/thay thế

```
lib/
├── supabase.ts            # DELETE - thay bằng mongodb.ts
└── cache/
    └── supabase-cache.ts  # UPDATE - thay logic

supabase/                  # DELETE entire folder
├── migrations/
├── README.md
└── *.sql

middleware.ts              # UPDATE - dùng NextAuth session
```

## Files cần update

### API Routes (tất cả files trong app/api/)
- `app/api/families/route.ts`
- `app/api/posts/route.ts`
- `app/api/events/route.ts`
- `app/api/photos/route.ts`
- `app/api/photos/upload/route.ts`
- ... và tất cả API routes khác

### Components
- `components/auth/AuthProvider.tsx`
- `components/auth/LoginButton.tsx`
- Tất cả components sử dụng `supabase` client

### Hooks
- `lib/hooks/usePosts.ts`
- `lib/hooks/useRealtimeWithFallback.ts`
- Các hooks khác sử dụng Supabase

## Environment Variables mới

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tet-connect

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Google OAuth (giữ nguyên)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudinary (hoặc AWS S3)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Gemini AI (giữ nguyên)
GEMINI_API_KEY=your-gemini-api-key
```

## Timeline ước tính

- **Phase 1**: 2-3 ngày (Setup infrastructure)
- **Phase 2**: 3-4 ngày (Migrate database layer)
- **Phase 3**: 2-3 ngày (Implement authentication)
- **Phase 4**: 2-3 ngày (Testing & fixes)

**Tổng**: 9-13 ngày

## Rủi ro & Giải pháp

### Rủi ro 1: Mất Realtime functionality
**Giải pháp**: Implement Socket.io hoặc giữ polling mechanism

### Rủi ro 2: Performance với MongoDB
**Giải pháp**: Tạo indexes đúng, sử dụng aggregation pipeline

### Rủi ro 3: File storage migration
**Giải pháp**: Migrate dần dần, giữ cả 2 systems trong transition period

## Next Steps

1. **Quyết định**: Bạn có muốn tôi bắt đầu implement không?
2. **MongoDB**: Bạn đã có MongoDB Atlas account chưa?
3. **File Storage**: Bạn muốn dùng Cloudinary hay AWS S3?
4. **Realtime**: Bạn có cần realtime updates không? (Socket.io vs Polling)

Cho tôi biết và tôi sẽ bắt đầu implement từng phase!
