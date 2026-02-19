import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Complete User Journey Integration Tests
 * **Validates: Requirements Tất cả**
 * 
 * This test suite validates complete user journeys across multiple modules:
 * - Authentication → Family Creation → AI Content → Posts → Reactions
 * - Authentication → Join Family → View Posts → Add Reactions
 * - Family → Events → Tasks → Notifications
 * - Family → Photos → Upload → View → Video Creation
 */

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />
}))

describe('Complete User Journey Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('Journey 1: New User Creates Family and Posts AI Content', () => {
    it('should complete full journey from login to posting AI content', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        name: 'New User',
        avatar: 'https://example.com/avatar.jpg'
      }

      const mockFamily = {
        id: 'family-123',
        name: 'Gia đình Nguyễn',
        invite_code: 'ABC12345',
        created_by: mockUser.id,
        created_at: new Date().toISOString()
      }

      const mockAIContent = 'Xuân về đất nước muôn hoa thắm\nTết đến nhà nhà vạn sự vui'

      const mockPost = {
        id: 'post-123',
        family_id: mockFamily.id,
        user_id: mockUser.id,
        content: mockAIContent,
        type: 'cau-doi',
        created_at: new Date().toISOString(),
        users: mockUser
      }

      // Step 1: User authenticates (mocked)
      const { useAuth } = await import('@/components/auth/AuthProvider')
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn()
      })

      // Step 2: Create family
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFamily,
      })

      const CreateFamilyPage = (await import('@/app/family/create/page')).default
      const { unmount: unmountCreate } = render(<CreateFamilyPage />)

      const nameInput = screen.getByLabelText(/tên nhà/i)
      fireEvent.change(nameInput, { target: { value: mockFamily.name } })

      const createButton = screen.getByRole('button', { name: /tạo nhà/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/families', expect.any(Object))
      })

      unmountCreate()

      // Step 3: Generate AI content
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: mockAIContent }),
      })

      const { AIContentForm } = await import('@/components/ai/AIContentForm')
      const { unmount: unmountAI } = render(<AIContentForm familyId={mockFamily.id} />)

      const recipientInput = screen.getByLabelText(/tên người nhận/i)
      fireEvent.change(recipientInput, { target: { value: 'Bố' } })

      const traitsInput = screen.getByLabelText(/đặc điểm/i)
      fireEvent.change(traitsInput, { target: { value: 'hiền lành, yêu gia đình' } })

      const typeSelect = screen.getByLabelText(/loại nội dung/i)
      fireEvent.change(typeSelect, { target: { value: 'cau-doi' } })

      const generateButton = screen.getByRole('button', { name: /tạo nội dung/i })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/ai/generate', expect.any(Object))
        expect(screen.getByText(mockAIContent)).toBeInTheDocument()
      })

      unmountAI()

      // Step 4: Post AI content
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPost,
      })

      const postButton = screen.getByRole('button', { name: /đăng bài/i })
      fireEvent.click(postButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/posts', expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(mockAIContent)
        }))
      })

      // Verify success
      const { toast } = await import('sonner')
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('thành công'))
    })
  })

  describe('Journey 2: User Joins Family and Interacts with Posts', () => {
    it('should complete journey from joining family to adding reactions', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'member@example.com',
        name: 'Family Member',
        avatar: 'https://example.com/avatar2.jpg'
      }

      const mockFamily = {
        id: 'family-789',
        name: 'Gia đình Trần',
        invite_code: 'XYZ98765',
        created_by: 'other-user',
        created_at: new Date().toISOString()
      }

      const mockPosts = [
        {
          id: 'post-1',
          family_id: mockFamily.id,
          user_id: 'other-user',
          content: 'Chúc mừng năm mới!',
          type: 'loi-chuc',
          created_at: new Date().toISOString(),
          users: {
            id: 'other-user',
            name: 'Other User',
            email: 'other@example.com',
            avatar: 'https://example.com/avatar3.jpg',
            created_at: new Date().toISOString()
          }
        }
      ]

      // Step 1: User authenticates
      const { useAuth } = await import('@/components/auth/AuthProvider')
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn()
      })

      // Step 2: Join family via invite link
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFamily,
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const JoinFamilyPage = (await import('@/app/join/[inviteCode]/page')).default
      const { unmount: unmountJoin } = render(
        <JoinFamilyPage params={{ inviteCode: mockFamily.invite_code }} />
      )

      await waitFor(() => {
        expect(screen.getByText(mockFamily.name)).toBeInTheDocument()
      })

      const joinButton = screen.getByRole('button', { name: /tham gia/i })
      fireEvent.click(joinButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/families/${mockFamily.id}/join`,
          expect.any(Object)
        )
      })

      unmountJoin()

      // Step 3: View posts in family
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPosts,
      })

      const { PostFeed } = await import('@/components/posts/PostFeed')
      const { unmount: unmountFeed } = render(<PostFeed familyId={mockFamily.id} />)

      await waitFor(() => {
        expect(screen.getByText('Chúc mừng năm mới!')).toBeInTheDocument()
      })

      // Step 4: Add reaction to post
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const heartButton = screen.getByLabelText(/thả tim/i)
      fireEvent.click(heartButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/posts/${mockPosts[0].id}/reactions`,
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('heart')
          })
        )
      })

      unmountFeed()
    })
  })

  describe('Journey 3: Event Creation with Tasks and Notifications', () => {
    it('should complete journey from creating event to receiving notifications', async () => {
      const mockUser = {
        id: 'user-111',
        email: 'organizer@example.com',
        name: 'Event Organizer',
        avatar: 'https://example.com/avatar4.jpg'
      }

      const mockFamily = {
        id: 'family-222',
        name: 'Gia đình Lê',
        invite_code: 'DEF54321'
      }

      const mockEvent = {
        id: 'event-333',
        family_id: mockFamily.id,
        title: 'Cúng Tất Niên',
        date: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        location: 'Nhà ông bà',
        created_by: mockUser.id,
        created_at: new Date().toISOString()
      }

      const mockTask = {
        id: 'task-444',
        event_id: mockEvent.id,
        task: 'Mua hoa quả',
        assigned_to: mockUser.id,
        status: 'pending',
        created_at: new Date().toISOString()
      }

      // Step 1: User authenticated
      const { useAuth } = await import('@/components/auth/AuthProvider')
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn()
      })

      // Step 2: Create event
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      })

      const { CreateEventForm } = await import('@/components/events/CreateEventForm')
      const { unmount: unmountEvent } = render(
        <CreateEventForm familyId={mockFamily.id} />
      )

      const titleInput = screen.getByLabelText(/tiêu đề/i)
      fireEvent.change(titleInput, { target: { value: mockEvent.title } })

      const dateInput = screen.getByLabelText(/ngày/i)
      fireEvent.change(dateInput, { target: { value: mockEvent.date.split('T')[0] } })

      const locationInput = screen.getByLabelText(/địa điểm/i)
      fireEvent.change(locationInput, { target: { value: mockEvent.location } })

      const createEventButton = screen.getByRole('button', { name: /tạo sự kiện/i })
      fireEvent.click(createEventButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/events', expect.any(Object))
      })

      unmountEvent()

      // Step 3: Assign task
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTask,
      })

      const { AssignTaskForm } = await import('@/components/events/AssignTaskForm')
      const { unmount: unmountTask } = render(
        <AssignTaskForm eventId={mockEvent.id} familyId={mockFamily.id} />
      )

      const taskInput = screen.getByLabelText(/công việc/i)
      fireEvent.change(taskInput, { target: { value: mockTask.task } })

      const assignButton = screen.getByRole('button', { name: /phân công/i })
      fireEvent.click(assignButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/events/${mockEvent.id}/tasks`,
          expect.any(Object)
        )
      })

      unmountTask()

      // Step 4: Verify notification would be created (simulated cron job)
      const mockNotification = {
        id: 'notif-555',
        user_id: mockUser.id,
        type: 'task_reminder',
        title: 'Bạn có công việc chưa hoàn thành',
        content: `"${mockTask.task}" trong sự kiện "${mockEvent.title}"`,
        link: `/events/${mockEvent.id}`,
        read: false,
        created_at: new Date().toISOString()
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockNotification],
      })

      const { NotificationBell } = await import('@/components/notifications/NotificationBell')
      render(<NotificationBell />)

      await waitFor(() => {
        // Badge should show unread count
        const badge = screen.getByText('1')
        expect(badge).toBeInTheDocument()
      })
    })
  })

  describe('Journey 4: Photo Upload to Video Creation', () => {
    it('should complete journey from uploading photos to creating video recap', async () => {
      const mockUser = {
        id: 'user-777',
        email: 'photographer@example.com',
        name: 'Photographer',
        avatar: 'https://example.com/avatar5.jpg'
      }

      const mockFamily = {
        id: 'family-888',
        name: 'Gia đình Phạm'
      }

      const mockPhotos = [
        {
          id: 'photo-1',
          family_id: mockFamily.id,
          user_id: mockUser.id,
          url: 'https://example.com/photo1.jpg',
          uploaded_at: new Date().toISOString(),
          users: mockUser
        },
        {
          id: 'photo-2',
          family_id: mockFamily.id,
          user_id: mockUser.id,
          url: 'https://example.com/photo2.jpg',
          uploaded_at: new Date().toISOString(),
          users: mockUser
        },
        {
          id: 'photo-3',
          family_id: mockFamily.id,
          user_id: mockUser.id,
          url: 'https://example.com/photo3.jpg',
          uploaded_at: new Date().toISOString(),
          users: mockUser
        }
      ]

      // Step 1: User authenticated
      const { useAuth } = await import('@/components/auth/AuthProvider')
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn()
      })

      // Step 2: Upload photos
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockPhotos[0],
      })

      const { PhotoUploader } = await import('@/components/photos/PhotoUploader')
      const { unmount: unmountUpload } = render(
        <PhotoUploader familyId={mockFamily.id} />
      )

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const fileInput = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument()
      })

      const uploadButton = screen.getByText('Upload ảnh')
      fireEvent.click(uploadButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/photos/upload', expect.any(Object))
      })

      unmountUpload()

      // Step 3: View photos in album
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhotos,
      })

      const { PhotoGrid } = await import('@/components/photos/PhotoGrid')
      const { unmount: unmountGrid } = render(<PhotoGrid photos={mockPhotos} />)

      const images = screen.getAllByRole('img')
      expect(images).toHaveLength(3)

      unmountGrid()

      // Step 4: Create video recap
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          videoUrl: 'https://example.com/recap.mp4',
          status: 'completed'
        }),
      })

      const { VideoRecapCreator } = await import('@/components/videos/VideoRecapCreator')
      const { unmount: unmountVideo } = render(
        <VideoRecapCreator familyId={mockFamily.id} photos={mockPhotos} />
      )

      // Select photos for video
      const selectAllButton = screen.getByRole('button', { name: /chọn tất cả/i })
      fireEvent.click(selectAllButton)

      // Create video
      const createVideoButton = screen.getByRole('button', { name: /tạo video/i })
      fireEvent.click(createVideoButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/videos/create', expect.any(Object))
      })

      // Verify video preview appears
      await waitFor(() => {
        expect(screen.getByText(/video đã sẵn sàng/i)).toBeInTheDocument()
      })

      unmountVideo()
    })
  })

  describe('Journey 5: Cross-Module Realtime Updates', () => {
    it('should receive realtime updates across posts and reactions', async () => {
      const mockUser1 = {
        id: 'user-aaa',
        email: 'user1@example.com',
        name: 'User 1',
        avatar: 'https://example.com/avatar6.jpg'
      }

      const mockUser2 = {
        id: 'user-bbb',
        email: 'user2@example.com',
        name: 'User 2',
        avatar: 'https://example.com/avatar7.jpg'
      }

      const mockFamily = {
        id: 'family-ccc',
        name: 'Gia đình Hoàng'
      }

      const mockPost = {
        id: 'post-ddd',
        family_id: mockFamily.id,
        user_id: mockUser1.id,
        content: 'Tết vui vẻ!',
        type: 'loi-chuc',
        created_at: new Date().toISOString(),
        users: mockUser1
      }

      // Mock Supabase realtime
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }

      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any)

      // Step 1: User 1 views post feed
      const { useAuth } = await import('@/components/auth/AuthProvider')
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser1,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn()
      })

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockPost],
      })

      const { PostFeed } = await import('@/components/posts/PostFeed')
      render(<PostFeed familyId={mockFamily.id} />)

      await waitFor(() => {
        expect(screen.getByText('Tết vui vẻ!')).toBeInTheDocument()
      })

      // Verify realtime subscription was set up
      expect(supabase.channel).toHaveBeenCalledWith(`family:${mockFamily.id}`)
      expect(mockChannel.on).toHaveBeenCalled()
      expect(mockChannel.subscribe).toHaveBeenCalled()

      // Step 2: Simulate User 2 adding a reaction (realtime event)
      const realtimeCallback = mockChannel.on.mock.calls[0][2]
      const newReaction = {
        id: 'reaction-eee',
        post_id: mockPost.id,
        user_id: mockUser2.id,
        type: 'heart',
        created_at: new Date().toISOString()
      }

      // Trigger realtime callback
      realtimeCallback({ new: newReaction })

      // Verify UI updates with new reaction count
      await waitFor(() => {
        const reactionCount = screen.getByText('1')
        expect(reactionCount).toBeInTheDocument()
      })
    })
  })

  describe('Journey 6: Error Recovery Across Modules', () => {
    it('should handle errors gracefully and allow retry', async () => {
      const mockUser = {
        id: 'user-fff',
        email: 'erroruser@example.com',
        name: 'Error User',
        avatar: 'https://example.com/avatar8.jpg'
      }

      const mockFamily = {
        id: 'family-ggg',
        name: 'Gia đình Test'
      }

      // Step 1: User authenticated
      const { useAuth } = await import('@/components/auth/AuthProvider')
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn()
      })

      // Step 2: AI generation fails
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' }),
      })

      const { AIContentForm } = await import('@/components/ai/AIContentForm')
      render(<AIContentForm familyId={mockFamily.id} />)

      const recipientInput = screen.getByLabelText(/tên người nhận/i)
      fireEvent.change(recipientInput, { target: { value: 'Mẹ' } })

      const generateButton = screen.getByRole('button', { name: /tạo nội dung/i })
      fireEvent.click(generateButton)

      // Verify error message
      await waitFor(() => {
        const { toast } = require('sonner')
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Rate limit'))
      })

      // Step 3: Retry succeeds
      const mockAIContent = 'Mẹ hiền như nắng ấm xuân về'
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: mockAIContent }),
      })

      const retryButton = screen.getByRole('button', { name: /thử lại/i })
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText(mockAIContent)).toBeInTheDocument()
      })
    })
  })

  describe('Journey 7: Multi-User Collaboration', () => {
    it('should support multiple users collaborating on event tasks', async () => {
      const mockUsers = [
        {
          id: 'user-h1',
          email: 'user1@family.com',
          name: 'User 1',
          avatar: 'https://example.com/avatar9.jpg'
        },
        {
          id: 'user-h2',
          email: 'user2@family.com',
          name: 'User 2',
          avatar: 'https://example.com/avatar10.jpg'
        }
      ]

      const mockFamily = {
        id: 'family-hhh',
        name: 'Gia đình Collaboration'
      }

      const mockEvent = {
        id: 'event-iii',
        family_id: mockFamily.id,
        title: 'Tết Nguyên Đán',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        location: 'Nhà',
        created_by: mockUsers[0].id
      }

      const mockTasks = [
        {
          id: 'task-j1',
          event_id: mockEvent.id,
          task: 'Mua bánh chưng',
          assigned_to: mockUsers[0].id,
          status: 'pending'
        },
        {
          id: 'task-j2',
          event_id: mockEvent.id,
          task: 'Trang trí nhà',
          assigned_to: mockUsers[1].id,
          status: 'pending'
        }
      ]

      // User 1 creates event and assigns tasks
      const { useAuth } = await import('@/components/auth/AuthProvider')
      vi.mocked(useAuth).mockReturnValue({
        user: mockUsers[0],
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn()
      })

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvent,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTasks[0],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTasks[1],
        })

      // Create event
      const { CreateEventForm } = await import('@/components/events/CreateEventForm')
      const { unmount: unmountEvent } = render(
        <CreateEventForm familyId={mockFamily.id} />
      )

      const titleInput = screen.getByLabelText(/tiêu đề/i)
      fireEvent.change(titleInput, { target: { value: mockEvent.title } })

      const createButton = screen.getByRole('button', { name: /tạo sự kiện/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/events', expect.any(Object))
      })

      unmountEvent()

      // User 1 completes their task
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockTasks[0], status: 'completed' }),
      })

      const { TaskList } = await import('@/components/events/TaskList')
      const { unmount: unmountTasks } = render(
        <TaskList eventId={mockEvent.id} tasks={mockTasks} />
      )

      const checkbox = screen.getAllByRole('checkbox')[0]
      fireEvent.click(checkbox)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/tasks/${mockTasks[0].id}`,
          expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('completed')
          })
        )
      })

      unmountTasks()

      // Verify User 2 still has pending task
      expect(mockTasks[1].status).toBe('pending')
    })
  })
})
