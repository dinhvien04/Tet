/**
 * Unit tests for Dashboard Page - Loading States
 * Tests loading skeletons and async data fetching
 * Requirements: Tất cả
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardPage from '@/app/dashboard/page'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock ProtectedRoute
vi.mock('@/components/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock AppLayout
vi.mock('@/components/layout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}))

// Mock FamilyContext
const mockCurrentFamily = {
  id: 'family-1',
  name: 'Gia đình Nguyễn',
  invite_code: 'ABC123',
  created_by: 'user-1',
  created_at: new Date().toISOString(),
}

vi.mock('@/components/family/FamilyContext', () => ({
  useFamily: () => ({
    currentFamily: mockCurrentFamily,
  }),
}))

// Mock hooks with loading states
vi.mock('@/lib/hooks/usePosts', () => ({
  usePosts: () => ({
    posts: undefined,
    isLoading: true,
  }),
}))

vi.mock('@/lib/hooks/useEvents', () => ({
  useEvents: () => ({
    events: undefined,
    isLoading: true,
  }),
}))

vi.mock('@/lib/hooks/usePhotos', () => ({
  usePhotos: () => ({
    photos: undefined,
    isLoading: true,
  }),
}))

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}))

// Mock PostCard
vi.mock('@/components/posts/PostCard', () => ({
  PostCard: ({ post }: any) => (
    <div data-testid="post-card">
      <p>{post.content}</p>
    </div>
  ),
}))

// Mock EventCard
vi.mock('@/components/events/EventCard', () => ({
  EventCard: ({ event }: any) => (
    <div data-testid="event-card">
      <p>{event.title}</p>
    </div>
  ),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, onClick }: any) => (
    <img src={src} alt={alt} onClick={onClick} data-testid="photo-image" />
  ),
}))

describe('Dashboard Page - Loading States', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the dashboard layout even when loading', () => {
    render(<DashboardPage />)
    expect(screen.getByTestId('app-layout')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('should show skeleton loaders for posts when loading', () => {
    render(<DashboardPage />)
    const skeletons = screen.getAllByTestId('skeleton')
    // Should have skeletons for posts (3), events (3), and photos (6) = 12 total
    expect(skeletons.length).toBeGreaterThanOrEqual(3)
  })

  it('should show posts section header even when loading', () => {
    render(<DashboardPage />)
    expect(screen.getByText('Bài đăng gần đây')).toBeInTheDocument()
  })

  it('should show events section header even when loading', () => {
    render(<DashboardPage />)
    expect(screen.getByText('Sự kiện sắp tới')).toBeInTheDocument()
  })

  it('should show photos section header even when loading', () => {
    render(<DashboardPage />)
    expect(screen.getByText('Ảnh gần đây')).toBeInTheDocument()
  })

  it('should show quick actions even when data is loading', () => {
    render(<DashboardPage />)
    expect(screen.getByText('Thao tác nhanh')).toBeInTheDocument()
    expect(screen.getByText('Tạo câu đối AI')).toBeInTheDocument()
    expect(screen.getByText('Tạo bài đăng')).toBeInTheDocument()
    expect(screen.getByText('Tạo sự kiện')).toBeInTheDocument()
    expect(screen.getByText('Upload ảnh')).toBeInTheDocument()
  })

  it('should not show empty state messages when loading', () => {
    render(<DashboardPage />)
    expect(screen.queryByText('Chưa có bài đăng nào')).not.toBeInTheDocument()
    expect(screen.queryByText('Chưa có sự kiện nào')).not.toBeInTheDocument()
    expect(screen.queryByText('Chưa có ảnh nào')).not.toBeInTheDocument()
  })

  it('should not show actual content when loading', () => {
    render(<DashboardPage />)
    expect(screen.queryByTestId('post-card')).not.toBeInTheDocument()
    expect(screen.queryByTestId('event-card')).not.toBeInTheDocument()
    expect(screen.queryByTestId('photo-image')).not.toBeInTheDocument()
  })
})
