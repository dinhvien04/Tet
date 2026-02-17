# Kế hoạch Triển khai: Tết Connect

## Tổng quan

Kế hoạch triển khai MVP của Tết Connect trong 2-3 tuần, tập trung vào 3 tính năng cốt lõi:
1. AI Câu đối & Thiệp Tết
2. Lịch họp mặt gia đình
3. Album ảnh chung

Tech stack: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/ui, Supabase, Gemini API

## Nhiệm vụ

- [x] 1. Khởi tạo dự án và cấu hình cơ bản
  - Tạo Next.js project với TypeScript và Tailwind CSS
  - Cài đặt và cấu hình Shadcn/ui
  - Thiết lập Supabase client và environment variables
  - Tạo cấu trúc thư mục cơ bản (app, components, lib, types)
  - _Requirements: Tất cả_

- [x] 2. Thiết lập Database Schema trên Supabase
  - [x] 2.1 Tạo các bảng cơ sở dữ liệu
    - Tạo bảng users, families, family_members
    - Tạo bảng posts, reactions
    - Tạo bảng events, event_tasks
    - Tạo bảng photos, notifications
    - Thiết lập foreign keys và constraints
    - _Requirements: 1.3, 2.3, 5.1, 7.4, 8.4, 10.5, 9.3_
  
  - [x] 2.2 Cấu hình Row Level Security (RLS)
    - Tạo policies cho users table
    - Tạo policies cho families và family_members
    - Tạo policies cho posts, reactions, events, event_tasks
    - Tạo policies cho photos và notifications
    - _Requirements: Tất cả (bảo mật)_
  
  - [x] 2.3 Thiết lập Storage Buckets
    - Tạo bucket "photos" với public access
    - Tạo bucket "videos" với public access
    - Cấu hình file size limits và MIME types
    - _Requirements: 10.4, 12.6_

- [x] 3. Xây dựng Authentication Module
  - [x] 3.1 Tạo trang đăng nhập
    - Tạo UI trang login với nút "Đăng nhập bằng Google"
    - Implement Google OAuth flow với Supabase Auth
    - Tạo callback route xử lý OAuth redirect
    - _Requirements: 1.1, 1.2, 1.5_
  
  - [x] 3.2 Viết property test cho authentication
    - **Property 1: User Authentication Persistence**
    - **Validates: Requirements 1.3, 1.4**
  
  - [x] 3.3 Tạo AuthProvider và middleware
    - Tạo React Context cho authentication state
    - Tạo middleware kiểm tra session cho protected routes
    - Implement auto-redirect khi chưa đăng nhập
    - _Requirements: 1.5_
  
  - [x] 3.4 Viết unit tests cho auth flow
    - Test login button render
    - Test OAuth redirect
    - Test session persistence
    - _Requirements: 1.1, 1.2, 1.5_

- [x] 4. Checkpoint - Kiểm tra authentication
  - Đảm bảo đăng nhập Google hoạt động
  - Kiểm tra session được lưu đúng
  - Hỏi người dùng nếu có thắc mắc


- [x] 5. Xây dựng Family Management Module
  - [x] 5.1 Tạo UI và logic tạo nhà mới
    - Tạo form CreateFamilyForm với validation
    - Implement API route POST /api/families
    - Generate unique invite code (8 ký tự random)
    - Tự động thêm người tạo làm admin
    - _Requirements: 2.2, 2.3, 2.4_
  
  - [x] 5.2 Viết property tests cho family creation
    - **Property 2: Unique Family Invite Code**
    - **Property 3: Family Creator is Admin**
    - **Validates: Requirements 2.3, 2.4**
  
  - [x] 5.3 Tạo UI hiển thị và copy invite link
    - Tạo component FamilyInviteCard
    - Implement copy to clipboard functionality
    - Hiển thị toast notification khi copy thành công
    - _Requirements: 2.5, 3.1, 3.2_
  
  - [x] 5.4 Tạo trang tham gia nhà qua invite link
    - Tạo route /join/[inviteCode]
    - Hiển thị thông tin nhà và nút tham gia
    - Implement logic tham gia nhà (thêm vào family_members)
    - Redirect về dashboard sau khi join thành công
    - _Requirements: 3.3, 3.4, 3.5, 3.6_
  
  - [x] 5.5 Viết property test cho join family
    - **Property 4: Join Family with Member Role**
    - **Validates: Requirements 3.5**
  
  - [x] 5.6 Viết unit tests cho family management
    - Test create family form validation
    - Test invite code copy
    - Test join with invalid code
    - _Requirements: 2.2, 3.2, 3.4_

