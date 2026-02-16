/**
 * Unit tests for authentication flow
 * Tests: Login button render, OAuth redirect, Session persistence
 * Requirements: 1.1, 1.2, 1.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginButton } from '@/components/auth/LoginButton'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

describe('Auth Flow - Login Button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock for useSearchParams
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    } as any)
  })

  it('should render login button with Google text', () => {
    render(<LoginButton />)
    
    const button = screen.getByRole('button', { name: /đăng nhập bằng google/i })
    expect(button).toBeDefined()
  })

  it('should render Google logo in button', () => {
    const { container } = render(<LoginButton />)
    
    // Check for SVG with Google colors
    const svg = container.querySelector('svg')
    expect(svg).toBeDefined()
  })

  it('should be enabled by default', () => {
    render(<LoginButton />)
    
    const button = screen.getByRole('button', { name: /đăng nhập bằng google/i })
    expect(button.hasAttribute('disabled')).toBe(false)
  })

  it('should show loading state when clicked', async () => {
    // Mock signInWithOAuth to delay
    vi.mocked(supabase.auth.signInWithOAuth).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: { url: 'test' }, error: null }), 100))
    )

    render(<LoginButton />)
    
    const button = screen.getByRole('button', { name: /đăng nhập bằng google/i })
    fireEvent.click(button)

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/đang xử lý/i)).toBeDefined()
    })

    // Button should be disabled during loading
    expect(button.hasAttribute('disabled')).toBe(true)
  })

  it('should call signInWithOAuth when clicked', async () => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: 'https://accounts.google.com/oauth' },
      error: null,
    } as any)

    render(<LoginButton />)
    
    const button = screen.getByRole('button', { name: /đăng nhập bằng google/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/auth/callback'),
        },
      })
    })
  })

  it('should include redirect parameter in callback URL when present', async () => {
    // Mock redirect parameter
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn((key) => key === 'redirect' ? '/dashboard' : null),
    } as any)

    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: 'https://accounts.google.com/oauth' },
      error: null,
    } as any)

    render(<LoginButton />)
    
    const button = screen.getByRole('button', { name: /đăng nhập bằng google/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('redirect=%2Fdashboard'),
        },
      })
    })
  })

  it('should handle OAuth error gracefully', async () => {
    // Mock window.alert
    const alertMock = vi.fn()
    global.alert = alertMock
    
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: null, url: null },
      error: { message: 'OAuth failed', name: 'AuthError', status: 400 },
    } as any)

    render(<LoginButton />)
    
    const button = screen.getByRole('button', { name: /đăng nhập bằng google/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Đăng nhập thất bại. Vui lòng thử lại.')
    })

    // Button should be enabled again after error
    expect(button.hasAttribute('disabled')).toBe(false)
  })

  it('should handle unexpected errors', async () => {
    // Mock window.alert and console.error
    const alertMock = vi.fn()
    const consoleErrorMock = vi.fn()
    global.alert = alertMock
    const originalConsoleError = console.error
    console.error = consoleErrorMock
    
    vi.mocked(supabase.auth.signInWithOAuth).mockRejectedValue(new Error('Network error'))

    render(<LoginButton />)
    
    const button = screen.getByRole('button', { name: /đăng nhập bằng google/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Có lỗi xảy ra. Vui lòng thử lại.')
    })

    expect(consoleErrorMock).toHaveBeenCalled()
    
    // Restore console.error
    console.error = originalConsoleError
  })
})

describe('Auth Flow - OAuth Redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    } as any)
  })

  it('should redirect to Google OAuth URL', async () => {
    const mockOAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test'
    
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: mockOAuthUrl },
      error: null,
    } as any)

    render(<LoginButton />)
    
    const button = screen.getByRole('button', { name: /đăng nhập bằng google/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalled()
    })

    // Verify OAuth was called with correct provider
    const callArgs = vi.mocked(supabase.auth.signInWithOAuth).mock.calls[0][0]
    expect(callArgs.provider).toBe('google')
  })

  it('should include callback URL in OAuth options', async () => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: 'test-url' },
      error: null,
    } as any)

    render(<LoginButton />)
    
    const button = screen.getByRole('button', { name: /đăng nhập bằng google/i })
    fireEvent.click(button)

    await waitFor(() => {
      const callArgs = vi.mocked(supabase.auth.signInWithOAuth).mock.calls[0][0]
      expect(callArgs.options?.redirectTo).toContain('/auth/callback')
    })
  })
})

describe('Auth Flow - Session Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should persist session after successful login', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    }

    const mockSession = {
      user: mockUser,
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
    }

    // Mock getSession to return a session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null,
    })

    const unsubscribeMock = vi.fn()
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
    } as any)

    const TestComponent = () => {
      const { user, session, loading } = useAuth()
      
      if (loading) return <div>Loading...</div>
      if (!user) return <div>No user</div>
      
      return (
        <div>
          <div data-testid="user-email">{user.email}</div>
          <div data-testid="user-name">{user.user_metadata.full_name}</div>
          <div data-testid="has-session">{session ? 'yes' : 'no'}</div>
        </div>
      )
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).toBeNull()
    })

    // Verify user data is available
    expect(screen.getByTestId('user-email').textContent).toBe('test@example.com')
    expect(screen.getByTestId('user-name').textContent).toBe('Test User')
    expect(screen.getByTestId('has-session').textContent).toBe('yes')
  })

  it('should maintain session across component remounts', async () => {
    const mockSession = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
      access_token: 'test-token',
    }

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null,
    })

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    } as any)

    const TestComponent = () => {
      const { user } = useAuth()
      return <div data-testid="user-id">{user?.id || 'no-user'}</div>
    }

    const { unmount, rerender } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user-id').textContent).toBe('test-user-id')
    })

    // Unmount and remount
    unmount()
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Session should be fetched again
    await waitFor(() => {
      expect(screen.getByTestId('user-id').textContent).toBe('test-user-id')
    })

    expect(supabase.auth.getSession).toHaveBeenCalledTimes(2)
  })

  it('should clear session on sign out', async () => {
    const mockSession = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
      access_token: 'test-token',
    }

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null,
    })

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    } as any)

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    })

    const TestComponent = () => {
      const { user, signOut } = useAuth()
      
      return (
        <div>
          <div data-testid="user-status">{user ? 'logged-in' : 'logged-out'}</div>
          <button onClick={signOut}>Sign Out</button>
        </div>
      )
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for initial session
    await waitFor(() => {
      expect(screen.getByTestId('user-status').textContent).toBe('logged-in')
    })

    // Click sign out
    const signOutButton = screen.getByRole('button', { name: /sign out/i })
    fireEvent.click(signOutButton)

    // Wait for sign out to complete
    await waitFor(() => {
      expect(screen.getByTestId('user-status').textContent).toBe('logged-out')
    })

    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('should handle no session gracefully', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    } as any)

    const TestComponent = () => {
      const { user, loading } = useAuth()
      
      if (loading) return <div>Loading...</div>
      
      return <div data-testid="user-status">{user ? 'has-user' : 'no-user'}</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).toBeNull()
    })

    expect(screen.getByTestId('user-status').textContent).toBe('no-user')
  })
})

describe('Auth Flow - Protected Routes', () => {
  const mockPush = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any)
  })

  it('should redirect to login when user is not authenticated', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    } as any)

    // Mock window.location.pathname
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/dashboard',
      },
      writable: true,
    })

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/login?redirect=')
      )
    })
  })

  it('should render children when user is authenticated', async () => {
    const mockSession = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
      access_token: 'test-token',
    }

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null,
    })

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    } as any)

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeDefined()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should show loading state while checking authentication', () => {
    vi.mocked(supabase.auth.getSession).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: { session: null }, error: null }), 100))
    )

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    } as any)

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    )

    // Should show loading state
    expect(screen.getByText(/đang tải/i)).toBeDefined()
  })

  it('should use custom redirect path when provided', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    } as any)

    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/admin',
      },
      writable: true,
    })

    render(
      <AuthProvider>
        <ProtectedRoute redirectTo="/custom-login">
          <div>Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/custom-login?redirect=')
      )
    })
  })
})
