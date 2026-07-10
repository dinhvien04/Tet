import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/notifications', () => ({
  checkAndCreateNotifications: vi.fn(async () => ({
    eventsChecked: 0,
    eventNotificationsCreated: 0,
    taskNotificationsCreated: 0,
  })),
}))

import { GET } from '@/app/api/cron/check-notifications/route'

describe('GET /api/cron/check-notifications', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('returns 503 in production when CRON_SECRET missing', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.CRON_SECRET
    delete process.env.VERCEL_ENV

    const req = new NextRequest('http://localhost/api/cron/check-notifications')
    const res = await GET(req)
    expect(res.status).toBe(503)
  })

  it('returns 401 when Authorization header is wrong', async () => {
    process.env.CRON_SECRET = 'secret-value'
    process.env.NODE_ENV = 'development'

    const req = new NextRequest('http://localhost/api/cron/check-notifications', {
      headers: { authorization: 'Bearer wrong' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('succeeds with correct Bearer token', async () => {
    process.env.CRON_SECRET = 'secret-value'
    process.env.NODE_ENV = 'development'

    const req = new NextRequest('http://localhost/api/cron/check-notifications', {
      headers: { authorization: 'Bearer secret-value' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