- [x] 6. Xây dựng AI Content Generation Module
  - [x] 6.1 Cấu hình Gemini API
    - Cài đặt @google/generative-ai package
    - Tạo API route POST /api/ai/generate
    - Implement prompts cho câu đối, lời chúc, thiệp Tết
    - _Requirements: 4.3_
  
  - [x] 6.2 Tạo UI form tạo nội dung AI
    - Tạo component AIContentForm
    - Input fields: tên người nhận, đặc điểm, loại nội dung
    - Implement loading state khi đang generate
    - Hiển thị kết quả AI trong AIContentPreview
    - _Requirements: 4.1, 4.2, 4.4_
  
  - [x] 6.3 Viết property test cho AI generation
    - **Property 5: AI Content Generation with Correct Prompt**
    - **Validates: Requirements 4.3**
  
  - [x] 6.4 Implement error handling cho AI
    - Xử lý timeout (30s)
    - Xử lý rate limit (429)
    - Hiển thị error message và nút retry
    - _Requirements: 4.6_
  
  - [x] 6.5 Viết unit tests cho AI module
    - Test form validation
    - Test loading state
    - Test error handling
    - _Requirements: 4.1, 4.2, 4.6_

- [x] 7. Xây dựng Posts & Reactions Module
  - [x] 7.1 Tạo API và logic cho posts
    - Tạo API route POST /api/posts
    - Tạo API route GET /api/posts?familyId=:id
    - Implement createPost function với validation
    - _Requirements: 5.1, 5.2_
  
  - [x] 7.2 Viết property tests cho posts
    - **Property 6: Post Data Completeness**
    - **Property 7: Post Timeline Ordering**
    - **Property 8: Post Family Filtering**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
  
  - [x] 7.3 Tạo UI hiển thị bài đăng
    - Tạo component PostCard
    - Tạo component PostFeed với infinite scroll
    - Hiển thị avatar, tên, thời gian, nội dung
    - _Requirements: 5.3, 5.4, 5.5_
  
  - [x] 7.4 Implement reactions system
    - Tạo API route POST /api/posts/:id/reactions
    - Implement toggleReaction logic (add/remove/switch)
    - Tạo component ReactionButtons
    - Hiển thị reaction count và highlight user's reaction
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [x] 7.5 Viết property tests cho reactions
    - **Property 9: Reaction Toggle Behavior**
    - **Property 10: Reaction Count Accuracy**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
  
  - [x] 7.6 Implement Realtime updates cho posts
    - Subscribe to Supabase Realtime channel
    - Auto-update feed khi có post mới
    - Auto-update reaction count khi có reaction mới
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [x] 7.7 Viết property tests cho realtime
    - **Property 26: Realtime Post Updates**
    - **Property 27: Realtime Reaction Updates**
    - **Validates: Requirements 13.2, 13.3**
  
  - [x] 7.8 Viết unit tests cho posts module
    - Test PostCard rendering
    - Test reaction buttons
    - Test realtime subscription
    - _Requirements: 5.5, 6.1, 6.6, 13.2_

- [x] 8. Checkpoint - Kiểm tra AI và Posts
  - Đảm bảo tạo câu đối AI hoạt động
  - Kiểm tra đăng bài và reactions
  - Kiểm tra realtime updates
  - Hỏi người dùng nếu có thắc mắc

