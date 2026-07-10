import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn()
  }
}))

describe('NotificationBell', () => {
  const mockUserId = 'user-123'
  const mockNotifications = [
    {
      id: 'notif-1',
      user_id: mockUserId,
      type: 'event_reminder' as const,
      title: 'Sự kiện sắp diễn ra',
      content: 'Sự kiện "Tất niên" sẽ diễn ra vào 30/01/2024',
      link: '/events/event-1',
      read: false,
      created_at: new Date().toISOString()
    },
    {
      id: 'notif-2',
      user_id: mockUserId,
      type: 'task_reminder' as const,
      title: 'Công việc chưa hoàn thành',
      content: '"Mua bánh chưng" trong sự kiện "Tất niên"',
      link: '/events/event-1',
      read: false,
      created_at: new Date().toISOString()
    }
  ]

  let mockChannel: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Mock channel for realtime subscriptions
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis()
    }

    // Mock Supabase methods
    ;(supabase.channel as any).mockReturnValue(mockChannel)
    ;(supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockNotifications,
              error: null
            })
          })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render notification bell button', async () => {
    render(<NotificationBell userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
    })
  })

  it('should display badge with unread count', async () => {
    render(<NotificationBell userId={mockUserId} />)
    
    await waitFor(() => {
      const badge = screen.getByText('2')
      expect(badge).toBeInTheDocument()
    })
  })

  it('should display "9+" when unread count exceeds 9', async () => {
    const manyNotifications = Array.from({ length: 15 }, (_, i) => ({
      ...mockNotifications[0],
      id: `notif-${i}`
    }))

    ;(supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: manyNotifications,
              error: null
            })
          })
        })
      })
    })

    render(<NotificationBell userId={mockUserId} />)
    
    await waitFor(() => {
      const badge = screen.getByText('9+')
      expect(badge).toBeInTheDocument()
    })
  })

  it('should not display badge when no unread notifications', async () => {
    ;(supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })
    })

    render(<NotificationBell userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument()
    })
  })

  it('should open dropdown when bell is clicked', async () => {
    render(<NotificationBell userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
    })

    const bellButton = screen.getByLabelText('Notifications')
    fireEvent.click(bellButton)

    await waitFor(() => {
      expect(screen.getByText('Thông báo')).toBeInTheDocument()
    })
  })

  it('should subscribe to realtime notifications', async () => {
    render(<NotificationBell userId={mockUserId} />)
    
    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledWith(`notifications:${mockUserId}`)
      expect(mockChannel.on).toHaveBeenCalled()
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })
  })

  it('should mark notification as read when clicked', async () => {
    render(<NotificationBell userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
    })

    // Open dropdown
    const bellButton = screen.getByLabelText('Notifications')
    fireEvent.click(bellButton)

    await waitFor(() => {
      expect(screen.getByText('Sự kiện sắp diễn ra')).toBeInTheDocument()
    })

    // Click on notification
    const notification = screen.getByText('Sự kiện sắp diễn ra')
    fireEvent.click(notification.closest('button')!)

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('notifications')
    })
  })

  it('should update badge count when notification is marked as read', async () => {
    render(<NotificationBell userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    // Open dropdown
    const bellButton = screen.getByLabelText('Notifications')
    fireEvent.click(bellButton)

    await waitFor(() => {
      expect(screen.getByText('Sự kiện sắp diễn ra')).toBeInTheDocument()
    })

    // Click on notification to mark as read
    const notification = screen.getByText('Sự kiện sắp diễn ra')
    fireEvent.click(notification.closest('button')!)

    // Badge should update to show 1 unread notification
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  it('should close dropdown when clicking outside', async () => {
    render(<NotificationBell userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
    })

    // Open dropdown
    const bellButton = screen.getByLabelText('Notifications')
    fireEvent.click(bellButton)

    await waitFor(() => {
      expect(screen.getByText('Thông báo')).toBeInTheDocument()
    })

    // Click outside the dropdown
    fireEvent.mouseDown(document.body)

    await waitFor(() => {
      expect(screen.queryByText('Thông báo')).not.toBeInTheDocument()
    })
  })

  it('should handle realtime notification updates', async () => {
    const { act } = await import('@testing-library/react')
    
    render(<NotificationBell userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    // Simulate a new notification via realtime
    const newNotification = {
      id: 'notif-3',
      user_id: mockUserId,
      type: 'event_reminder' as const,
      title: 'Sự kiện mới',
      content: 'Sự kiện mới được tạo',
      link: '/events/event-2',
      read: false,
      created_at: new Date().toISOString()
    }

    // Get the INSERT callback from the mock
    const insertCallback = mockChannel.on.mock.calls.find(
      (call: any) => call[1]?.event === 'INSERT'
    )?.[2]

    if (insertCallback) {
      await act(async () => {
        insertCallback({ new: newNotification })
      })
    }

    // Badge should update to show 3 unread notifications
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  it('should handle error when fetching notifications', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    ;(supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error')
            })
          })
        })
      })
    })

    render(<NotificationBell userId={mockUserId} />)
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching notifications:',
        expect.any(Error)
      )
    })

    consoleErrorSpy.mockRestore()
  })

  it('should handle error when marking notification as read', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    ;(supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockNotifications,
              error: null
            })
          })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: new Error('Update failed')
        })
      })
    })

    render(<NotificationBell userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
    })

    // Open dropdown
    const bellButton = screen.getByLabelText('Notifications')
    fireEvent.click(bellButton)

    await waitFor(() => {
      expect(screen.getByText('Sự kiện sắp diễn ra')).toBeInTheDocument()
    })

    // Click on notification
    const notification = screen.getByText('Sự kiện sắp diễn ra')
    fireEvent.click(notification.closest('button')!)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error marking notification as read:',
        expect.any(Error)
      )
    })

    consoleErrorSpy.mockRestore()
  })
})
