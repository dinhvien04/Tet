/**
 * Unit tests for Family Management Module
 * Task 5.6: Viết unit tests cho family management
 * 
 * Tests cover:
 * - Create family form validation (Requirement 2.2)
 * - Invite code copy functionality (Requirement 3.2)
 * - Join with invalid code (Requirement 3.4)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateFamilyForm } from '@/components/family/CreateFamilyForm'
import { FamilyInviteCard } from '@/components/family/FamilyInviteCard'
import JoinFamilyPage from '@/app/join/[inviteCode]/page'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useParams: () => ({
    inviteCode: 'INVALID123',
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('Family Management - Form Validation (Requirement 2.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CreateFamilyForm validation', () => {
    it('should show error when family name is empty', async () => {
      render(<CreateFamilyForm />)
      
      const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/vui lòng nhập tên nhà/i)).toBeInTheDocument()
      })
      
      // Should not call API
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should show error when family name contains only whitespace', async () => {
      render(<CreateFamilyForm />)
      
      const input = screen.getByLabelText(/tên nhà/i)
      fireEvent.change(input, { target: { value: '   ' } })
      
      const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/vui lòng nhập tên nhà/i)).toBeInTheDocument()
      })
      
      // Should not call API
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should trim whitespace from family name before submission', async () => {
      const mockResponse = {
        id: 'family-123',
        name: 'Test Family',
        invite_code: 'ABC12345',
        created_at: new Date().toISOString(),
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(<CreateFamilyForm />)
      
      const input = screen.getByLabelText(/tên nhà/i)
      fireEvent.change(input, { target: { value: '  Test Family  ' } })
      
      const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/families', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Test Family' }),
        })
      })
    })

    it('should accept valid family name', async () => {
      const mockResponse = {
        id: 'family-123',
        name: 'Gia đình Nguyễn',
        invite_code: 'ABC12345',
        created_at: new Date().toISOString(),
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(<CreateFamilyForm />)
      
      const input = screen.getByLabelText(/tên nhà/i)
      fireEvent.change(input, { target: { value: 'Gia đình Nguyễn' } })
      
      const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/families', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Gia đình Nguyễn' }),
        })
      })
    })

    it('should disable form inputs while submitting', async () => {
      ;(global.fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(<CreateFamilyForm />)
      
      const input = screen.getByLabelText(/tên nhà/i)
      fireEvent.change(input, { target: { value: 'Test Family' } })
      
      const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(input).toBeDisabled()
        expect(submitButton).toBeDisabled()
        expect(screen.getByText(/đang tạo/i)).toBeInTheDocument()
      })
    })

    it('should show error message when API returns error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Tên nhà đã tồn tại' }),
      })

      render(<CreateFamilyForm />)
      
      const input = screen.getByLabelText(/tên nhà/i)
      fireEvent.change(input, { target: { value: 'Existing Family' } })
      
      const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/tên nhà đã tồn tại/i)).toBeInTheDocument()
      })
    })

    it('should enforce maximum length of 100 characters', () => {
      render(<CreateFamilyForm />)
      
      const input = screen.getByLabelText(/tên nhà/i) as HTMLInputElement
      expect(input).toHaveAttribute('maxLength', '100')
    })
  })
})

describe('Family Management - Invite Code Copy (Requirement 3.2)', () => {
  const mockInviteCode = 'TEST1234'
  const mockWriteText = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
      },
      writable: true,
    })
    
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('FamilyInviteCard copy functionality', () => {
    it('should display correct invite link format', () => {
      render(<FamilyInviteCard inviteCode={mockInviteCode} />)
      
      const input = screen.getByDisplayValue(`http://localhost:3000/join/${mockInviteCode}`)
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('readonly')
    })

    it('should copy invite link to clipboard when copy button is clicked', async () => {
      mockWriteText.mockResolvedValueOnce(undefined)
      
      render(<FamilyInviteCard inviteCode={mockInviteCode} />)
      
      const copyButton = screen.getByRole('button', { name: /sao chép/i })
      fireEvent.click(copyButton)
      
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(`http://localhost:3000/join/${mockInviteCode}`)
        expect(toast.success).toHaveBeenCalledWith('Đã sao chép link mời!')
      })
    })

    it('should show error toast when clipboard copy fails', async () => {
      mockWriteText.mockRejectedValueOnce(new Error('Clipboard permission denied'))
      
      render(<FamilyInviteCard inviteCode={mockInviteCode} />)
      
      const copyButton = screen.getByRole('button', { name: /sao chép/i })
      fireEvent.click(copyButton)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Không thể sao chép link. Vui lòng thử lại.')
      })
    })

    it('should disable button and show loading state while copying', async () => {
      let resolveClipboard: () => void
      const clipboardPromise = new Promise<void>((resolve) => {
        resolveClipboard = resolve
      })
      mockWriteText.mockReturnValueOnce(clipboardPromise)
      
      render(<FamilyInviteCard inviteCode={mockInviteCode} />)
      
      const copyButton = screen.getByRole('button', { name: /sao chép/i })
      fireEvent.click(copyButton)
      
      // Button should be disabled and show loading text
      await waitFor(() => {
        expect(copyButton).toBeDisabled()
        expect(screen.getByText(/đang sao chép/i)).toBeInTheDocument()
      })
      
      // Resolve the clipboard promise
      resolveClipboard!()
      
      // Button should be enabled again
      await waitFor(() => {
        expect(copyButton).not.toBeDisabled()
        expect(screen.getByText(/^sao chép$/i)).toBeInTheDocument()
      })
    })

    it('should handle different invite codes correctly', () => {
      const { rerender } = render(<FamilyInviteCard inviteCode="CODE123" />)
      expect(screen.getByDisplayValue('http://localhost:3000/join/CODE123')).toBeInTheDocument()
      
      rerender(<FamilyInviteCard inviteCode="XYZ789" />)
      expect(screen.getByDisplayValue('http://localhost:3000/join/XYZ789')).toBeInTheDocument()
    })

    it('should display helper text for sharing', () => {
      render(<FamilyInviteCard inviteCode={mockInviteCode} />)
      
      expect(screen.getByText(/chia sẻ link này với các thành viên gia đình/i)).toBeInTheDocument()
    })
  })
})

describe('Family Management - Join with Invalid Code (Requirement 3.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('JoinFamilyPage invalid code handling', () => {
    it('should display error when invite code is not found', async () => {
      const { supabase } = await import('@/lib/supabase')
      
      // Mock authenticated user
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } as any },
        error: null,
      })

      // Mock family query returning null (not found)
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' },
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any)

      render(<JoinFamilyPage />)

      await waitFor(() => {
        expect(screen.getByText(/không tìm thấy nhà/i)).toBeInTheDocument()
        expect(screen.getByText(/mã mời không hợp lệ hoặc đã hết hạn/i)).toBeInTheDocument()
      })
    })

    it('should display error icon when code is invalid', async () => {
      const { supabase } = await import('@/lib/supabase')
      
      // Mock authenticated user
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } as any },
        error: null,
      })

      // Mock family query returning error
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Invalid code' },
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any)

      render(<JoinFamilyPage />)

      await waitFor(() => {
        expect(screen.getByText('❌')).toBeInTheDocument()
      })
    })

    it('should provide button to return to dashboard when code is invalid', async () => {
      const { supabase } = await import('@/lib/supabase')
      const mockPush = vi.fn()
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } as any },
        error: null,
      })

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
        expect(screen.getByText(/về trang chủ/i)).toBeInTheDocument()
      })

      const homeButton = screen.getByRole('button', { name: /về trang chủ/i })
      expect(homeButton).toBeInTheDocument()
    })

    it('should not allow joining when code is invalid', async () => {
      const { supabase } = await import('@/lib/supabase')
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } as any },
        error: null,
      })

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
        expect(screen.getByText(/không tìm thấy nhà/i)).toBeInTheDocument()
      })

      // Should not have a join button
      expect(screen.queryByText(/tham gia nhà/i)).not.toBeInTheDocument()
      
      // Should not call join API
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      const { supabase } = await import('@/lib/supabase')
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } as any },
        error: null,
      })

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockRejectedValue(new Error('Database connection failed'))

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any)

      render(<JoinFamilyPage />)

      await waitFor(() => {
        expect(screen.getByText(/có lỗi xảy ra khi tải thông tin/i)).toBeInTheDocument()
      })
    })
  })

  describe('JoinFamilyPage valid code scenarios', () => {
    it('should display family information when code is valid', async () => {
      const { supabase } = await import('@/lib/supabase')
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } as any },
        error: null,
      })

      const mockFamily = {
        id: 'family-1',
        name: 'Gia đình Test',
        invite_code: 'VALID123',
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
        expect(screen.getByText('Gia đình Test')).toBeInTheDocument()
        expect(screen.getByText(/mã mời: VALID123/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /tham gia nhà/i })).toBeInTheDocument()
      })
    })

    it('should prompt login when user is not authenticated', async () => {
      const { supabase } = await import('@/lib/supabase')
      
      // Mock unauthenticated user
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const mockFamily = {
        id: 'family-1',
        name: 'Gia đình Test',
        invite_code: 'VALID123',
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
        expect(screen.getByText(/bạn cần đăng nhập để tham gia nhà/i)).toBeInTheDocument()
        expect(screen.getByText(/đăng nhập và tham gia/i)).toBeInTheDocument()
      })
    })
  })
})