- [x] 9. Xây dựng Events & Tasks Module
  - [x] 9.1 Tạo API và logic cho events
    - Tạo API route POST /api/events
    - Tạo API route GET /api/events?familyId=:id
    - Implement createEvent function
    - _Requirements: 7.3, 7.4_
  
  - [x] 9.2 Viết property tests cho events
    - **Property 11: Event Persistence**
    - **Property 12: Event Timeline Ordering**
    - **Validates: Requirements 7.4, 7.5**
  
  - [x] 9.3 Tạo UI quản lý events
    - Tạo component EventCalendar (list view)
    - Tạo component CreateEventForm
    - Tạo trang chi tiết event
    - _Requirements: 7.1, 7.2, 7.6_
  
  - [x] 9.4 Implement tasks system
    - Tạo API route POST /api/events/:id/tasks
    - Tạo API route PATCH /api/tasks/:id
    - Implement addTask và updateTaskStatus functions
    - _Requirements: 8.2, 8.4, 8.7_
  
  - [x] 9.5 Viết property tests cho tasks
    - **Property 13: Task Creation and Linking**
    - **Property 14: Task Initial Status**
    - **Property 15: Task Status Toggle**
    - **Validates: Requirements 8.4, 8.5, 8.7**
  
  - [x] 9.6 Tạo UI quản lý tasks
    - Tạo component TaskList
    - Tạo component TaskItem với checkbox
    - Tạo component AssignTaskForm với member dropdown
    - Highlight tasks của user hiện tại
    - _Requirements: 8.1, 8.2, 8.3, 8.6_
  
  - [x] 9.7 Viết unit tests cho events module
    - Test event form validation
    - Test task assignment
    - Test checkbox toggle
    - _Requirements: 7.2, 7.3, 8.2, 8.7_

- [x] 10. Xây dựng Notifications Module
  - [x] 10.1 Tạo background job cho notifications
    - Tạo API route hoặc cron job kiểm tra upcoming events
    - Implement logic tạo event reminders (24h trước)
    - Implement logic tạo task reminders cho pending tasks
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 10.2 Viết property tests cho notifications
    - **Property 16: Event Reminder for All Members**
    - **Property 17: Task Reminder for Assignee**
    - **Property 18: Notification Persistence**
    - **Validates: Requirements 9.1, 9.2, 9.3**
  
  - [x] 10.3 Tạo UI hiển thị notifications
    - Tạo component NotificationBell với badge count
    - Tạo component NotificationDropdown
    - Implement mark as read khi click
    - Redirect đến event page khi click notification
    - _Requirements: 9.4, 9.5_
  
  - [x] 10.4 Viết property tests cho notification UI
    - **Property 19: Unread Notification Count**
    - **Property 20: Notification Mark as Read**
    - **Validates: Requirements 9.4, 9.5**
  
  - [x] 10.5 Viết unit tests cho notifications
    - Test bell badge display
    - Test dropdown rendering
    - Test mark as read
    - _Requirements: 9.4, 9.5_

- [x] 11. Checkpoint - Kiểm tra Events và Notifications
  - Đảm bảo tạo event và tasks hoạt động
  - Kiểm tra notifications được tạo đúng
  - Hỏi người dùng nếu có thắc mắc

