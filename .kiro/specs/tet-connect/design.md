# Tài liệu Thiết kế - Tết Connect

## Tổng quan

Tết Connect là một web application được xây dựng trên Next.js với Supabase backend, cung cấp không gian riêng tư cho gia đình Việt Nam tổ chức và kết nối trong dịp Tết. Hệ thống tập trung vào 3 tính năng cốt lõi: tạo nội dung Tết bằng AI, quản lý lịch họp mặt, và chia sẻ album ảnh.

### Mục tiêu Thiết kế

- **Đơn giản và Nhanh**: Onboarding trong 30 giây, không yêu cầu đăng ký phức tạp
- **Realtime**: Cập nhật tức thời cho trải nghiệm tương tác mượt mà
- **Mobile-first**: Tối ưu cho điện thoại vì người dùng chủ yếu dùng mobile
- **Scalable**: Sử dụng Supabase để dễ dàng mở rộng
- **Cost-effective**: Tận dụng free tier của các dịch vụ (Vercel, Supabase, Gemini)

## Kiến trúc

### Kiến trúc Tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  Next.js 14 (App Router) + React + Tailwind + Shadcn/ui    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Next.js)                      │
│  - API Routes (/api/*)                                       │
│  - Server Actions                                            │
│  - Gemini AI Integration                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  - PostgreSQL Database                                       │
│  - Authentication (Google OAuth)                             │
│  - Storage (Images, Videos)                                  │
│  - Realtime (WebSocket subscriptions)                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  - Gemini API (AI content generation)                        │
│  - Vercel (Hosting & Deployment)                             │
└─────────────────────────────────────────────────────────────┘
```

### Luồng Dữ liệu

1. **Authentication Flow**: Client → Supabase Auth → Google OAuth → Supabase → Client
2. **Content Creation Flow**: Client → Next.js API → Gemini API → Next.js API → Supabase → Client
3. **Realtime Updates Flow**: Supabase Realtime → WebSocket → Client
4. **File Upload Flow**: Client → Supabase Storage → Supabase DB → Client


## Các Thành phần và Giao diện

### 1. Authentication Module

**Mục đích**: Xử lý đăng nhập/đăng xuất người dùng qua Google OAuth

**Components**:
- `LoginButton`: Nút đăng nhập Google
- `AuthProvider`: Context provider cho trạng thái authentication
- `ProtectedRoute`: HOC bảo vệ các route yêu cầu đăng nhập

**API Endpoints**:
- Sử dụng Supabase Auth SDK (không cần custom API)

**Supabase Integration**:
```typescript
// Cấu hình Google OAuth
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    providers: ['google'],
    redirectTo: `${window.location.origin}/auth/callback`
  }
})

// Đăng nhập
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
})

// Lấy session hiện tại
const { data: { session } } = await supabase.auth.getSession()
```

### 2. Family Management Module

**Mục đích**: Quản lý "Nhà" (family space) và thành viên

**Components**:
- `CreateFamilyForm`: Form tạo nhà mới
- `FamilyInviteCard`: Hiển thị link mời và nút copy
- `JoinFamilyPage`: Trang tham gia nhà qua link mời
- `FamilyMemberList`: Danh sách thành viên trong nhà

**API Endpoints**:
- `POST /api/families` - Tạo nhà mới
- `GET /api/families/:id` - Lấy thông tin nhà
- `POST /api/families/:id/join` - Tham gia nhà qua invite code

**Database Operations**:
```typescript
// Tạo nhà mới
const createFamily = async (name: string, userId: string) => {
  const inviteCode = generateInviteCode() // Random 8 ký tự
  
  const { data: family } = await supabase
    .from('families')
    .insert({ name, invite_code: inviteCode, created_by: userId })
    .select()
    .single()
  
  // Thêm người tạo làm admin
  await supabase
    .from('family_members')
    .insert({ family_id: family.id, user_id: userId, role: 'admin' })
  
  return family
}

// Tham gia nhà
const joinFamily = async (inviteCode: string, userId: string) => {
  const { data: family } = await supabase
    .from('families')
    .select('id')
    .eq('invite_code', inviteCode)
    .single()
  
  await supabase
    .from('family_members')
    .insert({ family_id: family.id, user_id: userId, role: 'member' })
}
```

### 3. AI Content Generation Module

**Mục đích**: Tạo câu đối, lời chúc Tết bằng Gemini AI

**Components**:
- `AIContentForm`: Form nhập thông tin để tạo nội dung
- `AIContentPreview`: Xem trước nội dung AI tạo ra
- `ContentTypeSelector`: Chọn loại nội dung (câu đối, lời chúc, thiệp)

**API Endpoints**:
- `POST /api/ai/generate` - Tạo nội dung AI

**Gemini Integration**:
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

const generateContent = async (type: string, recipientName: string, traits: string) => {
  const prompts = {
    'cau-doi': `Hãy tạo một câu đối Tết Nguyên Đán cho ${recipientName}. 
                Đặc điểm: ${traits}. 
                Câu đối phải có 2 câu đối xứng, ý nghĩa tốt đẹp, phù hợp văn hóa Việt Nam.`,
    'loi-chuc': `Hãy viết lời chúc Tết Nguyên Đán chân thành cho ${recipientName}. 
                 Đặc điểm: ${traits}. 
                 Lời chúc nên ấm áp, cá nhân hóa, độ dài 3-4 câu.`,
    'thiep-tet': `Hãy tạo nội dung thiệp Tết cho ${recipientName}. 
                  Đặc điểm: ${traits}. 
                  Bao gồm lời mở đầu, lời chúc chính, và lời kết.`
  }
  
  const result = await model.generateContent(prompts[type])
  return result.response.text()
}
```

### 4. Posts & Reactions Module

**Mục đích**: Đăng nội dung lên tường nhà và tương tác

**Components**:
- `PostCard`: Hiển thị một bài đăng
- `PostFeed`: Danh sách bài đăng theo timeline
- `ReactionButtons`: Các nút reaction (tim, haha)
- `ReactionCount`: Hiển thị số lượng reactions

**API Endpoints**:
- `POST /api/posts` - Tạo bài đăng mới
- `GET /api/posts?familyId=:id` - Lấy danh sách bài đăng
- `POST /api/posts/:id/reactions` - Thêm/xóa reaction

**Database Operations với Realtime**:
```typescript
// Tạo bài đăng
const createPost = async (familyId: string, userId: string, content: string, type: string) => {
  const { data } = await supabase
    .from('posts')
    .insert({ family_id: familyId, user_id: userId, content, type })
    .select('*, users(*)')
    .single()
  
  return data
}

// Subscribe realtime updates
const subscribeToFamilyPosts = (familyId: string, onNewPost: Function) => {
  const channel = supabase
    .channel(`family:${familyId}`)
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'posts', filter: `family_id=eq.${familyId}` },
      (payload) => onNewPost(payload.new)
    )
    .subscribe()
  
  return () => supabase.removeChannel(channel)
}

// Toggle reaction
const toggleReaction = async (postId: string, userId: string, type: 'heart' | 'haha') => {
  const { data: existing } = await supabase
    .from('reactions')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single()
  
  if (existing) {
    if (existing.type === type) {
      // Xóa reaction
      await supabase.from('reactions').delete().eq('id', existing.id)
    } else {
      // Đổi loại reaction
      await supabase.from('reactions').update({ type }).eq('id', existing.id)
    }
  } else {
    // Thêm reaction mới
    await supabase.from('reactions').insert({ post_id: postId, user_id: userId, type })
  }
}
```

### 5. Events & Tasks Module

**Mục đích**: Quản lý sự kiện Tết và phân công công việc

**Components**:
- `EventCalendar`: Lịch hiển thị các sự kiện
- `EventCard`: Thẻ hiển thị thông tin sự kiện
- `CreateEventForm`: Form tạo sự kiện mới
- `TaskList`: Danh sách công việc trong sự kiện
- `TaskItem`: Một công việc với checkbox hoàn thành
- `AssignTaskForm`: Form phân công công việc

**API Endpoints**:
- `POST /api/events` - Tạo sự kiện
- `GET /api/events?familyId=:id` - Lấy danh sách sự kiện
- `POST /api/events/:id/tasks` - Thêm công việc
- `PATCH /api/tasks/:id` - Cập nhật trạng thái công việc

**Database Operations**:
```typescript
// Tạo sự kiện
const createEvent = async (familyId: string, title: string, date: string, location: string, userId: string) => {
  const { data } = await supabase
    .from('events')
    .insert({ family_id: familyId, title, date, location, created_by: userId })
    .select()
    .single()
  
  return data
}

// Thêm công việc
const addTask = async (eventId: string, task: string, assignedTo: string) => {
  const { data } = await supabase
    .from('event_tasks')
    .insert({ event_id: eventId, task, assigned_to: assignedTo, status: 'pending' })
    .select('*, users(*)')
    .single()
  
  return data
}

// Cập nhật trạng thái công việc
const updateTaskStatus = async (taskId: string, status: 'pending' | 'completed') => {
  await supabase
    .from('event_tasks')
    .update({ status })
    .eq('id', taskId)
}
```

### 6. Notifications Module

**Mục đích**: Gửi thông báo nhắc nhở sự kiện

**Components**:
- `NotificationBell`: Icon chuông với badge số lượng thông báo
- `NotificationDropdown`: Dropdown hiển thị danh sách thông báo
- `NotificationItem`: Một thông báo

**Background Job** (Vercel Cron hoặc Supabase Edge Function):
```typescript
// Chạy mỗi giờ để kiểm tra sự kiện sắp diễn ra
const checkUpcomingEvents = async () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const { data: events } = await supabase
    .from('events')
    .select('*, family_members(*)')
    .gte('date', new Date().toISOString())
    .lte('date', tomorrow.toISOString())
  
  for (const event of events) {
    // Tạo thông báo cho tất cả thành viên
    for (const member of event.family_members) {
      await supabase.from('notifications').insert({
        user_id: member.user_id,
        type: 'event_reminder',
        title: `Sự kiện "${event.title}" sắp diễn ra`,
        content: `Sự kiện sẽ diễn ra vào ${formatDate(event.date)} tại ${event.location}`,
        link: `/events/${event.id}`
      })
    }
    
    // Thông báo riêng cho người có công việc chưa hoàn thành
    const { data: pendingTasks } = await supabase
      .from('event_tasks')
      .select('*, users(*)')
      .eq('event_id', event.id)
      .eq('status', 'pending')
    
    for (const task of pendingTasks) {
      await supabase.from('notifications').insert({
        user_id: task.assigned_to,
        type: 'task_reminder',
        title: `Bạn có công việc chưa hoàn thành`,
        content: `"${task.task}" trong sự kiện "${event.title}"`,
        link: `/events/${event.id}`
      })
    }
  }
}
```

### 7. Photo Album Module

**Mục đích**: Upload, lưu trữ và hiển thị ảnh gia đình

**Components**:
- `PhotoUploader`: Component upload ảnh (drag & drop, file picker, camera)
- `PhotoGrid`: Lưới ảnh responsive
- `PhotoTimeline`: Hiển thị ảnh theo timeline nhóm theo ngày
- `PhotoViewer`: Lightbox xem ảnh full size
- `PhotoCard`: Thẻ hiển thị một ảnh với metadata

**API Endpoints**:
- `POST /api/photos/upload` - Upload ảnh
- `GET /api/photos?familyId=:id` - Lấy danh sách ảnh

**Supabase Storage Integration**:
```typescript
// Upload ảnh
const uploadPhoto = async (file: File, familyId: string, userId: string) => {
  // Validate file
  const validTypes = ['image/jpeg', 'image/png', 'image/heic']
  if (!validTypes.includes(file.type)) {
    throw new Error('Định dạng file không hợp lệ')
  }
  
  if (file.size > 10 * 1024 * 1024) { // 10MB
    throw new Error('File quá lớn (tối đa 10MB)')
  }
  
  // Upload to Supabase Storage
  const fileName = `${familyId}/${Date.now()}-${file.name}`
  const { data: uploadData, error } = await supabase.storage
    .from('photos')
    .upload(fileName, file)
  
  if (error) throw error
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('photos')
    .getPublicUrl(fileName)
  
  // Save to database
  const { data: photo } = await supabase
    .from('photos')
    .insert({ family_id: familyId, user_id: userId, url: publicUrl })
    .select('*, users(*)')
    .single()
  
  return photo
}

// Lấy ảnh theo timeline
const getPhotosByTimeline = async (familyId: string) => {
  const { data: photos } = await supabase
    .from('photos')
    .select('*, users(*)')
    .eq('family_id', familyId)
    .order('uploaded_at', { ascending: false })
  
  // Nhóm theo ngày
  const grouped = photos.reduce((acc, photo) => {
    const date = new Date(photo.uploaded_at).toLocaleDateString('vi-VN')
    if (!acc[date]) acc[date] = []
    acc[date].push(photo)
    return acc
  }, {})
  
  return grouped
}
```

### 8. Video Recap Module

**Mục đích**: Tạo video tổng hợp ảnh với nhạc nền

**Components**:
- `VideoRecapButton`: Nút tạo video recap
- `PhotoSelector`: Chọn ảnh để đưa vào video
- `VideoPreview`: Xem trước video đã tạo
- `VideoProcessingStatus`: Hiển thị tiến trình xử lý video

**API Endpoints**:
- `POST /api/videos/create` - Tạo video recap

**Video Processing** (Server-side với ffmpeg hoặc Canvas API):

Có 2 phương án:

**Phương án 1: Client-side với Canvas API** (Đơn giản hơn, không cần server processing)
```typescript
// Tạo video trên client bằng Canvas + MediaRecorder
const createVideoRecap = async (photos: string[], duration: number = 3000) => {
  const canvas = document.createElement('canvas')
  canvas.width = 1920
  canvas.height = 1080
  const ctx = canvas.getContext('2d')!
  
  const stream = canvas.captureStream(30) // 30 FPS
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 5000000
  })
  
  const chunks: Blob[] = []
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
  
  mediaRecorder.start()
  
  // Render từng ảnh
  for (const photoUrl of photos) {
    const img = await loadImage(photoUrl)
    
    // Vẽ ảnh với hiệu ứng fade
    await animatePhoto(ctx, img, duration)
  }
  
  mediaRecorder.stop()
  
  return new Promise<Blob>((resolve) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      resolve(blob)
    }
  })
}

const animatePhoto = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, duration: number) => {
  return new Promise<void>((resolve) => {
    const startTime = Date.now()
    const fps = 30
    const totalFrames = (duration / 1000) * fps
    let frame = 0
    
    const animate = () => {
      if (frame >= totalFrames) {
        resolve()
        return
      }
      
      // Fade in/out effect
      const progress = frame / totalFrames
      const opacity = progress < 0.1 ? progress * 10 : progress > 0.9 ? (1 - progress) * 10 : 1
      
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      ctx.globalAlpha = opacity
      ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height)
      
      frame++
      setTimeout(animate, 1000 / fps)
    }
    
    animate()
  })
}
```

**Phương án 2: Server-side với ffmpeg** (Chất lượng tốt hơn nhưng phức tạp hơn)
```typescript
// API route xử lý video
import ffmpeg from 'fluent-ffmpeg'

const createVideoWithFFmpeg = async (photoUrls: string[]) => {
  // Download ảnh về server
  const localPhotos = await Promise.all(
    photoUrls.map(async (url, i) => {
      const response = await fetch(url)
      const buffer = await response.arrayBuffer()
      const path = `/tmp/photo-${i}.jpg`
      await fs.writeFile(path, Buffer.from(buffer))
      return path
    })
  )
  
  // Tạo video bằng ffmpeg
  const outputPath = `/tmp/recap-${Date.now()}.mp4`
  
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input('concat:' + localPhotos.join('|'))
      .inputOptions(['-framerate 1/3']) // Mỗi ảnh 3 giây
      .outputOptions([
        '-c:v libx264',
        '-pix_fmt yuv420p',
        '-vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2'
      ])
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run()
  })
  
  // Upload video lên Supabase Storage
  const videoBuffer = await fs.readFile(outputPath)
  const { data } = await supabase.storage
    .from('videos')
    .upload(`recap-${Date.now()}.mp4`, videoBuffer)
  
  return data.path
}
```

**Khuyến nghị**: Dùng phương án 1 (Canvas API) cho MVP vì đơn giản hơn và không cần xử lý server-side phức tạp.


## Mô hình Dữ liệu

### Database Schema (Supabase PostgreSQL)

#### Table: users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Mô tả**: Lưu thông tin người dùng từ Google OAuth

**Indexes**:
- Primary key trên `id`
- Unique index trên `email`

#### Table: families
```sql
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Mô tả**: Lưu thông tin "Nhà" (family space)

**Indexes**:
- Primary key trên `id`
- Unique index trên `invite_code`
- Index trên `created_by`

#### Table: family_members
```sql
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);
```

**Mô tả**: Quan hệ nhiều-nhiều giữa users và families

**Indexes**:
- Primary key trên `id`
- Unique composite index trên `(family_id, user_id)`
- Index trên `user_id`

#### Table: posts
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cau-doi', 'loi-chuc', 'thiep-tet')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Mô tả**: Lưu bài đăng trên tường nhà

**Indexes**:
- Primary key trên `id`
- Index trên `family_id` (để query nhanh)
- Index trên `created_at` (để sắp xếp timeline)

#### Table: reactions
```sql
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('heart', 'haha')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
```

**Mô tả**: Lưu reactions của người dùng trên bài đăng

**Indexes**:
- Primary key trên `id`
- Unique composite index trên `(post_id, user_id)`
- Index trên `post_id`

#### Table: events
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Mô tả**: Lưu sự kiện Tết của gia đình

**Indexes**:
- Primary key trên `id`
- Index trên `family_id`
- Index trên `date` (để query sự kiện sắp tới)

#### Table: event_tasks
```sql
CREATE TABLE event_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Mô tả**: Lưu công việc được phân công trong sự kiện

**Indexes**:
- Primary key trên `id`
- Index trên `event_id`
- Index trên `assigned_to`

#### Table: photos
```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Mô tả**: Lưu metadata của ảnh (file thực tế lưu trong Supabase Storage)

**Indexes**:
- Primary key trên `id`
- Index trên `family_id`
- Index trên `uploaded_at` (để sắp xếp timeline)

#### Table: notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('event_reminder', 'task_reminder')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Mô tả**: Lưu thông báo cho người dùng

**Indexes**:
- Primary key trên `id`
- Index trên `user_id`
- Index trên `read` (để query thông báo chưa đọc)

### Row Level Security (RLS) Policies

Supabase RLS đảm bảo người dùng chỉ truy cập được dữ liệu của gia đình mình:

```sql
-- Users: Chỉ đọc được thông tin của chính mình
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Families: Chỉ đọc được nhà mà mình là thành viên
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read family" ON families
  FOR SELECT USING (
    id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- Posts: Chỉ đọc/tạo bài đăng trong nhà của mình
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read family posts" ON posts
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can create posts" ON posts
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- Tương tự cho các bảng khác...
```

### Supabase Storage Buckets

#### Bucket: photos
- **Public**: true (để dễ dàng hiển thị ảnh)
- **File size limit**: 10MB
- **Allowed MIME types**: image/jpeg, image/png, image/heic

#### Bucket: videos
- **Public**: true
- **File size limit**: 100MB
- **Allowed MIME types**: video/mp4, video/webm


## Thuộc tính Đúng đắn (Correctness Properties)

### Giới thiệu về Properties

Một property (thuộc tính) là một đặc điểm hoặc hành vi phải đúng trong tất cả các lần thực thi hợp lệ của hệ thống - về cơ bản, đó là một phát biểu chính thức về những gì hệ thống nên làm. Properties đóng vai trò là cầu nối giữa đặc tả có thể đọc được bởi con người và các đảm bảo tính đúng đắn có thể kiểm chứng bằng máy.

### Property Reflection

Sau khi phân tích prework, tôi đã xác định các property có thể hợp nhất:

- **5.2 và 5.5** có thể hợp nhất: Cả hai đều kiểm tra cấu trúc dữ liệu bài đăng phải có đầy đủ các field
- **6.2, 6.3, 6.4** có thể hợp nhất: Tất cả đều về logic toggle/switch reaction, có thể test trong một property duy nhất
- **10.4 và 10.5** có thể hợp nhất: Upload thành công phải bao gồm cả lưu file và lưu metadata
- **12.3, 12.5, 12.6** có thể hợp nhất: Tất cả đều về quy trình tạo video hoàn chỉnh

### Properties

#### Property 1: User Authentication Persistence
*For any* lần đăng nhập Google OAuth thành công, thông tin người dùng (email, name, avatar) phải được tạo mới hoặc cập nhật trong cơ sở dữ liệu.

**Validates: Requirements 1.3, 1.4**

#### Property 2: Unique Family Invite Code
*For any* nhà được tạo, mã mời (invite_code) phải là duy nhất trong toàn bộ hệ thống.

**Validates: Requirements 2.3**

#### Property 3: Family Creator is Admin
*For any* nhà mới được tạo, người tạo nhà phải tự động được gán vai trò admin trong bảng family_members.

**Validates: Requirements 2.4**

#### Property 4: Join Family with Member Role
*For any* người dùng tham gia nhà qua invite code, người dùng đó phải được thêm vào nhà với vai trò "member".

**Validates: Requirements 3.5**

#### Property 5: AI Content Generation with Correct Prompt
*For any* yêu cầu tạo nội dung AI, hệ thống phải gửi đến Gemini API một prompt có chứa loại nội dung (câu đối/lời chúc/thiệp), tên người nhận, và đặc điểm được cung cấp.

**Validates: Requirements 4.3**

#### Property 6: Post Data Completeness
*For any* bài đăng được tạo, bài đăng phải chứa đầy đủ các field: content, type, family_id, user_id, và created_at.

**Validates: Requirements 5.1, 5.2, 5.5**

#### Property 7: Post Timeline Ordering
*For any* danh sách bài đăng của một nhà, các bài đăng phải được sắp xếp theo thứ tự thời gian giảm dần (mới nhất trước).

**Validates: Requirements 5.3**

#### Property 8: Post Family Filtering
*For any* người dùng xem tường nhà, chỉ các bài đăng thuộc nhà đó mới được hiển thị (không có bài đăng từ nhà khác).

**Validates: Requirements 5.4**

#### Property 9: Reaction Toggle Behavior
*For any* người dùng và bài đăng:
- Nếu người dùng chưa react, nhấn reaction sẽ tạo reaction mới
- Nếu người dùng đã react cùng loại, nhấn lại sẽ xóa reaction đó
- Nếu người dùng đã react loại khác, nhấn loại mới sẽ thay đổi sang loại đó
- Mỗi người dùng chỉ có tối đa 1 reaction trên mỗi bài đăng

**Validates: Requirements 6.2, 6.3, 6.4**

#### Property 10: Reaction Count Accuracy
*For any* bài đăng, số lượng hiển thị của mỗi loại reaction phải bằng số lượng thực tế trong cơ sở dữ liệu.

**Validates: Requirements 6.5**

#### Property 11: Event Persistence
*For any* sự kiện được tạo, sự kiện phải được lưu vào cơ sở dữ liệu với đầy đủ thông tin: title, date, location, family_id, created_by.

**Validates: Requirements 7.4**

#### Property 12: Event Timeline Ordering
*For any* danh sách sự kiện của một nhà, các sự kiện phải được sắp xếp theo thứ tự thời gian (date field).

**Validates: Requirements 7.5**

#### Property 13: Task Creation and Linking
*For any* công việc được tạo, công việc phải được lưu vào cơ sở dữ liệu và liên kết đúng với event_id tương ứng.

**Validates: Requirements 8.4**

#### Property 14: Task Initial Status
*For any* công việc mới được tạo, trạng thái ban đầu phải là "pending".

**Validates: Requirements 8.5**

#### Property 15: Task Status Toggle
*For any* công việc, khi người dùng đánh dấu hoàn thành, trạng thái phải chuyển từ "pending" sang "completed" hoặc ngược lại.

**Validates: Requirements 8.7**

#### Property 16: Event Reminder for All Members
*For any* sự kiện sắp diễn ra trong 24 giờ, tất cả thành viên trong nhà phải nhận được thông báo nhắc nhở.

**Validates: Requirements 9.1**

#### Property 17: Task Reminder for Assignee
*For any* sự kiện sắp diễn ra trong 24 giờ, người dùng có công việc chưa hoàn thành (status = "pending") phải nhận được thông báo riêng về công việc đó.

**Validates: Requirements 9.2**

#### Property 18: Notification Persistence
*For any* thông báo được tạo, thông báo phải được lưu vào cơ sở dữ liệu với đầy đủ thông tin: user_id, type, title, content, link.

**Validates: Requirements 9.3**

#### Property 19: Unread Notification Count
*For any* người dùng, số lượng thông báo chưa đọc hiển thị phải bằng số lượng thông báo có read = false trong cơ sở dữ liệu.

**Validates: Requirements 9.4**

#### Property 20: Notification Mark as Read
*For any* thông báo, khi người dùng nhấn vào thông báo, trường read phải được cập nhật thành true.

**Validates: Requirements 9.5**

#### Property 21: Photo File Validation
*For any* file được upload, nếu file không thuộc định dạng hợp lệ (jpg, png, heic) hoặc kích thước > 10MB, hệ thống phải reject và hiển thị thông báo lỗi.

**Validates: Requirements 10.3, 10.7**

#### Property 22: Photo Upload and Persistence
*For any* file ảnh hợp lệ được upload, file phải được lưu vào Supabase Storage và URL phải được lưu vào cơ sở dữ liệu cùng với metadata (family_id, user_id, uploaded_at).

**Validates: Requirements 10.4, 10.5**

#### Property 23: Photo Timeline Ordering
*For any* danh sách ảnh trong album, các ảnh phải được sắp xếp theo thứ tự thời gian upload giảm dần (mới nhất trước).

**Validates: Requirements 10.6, 11.1**

#### Property 24: Photo Grouping by Date
*For any* danh sách ảnh trong album, các ảnh được upload cùng ngày phải được nhóm lại với nhau.

**Validates: Requirements 11.2**

#### Property 25: Video Creation Pipeline
*For any* yêu cầu tạo video recap với danh sách ảnh hợp lệ:
- Hệ thống phải bắt đầu xử lý tạo video
- Video phải có nhạc nền Tết mặc định
- Video hoàn thành phải được lưu vào Supabase Storage
- Nếu xử lý thất bại, phải hiển thị thông báo lỗi

**Validates: Requirements 12.3, 12.5, 12.6, 12.8**

#### Property 26: Realtime Post Updates
*For any* người dùng đang xem tường nhà, khi có bài đăng mới được tạo trong nhà đó, bài đăng phải xuất hiện tự động mà không cần refresh trang.

**Validates: Requirements 13.2**

#### Property 27: Realtime Reaction Updates
*For any* người dùng đang xem bài đăng, khi có reaction mới được thêm hoặc xóa, số lượng reaction phải cập nhật tự động mà không cần refresh trang.

**Validates: Requirements 13.3**


## Xử lý Lỗi

### Chiến lược Xử lý Lỗi Tổng thể

Hệ thống sử dụng chiến lược xử lý lỗi nhiều tầng:

1. **Client-side Validation**: Kiểm tra input trước khi gửi request
2. **API Error Handling**: Xử lý lỗi từ external services (Gemini, Supabase)
3. **User Feedback**: Hiển thị thông báo lỗi rõ ràng cho người dùng
4. **Graceful Degradation**: Hệ thống vẫn hoạt động khi một số tính năng gặp lỗi

### Các Loại Lỗi và Cách Xử lý

#### 1. Authentication Errors

**Lỗi**: Google OAuth thất bại, session hết hạn

**Xử lý**:
```typescript
try {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
  if (error) throw error
} catch (error) {
  // Hiển thị toast error
  toast.error('Đăng nhập thất bại. Vui lòng thử lại.')
  // Log error để debug
  console.error('Auth error:', error)
}

// Middleware kiểm tra session
const checkAuth = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (!session) {
    // Redirect về trang login
    router.push('/login')
  }
}
```

#### 2. Database Errors

**Lỗi**: Constraint violation, connection timeout, RLS policy violation

**Xử lý**:
```typescript
try {
  const { data, error } = await supabase
    .from('posts')
    .insert({ family_id, user_id, content, type })
  
  if (error) {
    // Phân loại lỗi
    if (error.code === '23505') {
      // Unique constraint violation
      throw new Error('Dữ liệu đã tồn tại')
    } else if (error.code === '42501') {
      // RLS policy violation
      throw new Error('Bạn không có quyền thực hiện thao tác này')
    } else {
      throw new Error('Có lỗi xảy ra. Vui lòng thử lại.')
    }
  }
  
  return data
} catch (error) {
  toast.error(error.message)
  // Retry logic cho network errors
  if (isNetworkError(error)) {
    return retryWithBackoff(() => createPost(...))
  }
}
```

#### 3. AI Generation Errors

**Lỗi**: Gemini API rate limit, timeout, invalid response

**Xử lý**:
```typescript
const generateAIContent = async (type: string, recipientName: string, traits: string) => {
  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ type, recipientName, traits }),
      signal: AbortSignal.timeout(30000) // 30s timeout
    })
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau.')
      } else if (response.status === 500) {
        throw new Error('Dịch vụ AI tạm thời gặp sự cố. Vui lòng thử lại.')
      }
    }
    
    const data = await response.json()
    return data.content
    
  } catch (error) {
    if (error.name === 'AbortError') {
      toast.error('Yêu cầu quá lâu. Vui lòng thử lại.')
    } else {
      toast.error(error.message || 'Không thể tạo nội dung. Vui lòng thử lại.')
    }
    throw error
  }
}
```

#### 4. File Upload Errors

**Lỗi**: File quá lớn, định dạng không hợp lệ, storage quota exceeded

**Xử lý**:
```typescript
const uploadPhoto = async (file: File, familyId: string) => {
  // Validation
  const validTypes = ['image/jpeg', 'image/png', 'image/heic']
  if (!validTypes.includes(file.type)) {
    toast.error('Định dạng file không hợp lệ. Chỉ chấp nhận JPG, PNG, HEIC.')
    return
  }
  
  if (file.size > 10 * 1024 * 1024) {
    toast.error('File quá lớn. Kích thước tối đa 10MB.')
    return
  }
  
  try {
    // Upload với progress tracking
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(`${familyId}/${Date.now()}-${file.name}`, file, {
        onUploadProgress: (progress) => {
          setUploadProgress((progress.loaded / progress.total) * 100)
        }
      })
    
    if (error) {
      if (error.message.includes('quota')) {
        throw new Error('Dung lượng lưu trữ đã đầy. Vui lòng xóa ảnh cũ.')
      }
      throw error
    }
    
    return data
    
  } catch (error) {
    toast.error(error.message || 'Upload ảnh thất bại. Vui lòng thử lại.')
    throw error
  }
}
```

#### 5. Realtime Connection Errors

**Lỗi**: WebSocket connection failed, subscription timeout

**Xử lý**:
```typescript
const subscribeToFamilyPosts = (familyId: string) => {
  const channel = supabase
    .channel(`family:${familyId}`)
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'posts', filter: `family_id=eq.${familyId}` },
      (payload) => {
        // Handle new post
        addPostToFeed(payload.new)
      }
    )
    .subscribe((status, error) => {
      if (status === 'SUBSCRIBED') {
        console.log('Realtime connected')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Realtime error:', error)
        // Fallback: Poll for updates
        startPolling(familyId)
      }
    })
  
  return () => supabase.removeChannel(channel)
}

// Fallback polling khi realtime fail
const startPolling = (familyId: string) => {
  const interval = setInterval(async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    updateFeed(data)
  }, 5000) // Poll mỗi 5 giây
  
  return () => clearInterval(interval)
}
```

#### 6. Video Processing Errors

**Lỗi**: Canvas rendering failed, insufficient memory, encoding error

**Xử lý**:
```typescript
const createVideoRecap = async (photos: string[]) => {
  try {
    // Kiểm tra browser support
    if (!('MediaRecorder' in window)) {
      throw new Error('Trình duyệt không hỗ trợ tạo video. Vui lòng dùng Chrome hoặc Edge.')
    }
    
    // Giới hạn số ảnh để tránh memory issues
    if (photos.length > 50) {
      toast.warning('Tối đa 50 ảnh. Chỉ 50 ảnh đầu tiên sẽ được sử dụng.')
      photos = photos.slice(0, 50)
    }
    
    setProcessingStatus('Đang xử lý...')
    
    const videoBlob = await processVideo(photos)
    
    // Upload video
    const { data, error } = await supabase.storage
      .from('videos')
      .upload(`recap-${Date.now()}.mp4`, videoBlob)
    
    if (error) throw error
    
    setProcessingStatus('Hoàn thành!')
    return data
    
  } catch (error) {
    setProcessingStatus('Thất bại')
    toast.error(error.message || 'Không thể tạo video. Vui lòng thử lại với ít ảnh hơn.')
    throw error
  }
}
```

### Error Boundaries (React)

```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error, errorInfo) {
    // Log to error tracking service (e.g., Sentry)
    console.error('Error boundary caught:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Có lỗi xảy ra</h2>
          <p>Vui lòng refresh trang hoặc liên hệ hỗ trợ nếu lỗi vẫn tiếp diễn.</p>
          <button onClick={() => window.location.reload()}>
            Refresh trang
          </button>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

### Retry Logic với Exponential Backoff

```typescript
const retryWithBackoff = async (
  fn: () => Promise<any>,
  maxRetries = 3,
  baseDelay = 1000
) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      
      const delay = baseDelay * Math.pow(2, i)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
```


## Chiến lược Testing

### Tổng quan

Tết Connect sử dụng phương pháp testing kép (dual testing approach) để đảm bảo chất lượng code:

1. **Unit Tests**: Kiểm tra các trường hợp cụ thể, edge cases, và error conditions
2. **Property-Based Tests**: Kiểm tra các thuộc tính tổng quát trên nhiều input ngẫu nhiên

Cả hai loại test đều cần thiết và bổ sung cho nhau:
- Unit tests giúp phát hiện các bug cụ thể và đảm bảo các trường hợp đặc biệt được xử lý đúng
- Property tests giúp kiểm tra tính đúng đắn tổng quát và phát hiện các bug không ngờ tới

### Testing Stack

- **Framework**: Vitest (fast, compatible với Next.js)
- **Property-Based Testing**: fast-check (thư viện PBT cho JavaScript/TypeScript)
- **React Testing**: @testing-library/react
- **API Mocking**: MSW (Mock Service Worker)
- **Database Mocking**: Supabase test client với in-memory database

### Cấu hình Property-Based Testing

Mỗi property test phải:
- Chạy tối thiểu 100 iterations (do tính ngẫu nhiên)
- Có comment tag tham chiếu đến property trong design document
- Format tag: `// Feature: tet-connect, Property {number}: {property_text}`

```typescript
import fc from 'fast-check'
import { describe, it, expect } from 'vitest'

// Ví dụ property test
describe('Post Timeline Ordering', () => {
  it('should order posts by created_at descending', () => {
    // Feature: tet-connect, Property 7: Post Timeline Ordering
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.uuid(),
          content: fc.string(),
          created_at: fc.date()
        }), { minLength: 1, maxLength: 50 }),
        (posts) => {
          const sorted = sortPostsByTimeline(posts)
          
          // Kiểm tra ordering
          for (let i = 0; i < sorted.length - 1; i++) {
            expect(sorted[i].created_at.getTime())
              .toBeGreaterThanOrEqual(sorted[i + 1].created_at.getTime())
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Test Coverage theo Module

#### 1. Authentication Module

**Unit Tests**:
- Login button renders correctly
- OAuth redirect works
- Session persistence after refresh
- Logout clears session

**Property Tests**:
```typescript
// Property 1: User Authentication Persistence
fc.assert(
  fc.property(
    fc.record({
      email: fc.emailAddress(),
      name: fc.string({ minLength: 1 }),
      avatar: fc.webUrl()
    }),
    async (userData) => {
      // Feature: tet-connect, Property 1: User Authentication Persistence
      const result = await handleOAuthSuccess(userData)
      
      const userInDb = await supabase
        .from('users')
        .select('*')
        .eq('email', userData.email)
        .single()
      
      expect(userInDb.data).toBeDefined()
      expect(userInDb.data.email).toBe(userData.email)
      expect(userInDb.data.name).toBe(userData.name)
    }
  ),
  { numRuns: 100 }
)
```

#### 2. Family Management Module

**Unit Tests**:
- Create family form validation
- Invite code copy to clipboard
- Join family with invalid code shows error

**Property Tests**:
```typescript
// Property 2: Unique Family Invite Code
fc.assert(
  fc.property(
    fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 100 }),
    async (familyNames) => {
      // Feature: tet-connect, Property 2: Unique Family Invite Code
      const families = await Promise.all(
        familyNames.map(name => createFamily(name, userId))
      )
      
      const inviteCodes = families.map(f => f.invite_code)
      const uniqueCodes = new Set(inviteCodes)
      
      expect(uniqueCodes.size).toBe(inviteCodes.length)
    }
  ),
  { numRuns: 100 }
)

// Property 3: Family Creator is Admin
fc.assert(
  fc.property(
    fc.string({ minLength: 1 }),
    fc.uuid(),
    async (familyName, userId) => {
      // Feature: tet-connect, Property 3: Family Creator is Admin
      const family = await createFamily(familyName, userId)
      
      const membership = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', family.id)
        .eq('user_id', userId)
        .single()
      
      expect(membership.data.role).toBe('admin')
    }
  ),
  { numRuns: 100 }
)
```

#### 3. AI Content Generation Module

**Unit Tests**:
- Form validation (required fields)
- Loading state during generation
- Error message on API failure
- Retry button appears on error

**Property Tests**:
```typescript
// Property 5: AI Content Generation with Correct Prompt
fc.assert(
  fc.property(
    fc.constantFrom('cau-doi', 'loi-chuc', 'thiep-tet'),
    fc.string({ minLength: 1 }),
    fc.string({ minLength: 1 }),
    async (type, recipientName, traits) => {
      // Feature: tet-connect, Property 5: AI Content Generation with Correct Prompt
      const mockGemini = vi.fn()
      
      await generateAIContent(type, recipientName, traits, mockGemini)
      
      expect(mockGemini).toHaveBeenCalledWith(
        expect.stringContaining(recipientName)
      )
      expect(mockGemini).toHaveBeenCalledWith(
        expect.stringContaining(traits)
      )
    }
  ),
  { numRuns: 100 }
)
```

#### 4. Posts & Reactions Module

**Unit Tests**:
- Post card renders with correct data
- Reaction buttons are clickable
- Reaction count updates after click
- Realtime subscription connects

**Property Tests**:
```typescript
// Property 6: Post Data Completeness
fc.assert(
  fc.property(
    fc.uuid(),
    fc.uuid(),
    fc.string({ minLength: 1 }),
    fc.constantFrom('cau-doi', 'loi-chuc', 'thiep-tet'),
    async (familyId, userId, content, type) => {
      // Feature: tet-connect, Property 6: Post Data Completeness
      const post = await createPost(familyId, userId, content, type)
      
      expect(post).toHaveProperty('id')
      expect(post).toHaveProperty('family_id', familyId)
      expect(post).toHaveProperty('user_id', userId)
      expect(post).toHaveProperty('content', content)
      expect(post).toHaveProperty('type', type)
      expect(post).toHaveProperty('created_at')
    }
  ),
  { numRuns: 100 }
)

// Property 9: Reaction Toggle Behavior
fc.assert(
  fc.property(
    fc.uuid(),
    fc.uuid(),
    fc.constantFrom('heart', 'haha'),
    async (postId, userId, reactionType) => {
      // Feature: tet-connect, Property 9: Reaction Toggle Behavior
      
      // Lần 1: Thêm reaction
      await toggleReaction(postId, userId, reactionType)
      let reactions = await getReactions(postId, userId)
      expect(reactions.length).toBe(1)
      expect(reactions[0].type).toBe(reactionType)
      
      // Lần 2: Nhấn lại cùng loại -> xóa
      await toggleReaction(postId, userId, reactionType)
      reactions = await getReactions(postId, userId)
      expect(reactions.length).toBe(0)
      
      // Lần 3: Thêm lại
      await toggleReaction(postId, userId, reactionType)
      reactions = await getReactions(postId, userId)
      expect(reactions.length).toBe(1)
      
      // Lần 4: Đổi sang loại khác
      const otherType = reactionType === 'heart' ? 'haha' : 'heart'
      await toggleReaction(postId, userId, otherType)
      reactions = await getReactions(postId, userId)
      expect(reactions.length).toBe(1)
      expect(reactions[0].type).toBe(otherType)
    }
  ),
  { numRuns: 100 }
)
```

#### 5. Events & Tasks Module

**Unit Tests**:
- Event form validation
- Task assignment dropdown shows members
- Checkbox toggles task status
- Event detail page renders correctly

**Property Tests**:
```typescript
// Property 14: Task Initial Status
fc.assert(
  fc.property(
    fc.uuid(),
    fc.string({ minLength: 1 }),
    fc.uuid(),
    async (eventId, taskDescription, assignedTo) => {
      // Feature: tet-connect, Property 14: Task Initial Status
      const task = await addTask(eventId, taskDescription, assignedTo)
      
      expect(task.status).toBe('pending')
    }
  ),
  { numRuns: 100 }
)

// Property 15: Task Status Toggle
fc.assert(
  fc.property(
    fc.uuid(),
    async (taskId) => {
      // Feature: tet-connect, Property 15: Task Status Toggle
      
      // Tạo task với status pending
      await createTask(taskId, 'pending')
      
      // Toggle sang completed
      await updateTaskStatus(taskId, 'completed')
      let task = await getTask(taskId)
      expect(task.status).toBe('completed')
      
      // Toggle lại sang pending
      await updateTaskStatus(taskId, 'pending')
      task = await getTask(taskId)
      expect(task.status).toBe('pending')
    }
  ),
  { numRuns: 100 }
)
```

#### 6. Photo Album Module

**Unit Tests**:
- File picker opens on button click
- Invalid file type shows error
- File too large shows error
- Upload progress bar updates
- Photo grid renders correctly

**Property Tests**:
```typescript
// Property 21: Photo File Validation
fc.assert(
  fc.property(
    fc.record({
      name: fc.string(),
      type: fc.string(),
      size: fc.integer({ min: 0, max: 20 * 1024 * 1024 })
    }),
    async (file) => {
      // Feature: tet-connect, Property 21: Photo File Validation
      const validTypes = ['image/jpeg', 'image/png', 'image/heic']
      const maxSize = 10 * 1024 * 1024
      
      const isValid = validTypes.includes(file.type) && file.size <= maxSize
      
      if (isValid) {
        await expect(validatePhoto(file)).resolves.toBe(true)
      } else {
        await expect(validatePhoto(file)).rejects.toThrow()
      }
    }
  ),
  { numRuns: 100 }
)

// Property 24: Photo Grouping by Date
fc.assert(
  fc.property(
    fc.array(fc.record({
      id: fc.uuid(),
      url: fc.webUrl(),
      uploaded_at: fc.date()
    }), { minLength: 1, maxLength: 100 }),
    (photos) => {
      // Feature: tet-connect, Property 24: Photo Grouping by Date
      const grouped = groupPhotosByDate(photos)
      
      // Kiểm tra mỗi group chỉ chứa ảnh cùng ngày
      for (const [date, photosInGroup] of Object.entries(grouped)) {
        for (const photo of photosInGroup) {
          const photoDate = new Date(photo.uploaded_at).toLocaleDateString('vi-VN')
          expect(photoDate).toBe(date)
        }
      }
    }
  ),
  { numRuns: 100 }
)
```

#### 7. Notifications Module

**Unit Tests**:
- Notification bell shows badge with count
- Clicking notification marks as read
- Notification dropdown renders list

**Property Tests**:
```typescript
// Property 19: Unread Notification Count
fc.assert(
  fc.property(
    fc.array(fc.record({
      id: fc.uuid(),
      read: fc.boolean()
    }), { minLength: 0, maxLength: 50 }),
    (notifications) => {
      // Feature: tet-connect, Property 19: Unread Notification Count
      const expectedCount = notifications.filter(n => !n.read).length
      const displayedCount = getUnreadCount(notifications)
      
      expect(displayedCount).toBe(expectedCount)
    }
  ),
  { numRuns: 100 }
)
```

### Integration Tests

Integration tests kiểm tra luồng hoàn chỉnh từ đầu đến cuối:

```typescript
describe('Complete User Journey', () => {
  it('should allow user to create family, post content, and receive reactions', async () => {
    // 1. Login
    const user = await loginWithGoogle()
    
    // 2. Create family
    const family = await createFamily('Gia đình test', user.id)
    expect(family.invite_code).toBeDefined()
    
    // 3. Generate AI content
    const content = await generateAIContent('cau-doi', 'Bố', 'hiền lành')
    expect(content).toBeTruthy()
    
    // 4. Create post
    const post = await createPost(family.id, user.id, content, 'cau-doi')
    expect(post.id).toBeDefined()
    
    // 5. Add reaction
    await toggleReaction(post.id, user.id, 'heart')
    const reactions = await getReactions(post.id, user.id)
    expect(reactions.length).toBe(1)
  })
})
```

### Test Execution

```bash
# Chạy tất cả tests
npm run test

# Chạy với coverage
npm run test:coverage

# Chạy chỉ property tests
npm run test:property

# Chạy chỉ unit tests
npm run test:unit

# Watch mode cho development
npm run test:watch
```

### CI/CD Integration

Tests sẽ chạy tự động trên GitHub Actions:

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

### Coverage Goals

- **Overall coverage**: Tối thiểu 80%
- **Critical paths** (auth, payments, data persistence): 95%
- **Property tests**: Mỗi correctness property phải có 1 property test tương ứng
- **Unit tests**: Focus vào edge cases và error conditions

