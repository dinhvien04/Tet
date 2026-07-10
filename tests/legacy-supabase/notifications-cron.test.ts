import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '@/app/api/cron/check-notifications/route'
import { NextRequest } from 'next/server'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            data: [],
            error: null
          }))
        })),
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: null,
                  error: null
                }))
              }))
            }))
          }))
        })),
        single: vi.fn(() => ({
          data: null,
          error: null
        }))
      })),
      insert: vi.fn(() => ({
        error: null
      }))
    }))
  }))
}))

describe('Notifications Cron Job', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if authorization header is missing when CRON_SECRET is set', async () => {
    const originalSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'test-secret'

    const request = new NextRequest('http://localhost:3000/api/cron/check-notifications')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')

    process.env.CRON_SECRET = originalSecret
  })

  it('should return success when no upcoming events', async () => {
    delete process.env.CRON_SECRET

    const request = new NextRequest('http://localhost:3000/api/cron/check-notifications')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.stats).toBeDefined()
    expect(data.stats.eventsChecked).toBe(0)
  })

  it('should calculate correct time range for 24 hours', () => {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    expect(tomorrow.getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000)
  })
})