- [x] 12. Xây dựng Photo Album Module
  - [x] 12.1 Implement photo upload
    - Tạo API route POST /api/photos/upload
    - Implement file validation (type, size)
    - Upload file lên Supabase Storage
    - Lưu metadata vào database
    - _Requirements: 10.2, 10.3, 10.4, 10.5_
  
  - [x] 12.2 Viết property tests cho photo upload
    - **Property 21: Photo File Validation**
    - **Property 22: Photo Upload and Persistence**
    - **Validates: Requirements 10.3, 10.4, 10.5, 10.7**
  
  - [x] 12.3 Tạo UI upload ảnh
    - Tạo component PhotoUploader với drag & drop
    - Support file picker và camera (mobile)
    - Hiển thị upload progress
    - Hiển thị error messages
    - _Requirements: 10.1, 10.2, 10.7, 14.4_
  
  - [x] 12.4 Tạo UI hiển thị album
    - Tạo API route GET /api/photos?familyId=:id
    - Tạo component PhotoGrid responsive
    - Tạo component PhotoTimeline nhóm theo ngày
    - Implement lazy loading cho ảnh
    - _Requirements: 10.6, 11.1, 11.2, 15.2_
  
  - [x] 12.5 Viết property tests cho photo display
    - **Property 23: Photo Timeline Ordering**
    - **Property 24: Photo Grouping by Date**
    - **Validates: Requirements 10.6, 11.1, 11.2**
  
  - [x] 12.6 Tạo photo viewer
    - Tạo component PhotoViewer (lightbox)
    - Hiển thị metadata (uploader, time)
    - Navigation prev/next
    - _Requirements: 11.3, 11.4, 11.5_
  
  - [x] 12.7 Viết unit tests cho photo module
    - Test file validation
    - Test upload progress
    - Test photo grid rendering
    - Test lightbox navigation
    - _Requirements: 10.3, 10.7, 11.3, 11.5_

- [x] 13. Xây dựng Video Recap Module
  - [x] 13.1 Implement video creation với Canvas API
    - Tạo API route POST /api/videos/create
    - Implement Canvas-based video rendering
    - Thêm fade in/out transitions
    - Thêm nhạc nền Tết mặc định
    - Upload video lên Supabase Storage
    - _Requirements: 12.3, 12.4, 12.5, 12.6_
  
  - [x] 13.2 Viết property test cho video creation
    - **Property 25: Video Creation Pipeline**
    - **Validates: Requirements 12.3, 12.5, 12.6, 12.8**
  
  - [x] 13.3 Tạo UI tạo video
    - Tạo component VideoRecapButton
    - Tạo component PhotoSelector (chọn ảnh cho video)
    - Hiển thị processing status
    - Hiển thị video preview sau khi hoàn thành
    - Nút download video
    - _Requirements: 12.1, 12.2, 12.7_
  
  - [x] 13.4 Implement error handling cho video
    - Xử lý browser không support MediaRecorder
    - Giới hạn số ảnh (max 50)
    - Xử lý memory errors
    - Hiển thị error và retry button
    - _Requirements: 12.8_
  
  - [x] 13.5 Viết unit tests cho video module
    - Test photo selection
    - Test processing status
    - Test error handling
    - _Requirements: 12.2, 12.8_

- [x] 14. Checkpoint - Kiểm tra Photos và Videos
  - Đảm bảo upload ảnh hoạt động
  - Kiểm tra tạo video recap
  - Hỏi người dùng nếu có thắc mắc

- [ ] 15. Implement Responsive Design
  - [x] 15.1 Tối ưu layout cho mobile
    - Implement responsive breakpoints với Tailwind
    - Ẩn sidebar trên mobile, hiển thị hamburger menu
    - Điều chỉnh kích thước ảnh và cards
    - Test trên các screen sizes khác nhau
    - _Requirements: 14.1, 14.2, 14.3_
  
  - [x] 15.2 Tối ưu interactions cho mobile
    - Touch-friendly button sizes
    - Swipe gestures cho photo viewer
    - Mobile camera access cho photo upload
    - _Requirements: 14.4_
  
  - [x] 15.3 Viết unit tests cho responsive
    - Test mobile menu
    - Test responsive layout
    - Test camera access
    - _Requirements: 14.1, 14.2, 14.4_

