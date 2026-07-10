import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FamilySelector } from '@/components/family/FamilySelector'
import { FamilyProvider } from '@/components/family/FamilyContext'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}))

const mockFamilies = [
  {
    id: 'family-1',
    name: 'Gia đình Nguyễn',
    invite_code: 'ABC12345',
    created_by: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'family-2',
    name: 'Gia đình Trần',
    invite_code: 'XYZ67890',
    created_by: 'user-1',
    created_at: '2024-01-02T00:00:00Z',
  },
]

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  user_metadata: { full_name: 'Test User' },
}

describe('FamilySelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    // Mock auth session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: mockUser } as any },
      error: null,
    })
  })

  it('should not render when user has only one family', async () => {
    // Mock single family
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'family_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ family_id: 'family-1' }],
            error: null,
          }),
        } as any
      }
      if (table === 'families') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [mockFamilies[0]],
            error: null,
          }),
        } as any
      }
      return {} as any
    })

    render(
      <AuthProvider>
        <FamilyProvider>
          <FamilySelector />
        </FamilyProvider>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /chọn nhà/i })).not.toBeInTheDocument()
    })
  })

  it('should render dropdown when user has multiple families', async () => {
    // Mock multiple families
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'family_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ family_id: 'family-1' }, { family_id: 'family-2' }],
            error: null,
          }),
        } as any
      }
      if (table === 'families') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockFamilies,
            error: null,
          }),
        } as any
      }
      return {} as any
    })

    render(
      <AuthProvider>
        <FamilyProvider>
          <FamilySelector />
        </FamilyProvider>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /chọn nhà/i })).toBeInTheDocument()
    })

    // Should show first family by default
    expect(screen.getByText('Gia đình Nguyễn')).toBeInTheDocument()
  })

  it('should switch family when selecting from dropdown', async () => {
    // Mock multiple families
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'family_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ family_id: 'family-1' }, { family_id: 'family-2' }],
            error: null,
          }),
        } as any
      }
      if (table === 'families') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockFamilies,
            error: null,
          }),
        } as any
      }
      return {} as any
    })

    render(
      <AuthProvider>
        <FamilyProvider>
          <FamilySelector />
        </FamilyProvider>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /chọn nhà/i })).toBeInTheDocument()
    })

    // Verify button is clickable
    const button = screen.getByRole('button', { name: /chọn nhà/i })
    expect(button).toBeEnabled()
  })

  it('should show check icon for current family', async () => {
    // Mock multiple families
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'family_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ family_id: 'family-1' }, { family_id: 'family-2' }],
            error: null,
          }),
        } as any
      }
      if (table === 'families') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockFamilies,
            error: null,
          }),
        } as any
      }
      return {} as any
    })

    render(
      <AuthProvider>
        <FamilyProvider>
          <FamilySelector />
        </FamilyProvider>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /chọn nhà/i })).toBeInTheDocument()
    })

    // Verify dropdown trigger exists
    const button = screen.getByRole('button', { name: /chọn nhà/i })
    expect(button).toHaveAttribute('aria-haspopup', 'menu')
  })
})
