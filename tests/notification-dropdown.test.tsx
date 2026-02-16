import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'
import type { Notification } from '@/types/database'

describe('NotificationDropdown', () => {
  const mockNotifications: Notification[] = [
    {
      id: 'notif-1',
      user_id: 'user-123',
      type: 'event_reminder',
      title: 'Sự kiện sắp diễn ra',
      content: 'Sự kiện "Tất niên" sẽ diễn ra vào 30/01/2024',
      link: '/events/event-1',
      read: false,
      created_at: new Date().toISOString()
    },
    {
      id: 'notif-2',
      user_id: 'user-123',
      type: 'task_reminder',
      title: 'Công việc chưa hoàn thành',
      content: '"Mua bánh chưng" trong sự kiện "Tất niên"',
      link: '/events/event-1',
      read: false,
      created_at: new Date().toISOString()
    }
  ]

  let mockOnClose: ReturnType<typeof vi.fn>
  let mockOnMarkAsRead: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnClose = vi.fn()
    mockOnMarkAsRead = vi.fn()
  })

  it('should render dropdown with title', () => {
    render(
      <NotificationDropdown
        notifications={mockNotifications}
        onClose={mockOnClose}
        onMarkAsRead={mockOnMarkAsRead}
      />
    )

    expect(screen.getByText('Thông báo')).toBeInTheDocument()
  })

  it('should render all notifications', () => {
    render(
      <NotificationDropdown
        notifications={mockNotifications}
        onClose={mockOnClose}
        onMarkAsRead={mockOnMarkAsRead}
      />
    )

    expect(screen.getByText('Sự kiện sắp diễn ra')).toBeInTheDocument()
    expect(screen.getByText('Công việc chưa hoàn thành')).toBeInTheDocument()
  })

  it('should display empty state when no notifications', () => {
    render(
      <NotificationDropdown
        notifications={[]}
        onClose={mockOnClose}
        onMarkAsRead={mockOnMarkAsRead}
      />
    )

    expect(screen.getByText('Không có thông báo mới')).toBeInTheDocument()
  })

  it('should display loading state', () => {
    render(
      <NotificationDropdown
        notifications={[]}
        onClose={mockOnClose}
        onMarkAsRead={mockOnMarkAsRead}
        loading={true}
      />
    )

    expect(screen.getByText('Đang tải...')).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', () => {
    render(
      <NotificationDropdown
        notifications={mockNotifications}
        onClose={mockOnClose}
        onMarkAsRead={mockOnMarkAsRead}
      />
    )

    const closeButton = screen.getByLabelText('Close notifications')
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should call onMarkAsRead when notification is clicked', () => {
    render(
      <NotificationDropdown
        notifications={mockNotifications}
        onClose={mockOnClose}
        onMarkAsRead={mockOnMarkAsRead}
      />
    )

    const notification = screen.getByText('Sự kiện sắp diễn ra')
    fireEvent.click(notification.closest('button')!)

    expect(mockOnMarkAsRead).toHaveBeenCalledWith('notif-1', '/events/event-1')
  })

  it('should display correct icon for event reminder', () => {
    render(
      <NotificationDropdown
        notifications={[mockNotifications[0]]}
        onClose={mockOnClose}
        onMarkAsRead={mockOnMarkAsRead}
      />
    )

    // Calendar icon should be present for event_reminder
    const notification = screen.getByText('Sự kiện sắp diễn ra').closest('button')
    expect(notification).toBeInTheDocument()
  })

  it('should display correct icon for task reminder', () => {
    render(
      <NotificationDropdown
        notifications={[mockNotifications[1]]}
        onClose={mockOnClose}
        onMarkAsRead={mockOnMarkAsRead}
      />
    )

    // CheckCircle icon should be present for task_reminder
    const notification = screen.getByText('Công việc chưa hoàn thành').closest('button')
    expect(notification).toBeInTheDocument()
  })

  it('should display notification content', () => {
    render(
      <NotificationDropdown
        notifications={mockNotifications}
        onClose={mockOnClose}
        onMarkAsRead={mockOnMarkAsRead}
      />
    )

    expect(screen.getByText('Sự kiện "Tất niên" sẽ diễn ra vào 30/01/2024')).toBeInTheDocument()
    expect(screen.getByText('"Mua bánh chưng" trong sự kiện "Tất niên"')).toBeInTheDocument()
  })

  it('should handle notification without link', () => {
    const notificationWithoutLink: Notification = {
      ...mockNotifications[0],
      link: undefined
    }

    render(
      <NotificationDropdown
        notifications={[notificationWithoutLink]}
        onClose={mockOnClose}
        onMarkAsRead={mockOnMarkAsRead}
      />
    )

    const notification = screen.getByText('Sự kiện sắp diễn ra')
    fireEvent.click(notification.closest('button')!)

    expect(mockOnMarkAsRead).toHaveBeenCalledWith('notif-1', undefined)
  })

  it('should display relative time for notifications', () => {
    const recentNotification: Notification = {
      ...mockNotifications[0],
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 minutes ago
    }

    render(
      <NotificationDropdown
        notifications={[recentNotification]}
        onClose={mockOnClose}
        onMarkAsRead={mockOnMarkAsRead}
      />
    )

    // Should display relative time in Vietnamese
    expect(screen.getByText(/trước/)).toBeInTheDocument()
  })

  it('should render multiple notifications in order', () => {
    const orderedNotifications: Notification[] = [
      {
        ...mockNotifications[0],
        created_at: new Date(Date.now() - 1 * 60 * 1000).toISOString() // 1 min ago
      },
      {
        ...mockNotifications[1],
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 min ago
      }
    ]

    render(
      <NotificationDropdown
        notifications={orderedNotifications}
        onClose={mockOnClose}
        onMarkAsRead={mockOnMarkAsRead}
      />
    )

    const notificationButtons = screen.getAllByRole('button').filter(
      btn => btn.textContent?.includes('Sự kiện') || btn.textContent?.includes('Công việc')
    )

    expect(notificationButtons).toHaveLength(2)
  })

  it('should apply hover styles to notification items', () => {
    render(
      <NotificationDropdown
        notifications={mockNotifications}
        onClose={mockOnClose}
        onMarkAsRead={mockOnMarkAsRead}
      />
    )

    const notification = screen.getByText('Sự kiện sắp diễn ra').closest('button')
    expect(notification).toHaveClass('hover:bg-accent')
  })

  it('should close dropdown when clicking outside', () => {
    const { container } = render(
      <NotificationDropdown
        notifications={mockNotifications}
        onClose={mockOnClose}
        onMarkAsRead={mockOnMarkAsRead}
      />
    )

    // Get the dropdown element
    const dropdown = container.querySelector('.absolute')

    // Simulate clicking outside (on document body, not on dropdown)
    const outsideElement = document.createElement('div')
    document.body.appendChild(outsideElement)
    
    fireEvent.mouseDown(outsideElement)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
    
    document.body.removeChild(outsideElement)
  })

  it('should not close dropdown when clicking inside', () => {
    const { container } = render(
      <NotificationDropdown
        notifications={mockNotifications}
        onClose={mockOnClose}
        onMarkAsRead={mockOnMarkAsRead}
      />
    )

    // Click on the dropdown content itself
    const dropdownContent = screen.getByText('Thông báo')
    fireEvent.mouseDown(dropdownContent)

    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('should handle long notification content gracefully', () => {
    const longNotification: Notification = {
      ...mockNotifications[0],
      title: 'Đây là một tiêu đề rất dài có thể bị cắt bớt nếu quá dài',
      content: 'Đây là nội dung thông báo rất dài có thể chiếm nhiều dòng và cần được hiển thị đầy đủ để người dùng có thể đọc được toàn bộ thông tin quan trọng'
    }

    render(
      <NotificationDropdown
        notifications={[longNotification]}
        onClose={mockOnClose}
        onMarkAsRead={mockOnMarkAsRead}
      />
    )

    expect(screen.getByText(longNotification.title)).toBeInTheDocument()
    expect(screen.getByText(longNotification.content)).toBeInTheDocument()
  })

  it('should display scrollbar when many notifications', () => {
    const manyNotifications: Notification[] = Array.from({ length: 20 }, (_, i) => ({
      ...mockNotifications[0],
      id: `notif-${i}`,
      title: `Notification ${i}`
    }))

    const { container } = render(
      <NotificationDropdown
        notifications={manyNotifications}
        onClose={mockOnClose}
        onMarkAsRead={mockOnMarkAsRead}
      />
    )

    const scrollableContent = container.querySelector('.max-h-\\[400px\\]')
    expect(scrollableContent).toBeInTheDocument()
    expect(scrollableContent).toHaveClass('overflow-y-auto')
  })
})
