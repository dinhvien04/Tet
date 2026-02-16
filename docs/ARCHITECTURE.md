# Kiến trúc Tết Connect

## Tổng quan

Tết Connect được xây dựng theo kiến trúc modern web application với các lớp rõ ràng:

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
```

## Cấu trúc Thư mục

### `/app` - Next.js App Router
- Chứa các pages và layouts
- Sử dụng file-based routing
- Server Components mặc định

### `/components` - React Components
- `/ui` - Shadcn/ui components (Button, Card, Dialog, etc.)
- `/auth` - Authentication components (LoginButton, AuthProvider)
- `/family` - Family management (CreateFamilyForm, InviteCard)
- `/posts` - Posts & reactions (PostCard, PostFeed, ReactionButtons)
- `/events` - Events & tasks (EventCalendar, TaskList)
- `/photos` - Photo album (PhotoGrid, PhotoUploader)

### `/lib` - Utilities & Configurations
- `supabase.ts` - Supabase client configuration
- `utils.ts` - Helper functions (cn, formatDate, etc.)

### `/types` - TypeScript Type Definitions
- `database.ts` - Database schema types
- Các types khác cho API responses, props, etc.

## Tech Stack

### Frontend
- **Next.js 14**: React framework với App Router
- **React 19**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/ui**: Component library

### Backend
- **Supabase**: Backend-as-a-Service
  - PostgreSQL database
  - Authentication (Google OAuth)
  - Storage (images, videos)
  - Realtime subscriptions
  - Row Level Security (RLS)

### AI
- **Google Gemini API**: AI content generation

### Deployment
- **Vercel**: Hosting & deployment
- **GitHub**: Version control

## Data Flow

### Authentication Flow
1. User clicks "Đăng nhập bằng Google"
2. Redirect to Google OAuth
3. Google returns user info
4. Supabase creates/updates user record
5. Session stored in cookies
6. Redirect to dashboard

### Content Creation Flow
1. User fills AI content form
2. Client sends request to `/api/ai/generate`
3. Server calls Gemini API with prompt
4. Gemini returns generated content
5. User reviews and posts to family wall
6. Content saved to Supabase
7. Realtime update to all family members

### Realtime Updates Flow
1. Client subscribes to Supabase Realtime channel
2. When data changes in database
3. Supabase broadcasts change via WebSocket
4. Client receives update and re-renders UI

## Security

### Row Level Security (RLS)
- Users can only access data from families they belong to
- Policies enforced at database level
- No way to bypass via API

### Authentication
- Google OAuth for secure login
- Session management by Supabase
- Automatic token refresh

### Environment Variables
- Sensitive keys stored in `.env.local`
- Never committed to git
- Different values for dev/prod

## Performance Optimizations

### Code Splitting
- Next.js automatic code splitting
- Dynamic imports for heavy components
- Lazy loading for images

### Caching
- Next.js built-in caching
- Supabase query caching
- Browser caching for static assets

### Image Optimization
- Next.js Image component
- Automatic WebP conversion
- Responsive images
- Lazy loading

## Testing Strategy

### Unit Tests
- Test individual components
- Test utility functions
- Test API routes

### Property-Based Tests
- Test correctness properties
- Run with random inputs
- Validate business logic

### Integration Tests
- Test complete user flows
- Test cross-module interactions

## Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Vercel Deployment
- Push to GitHub
- Vercel auto-deploys
- Environment variables configured in Vercel dashboard

## Monitoring & Logging

### Development
- Console logs
- React DevTools
- Next.js error overlay

### Production
- Vercel Analytics
- Supabase logs
- Error tracking (future: Sentry)
