import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JoinFamilyPage from '@/app/join/[inviteCode]/page'
import { supabase } from '@/lib/supabase'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useParams: () => ({
    inviteCode: 'TEST1234',
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('JoinFamilyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display loading state initially', () => {
    // Mock authenticated user
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } as any },
      error: null,
    })

    // Mock family query
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any)

    render(<JoinFamilyPage />)

    expect(screen.getByText('Đang tải...')).toBeInTheDocument()
  })

  it('should display family information when invite code is valid', async () => {
    // Mock authenticated user
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } as any },
      error: null,
    })

    // Mock family query
    const mockFamily = {
      id: 'family-1',
      name: 'Gia đình Nguyễn',
      invite_code: 'TEST1234',
      created_by: 'user-2',
      created_at: new Date().toISOString(),
    }

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: mockFamily,
      error: null,
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any)

    render(<JoinFamilyPage />)

    await waitFor(() => {
      expect(screen.getByText('Gia đình Nguyễn')).toBeInTheDocument()
    })

    expect(screen.getByText('Mã mời: TEST1234')).toBeInTheDocument()
    expect(screen.getByText('Tham gia nhà')).toBeInTheDocument()
  })

  it('should display error when invite code is invalid', async () => {
    // Mock authenticated user
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } as any },
      error: null,
    })

    // Mock family query with error
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any)

    render(<JoinFamilyPage />)

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy nhà')).toBeInTheDocument()
    })

    expect(screen.getByText('Mã mời không hợp lệ hoặc đã hết hạn')).toBeInTheDocument()
  })

  it('should prompt login when user is not authenticated', async () => {
    // Mock unauthenticated user
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })

    // Mock family query
    const mockFamily = {
      id: 'family-1',
      name: 'Gia đình Nguyễn',
      invite_code: 'TEST1234',
      created_by: 'user-2',
      created_at: new Date().toISOString(),
    }

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: mockFamily,
      error: null,
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any)

    render(<JoinFamilyPage />)

    await waitFor(() => {
      expect(screen.getByText('Đăng nhập và tham gia')).toBeInTheDocument()
    })

    expect(screen.getByText('Bạn cần đăng nhập để tham gia nhà')).toBeInTheDocument()
  })

  it('should call join API when authenticated user clicks join button', async () => {
    const user = userEvent.setup()

    // Mock authenticated user
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } as any },
      error: null,
    })

    // Mock family query
    const mockFamily = {
      id: 'family-1',
      name: 'Gia đình Nguyễn',
      invite_code: 'TEST1234',
      created_by: 'user-2',
      created_at: new Date().toISOString(),
    }

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: mockFamily,
      error: null,
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any)

    // Mock fetch for join API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<JoinFamilyPage />)

    await waitFor(() => {
      expect(screen.getByText('Tham gia nhà')).toBeInTheDocument()
    })

    const joinButton = screen.getByText('Tham gia nhà')
    await user.click(joinButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/families/family-1/join',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inviteCode: 'TEST1234' }),
        })
      )
    })
  })
})
