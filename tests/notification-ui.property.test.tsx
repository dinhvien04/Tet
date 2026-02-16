import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import fc from 'fast-check'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types/database'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn()
  }
}))

describe('Notification UI Property Tests', () => {
  const mockUserId = 'test-user-123'
  let mockChannel: any

  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()

    // Mock channel for realtime subscriptions
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis()
    }

    ;(supabase.channel as any).mockReturnValue(mockChannel)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('Property 19: Unread Notification Count - displayed count must equal actual unread notifications', async () => {
    // Feature: tet-connect, Property 19: Unread Notification Count
    // **Validates: Requirements 9.4**

    await fc.assert(
      fc.asyncProperty(
        // Generate count of unread notifications
        fc.integer({ min: 0, max: 15 }),
        async (unreadCount) => {
          // Create unread notifications
          const unreadNotifications: Notification[] = Array.from(
            { length: unreadCount },
            (_, i) => ({
              id: `notif-${i}`,
              user_id: mockUserId,
              type: 'event_reminder' as const,
              title: `Notification ${i}`,
              content: `Content ${i}`,
              link: `/events/${i}`,
              read: false,
              created_at: new Date().toISOString()
            })
          )

          // Mock Supabase to return unread notifications
          const mockFrom = {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: unreadNotifications,
                    error: null
                  })
                })
              })
            })
          }

          ;(supabase.from as any).mockReturnValue(mockFrom)

          // Render component
          const { container, unmount } = render(<NotificationBell userId={mockUserId} />)

          try {
            // Wait for notifications to load
            await waitFor(
              () => {
                expect(mockFrom.select).toHaveBeenCalled()
              },
              { timeout: 1000 }
            )

            // Verify the displayed count matches expected count
            if (unreadCount === 0) {
              // No badge should be displayed
              const badge = container.querySelector('.absolute.-top-1.-right-1')
              expect(badge).toBeNull()
            } else if (unreadCount <= 9) {
              // Badge should show exact count
              await waitFor(
                () => {
                  const badge = container.querySelector('.absolute.-top-1.-right-1')
                  expect(badge).not.toBeNull()
                  expect(badge?.textContent).toBe(unreadCount.toString())
                },
                { timeout: 1000 }
              )
            } else {
              // Badge should show "9+"
              await waitFor(
                () => {
                  const badge = container.querySelector('.absolute.-top-1.-right-1')
                  expect(badge).not.toBeNull()
                  expect(badge?.textContent).toBe('9+')
                },
                { timeout: 1000 }
              )
            }
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)

  it('Property 20: Notification Mark as Read - clicking notification must mark it as read', async () => {
    // Feature: tet-connect, Property 20: Notification Mark as Read
    // **Validates: Requirements 9.5**

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          type: fc.constantFrom('event_reminder', 'task_reminder'),
          title: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length >= 5),
          content: fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length >= 5),
          link: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null })
        }),
        async (notificationData) => {
          // Create unread notification
          const notification: Notification = {
            id: notificationData.id,
            user_id: mockUserId,
            type: notificationData.type as 'event_reminder' | 'task_reminder',
            title: notificationData.title.trim(),
            content: notificationData.content.trim(),
            link: notificationData.link || undefined,
            read: false,
            created_at: new Date().toISOString()
          }

          // Track update calls
          let updateCalled = false
          let updateReadValue: boolean | undefined
          let updateIdValue: string | undefined

          const mockEq = vi.fn((field: string, value: any) => {
            if (field === 'id') {
              updateIdValue = value
            }
            return Promise.resolve({ error: null })
          })

          const mockUpdate = vi.fn((data: any) => {
            updateCalled = true
            updateReadValue = data.read
            return { eq: mockEq }
          })

          // Mock Supabase methods
          const mockFrom = {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [notification],
                    error: null
                  })
                })
              })
            }),
            update: mockUpdate
          }

          ;(supabase.from as any).mockReturnValue(mockFrom)

          // Render component
          const { unmount, container } = render(<NotificationBell userId={mockUserId} />)

          try {
            // Wait for notifications to load
            await waitFor(
              () => {
                expect(screen.queryByLabelText('Notifications')).toBeInTheDocument()
              },
              { timeout: 1000 }
            )

            // Open dropdown
            const bellButton = screen.getByLabelText('Notifications')
            fireEvent.click(bellButton)

            // Wait for dropdown to appear and find notification by content
            await waitFor(
              () => {
                const notificationButtons = container.querySelectorAll('.space-y-2 button')
                expect(notificationButtons.length).toBeGreaterThan(0)
              },
              { timeout: 1000 }
            )

            // Find and click the notification button
            const notificationButtons = container.querySelectorAll('.space-y-2 button')
            expect(notificationButtons.length).toBe(1)
            fireEvent.click(notificationButtons[0])

            // Verify update was called with read: true
            await waitFor(
              () => {
                expect(updateCalled).toBe(true)
                expect(updateReadValue).toBe(true)
                expect(updateIdValue).toBe(notification.id)
              },
              { timeout: 1000 }
            )
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)

  it('Property 19 Edge Case: Count accuracy with only unread notifications', async () => {
    // Feature: tet-connect, Property 19: Unread Notification Count
    // **Validates: Requirements 9.4**
    // Edge case: Verify count is accurate across different ranges

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 20 }),
        async (count) => {
          // Create notifications
          const notifications: Notification[] = Array.from({ length: count }, (_, i) => ({
            id: `notif-${i}`,
            user_id: mockUserId,
            type: 'event_reminder' as const,
            title: `Notification ${i}`,
            content: `Content ${i}`,
            link: `/events/${i}`,
            read: false,
            created_at: new Date().toISOString()
          }))

          // Mock Supabase
          const mockFrom = {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: notifications,
                    error: null
                  })
                })
              })
            })
          }

          ;(supabase.from as any).mockReturnValue(mockFrom)

          // Render component
          const { container, unmount } = render(<NotificationBell userId={mockUserId} />)

          try {
            await waitFor(() => {
              expect(mockFrom.select).toHaveBeenCalled()
            }, { timeout: 1000 })

            // Verify count display
            const badge = container.querySelector('.absolute.-top-1.-right-1')
            
            if (count === 0) {
              expect(badge).toBeNull()
            } else if (count <= 9) {
              expect(badge).not.toBeNull()
              expect(badge?.textContent).toBe(count.toString())
            } else {
              expect(badge).not.toBeNull()
              expect(badge?.textContent).toBe('9+')
            }
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)
})
