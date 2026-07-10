import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockConnectDB = vi.hoisted(() => vi.fn())
const mockCommand = vi.hoisted(() => vi.fn())

vi.mock('@/lib/mongodb', () => ({
  connectDB: () => mockConnectDB(),
}))

vi.mock('mongoose', () => ({
  default: {
    connection: {
      db: {
        admin: () => ({
          command: (...a: unknown[]) => mockCommand(...a),
        }),
      },
    },
  },
}))

import { GET as live } from '@/app/api/health/route'
import { GET as ready } from '@/app/api/health/ready/route'
import { GET as diagnostics } from '@/app/api/health/diagnostics/route'
import { NextRequest } from 'next/server'

describe('GET /api/health (live)', () => {
  it('returns minimal ok without DB', async () => {
    const res = await live()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ status: 'ok' })
    expect(data).not.toHaveProperty('NODE_ENV')
    expect(mockConnectDB).not.toHaveBeenCalled()
  })
})

describe('GET /api/health/ready', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns ok when DB pings', async () => {
    mockConnectDB.mockResolvedValue({})
    mockCommand.mockResolvedValue({ ok: 1 })
    const res = await ready()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })

  it('returns generic error on DB failure (no leak)', async () => {
    mockConnectDB.mockRejectedValue(new Error('ECONNREFUSED secret-host:27017'))
    const res = await ready()
    expect(res.status).toBe(503)
    const data = await res.json()
    expect(data).toEqual({ status: 'error' })
    expect(JSON.stringify(data)).not.toContain('secret-host')
    expect(JSON.stringify(data)).not.toContain('ECONNREFUSED')
  })
})

describe('GET /api/health/diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.HEALTH_DIAGNOSTICS_TOKEN
    delete process.env.CRON_SECRET
    delete process.env.INTERNAL_HEALTH_TOKEN
  })

  it('rejects without token', async () => {
    const res = await diagnostics(
      new NextRequest('http://localhost/api/health/diagnostics')
    )
    expect(res.status).toBe(401)
  })

  it('rejects wrong bearer', async () => {
    process.env.HEALTH_DIAGNOSTICS_TOKEN = 'correct-token'
    const res = await diagnostics(
      new NextRequest('http://localhost/api/health/diagnostics', {
        headers: { authorization: 'Bearer wrong' },
      })
    )
    expect(res.status).toBe(401)
  })

  it('returns checks with valid token (no connection string)', async () => {
    process.env.HEALTH_DIAGNOSTICS_TOKEN = 'correct-token'
    mockConnectDB.mockResolvedValue({})
    mockCommand.mockImplementation(async (cmd: { ping?: number; replSetGetStatus?: number }) => {
      if (cmd.ping) return { ok: 1 }
      if (cmd.replSetGetStatus) return { ok: 1 }
      return { ok: 1 }
    })

    const res = await diagnostics(
      new NextRequest('http://localhost/api/health/diagnostics', {
        headers: { authorization: 'Bearer correct-token' },
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.checks.database).toBe('ok')
    expect(JSON.stringify(data)).not.toMatch(/mongodb(\+srv)?:\/\//i)
    expect(data.runtime).not.toHaveProperty('mongodbUri')
  })
})