- [ ] 16. Performance Optimization
  - [x] 16.1 Implement lazy loading và code splitting
    - Next.js dynamic imports cho heavy components
    - Lazy load images với next/image
    - Implement infinite scroll cho posts và photos
    - _Requirements: 15.2, 15.3_
  
  - [x] 16.2 Optimize loading states
    - Skeleton loaders cho tất cả components
    - Loading spinners cho async operations
    - Optimistic UI updates
    - _Requirements: 15.1, 15.4_
  
  - [x] 16.3 Implement caching strategies
    - SWR hoặc React Query cho data fetching
    - Cache Supabase queries
    - Service Worker cho offline support (optional)
    - _Requirements: 15.1_

- [ ] 17. Tạo Dashboard và Navigation
  - [x] 17.1 Tạo layout chính
    - Tạo app layout với sidebar/header
    - Implement navigation menu
    - Hiển thị family selector nếu user thuộc nhiều nhà
    - _Requirements: Tất cả_
  
  - [x] 17.2 Tạo dashboard page
    - Hiển thị recent posts
    - Hiển thị upcoming events
    - Hiển thị recent photos
    - Quick actions (tạo post, tạo event, upload ảnh)
    - _Requirements: Tất cả_
  
  - [x] 17.3 Viết unit tests cho dashboard
    - Test layout rendering
    - Test navigation
    - Test quick actions
    - _Requirements: Tất cả_

- [x] 18. Error Handling và User Feedback
  - [x] 18.1 Implement global error handling
    - Error boundary cho React components
    - Global error handler cho API calls
    - Retry logic với exponential backoff
    - _Requirements: Tất cả (error handling)_
  
  - [x] 18.2 Implement toast notifications
    - Success messages
    - Error messages
    - Info messages
    - _Requirements: Tất cả (user feedback)_
  
  - [x] 18.3 Implement fallback UI
    - Fallback polling khi Realtime fails
    - Offline indicators
    - Empty states cho lists
    - _Requirements: 13.4, 15.1_

- [ ] 19. Testing và Quality Assurance
  - [x] 19.1 Chạy tất cả property tests
    - Đảm bảo tất cả 27 properties pass
    - Mỗi test chạy tối thiểu 100 iterations
    - Fix các bugs được phát hiện
    - _Requirements: Tất cả_
  
  - [ ] 19.2 Chạy tất cả unit tests
    - Đảm bảo coverage >= 80%
    - Fix các failing tests
    - _Requirements: Tất cả_
  
  - [ ] 19.3 Integration testing
    - Test complete user journeys
    - Test cross-module interactions
    - _Requirements: Tất cả_
  
  - [ ] 19.4 Manual testing
    - Test trên Chrome, Safari, Firefox
    - Test trên iOS và Android
    - Test các edge cases
    - _Requirements: Tất cả_

- [ ] 20. Deployment và Documentation
  - [ ] 20.1 Chuẩn bị deployment
    - Cấu hình environment variables cho production
    - Setup Vercel project
    - Configure Supabase production instance
    - _Requirements: Tất cả_
  
  - [ ] 20.2 Deploy lên Vercel
    - Deploy và test production build
    - Setup custom domain (optional)
    - Configure analytics (optional)
    - _Requirements: Tất cả_
  
  - [ ] 20.3 Viết documentation
    - README với setup instructions
    - User guide cơ bản
    - API documentation (nếu cần)
    - _Requirements: Tất cả_

- [ ] 21. Final Checkpoint - Launch Ready
  - Đảm bảo tất cả tính năng hoạt động
  - Kiểm tra performance
  - Sẵn sàng cho users thử nghiệm

## Ghi chú

- Tasks đánh dấu `*` là optional và có thể bỏ qua để tăng tốc độ phát triển MVP
- Mỗi task tham chiếu đến requirements cụ thể để dễ truy vết
- Checkpoints đảm bảo validation từng bước
- Property tests validate tính đúng đắn tổng quát
- Unit tests validate các trường hợp cụ thể và edge cases
- Ưu tiên hoàn thành core features trước khi optimize
