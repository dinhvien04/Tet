import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn(async () => ({})),
}))

vi.mock('@/lib/models/AuditEvent', () => ({
  default: {
    create: (...a: unknown[]) => mockCreate(...a),
  },
}))

import { writeAuditEvent } from '@/lib/audit'
import { getOrCreateRequestId, REQUEST_ID_HEADER } from '@/lib/request-id'

describe('writeAuditEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({})
  })

  it('persists sanitized metadata', async () => {
    await writeAuditEvent({
      actorId: '507f1f77bcf86cd799439011',
      action: 'admin.role_change',
      metadata: {
        from: 'user',
        to: 'admin',
        password: 'secret',
        inviteCode: 'ABC123',
        token: 'tok',
      },
    })
    expect(mockCreate).toHaveBeenCalled()
    const arg = mockCreate.mock.calls[0][0]
    expect(arg.action).toBe('admin.role_change')
    expect(arg.metadata).toEqual({ from: 'user', to: 'admin' })
    expect(arg.metadata.password).toBeUndefined()
    expect(arg.metadata.inviteCode).toBeUndefined()
  })

  it('swallows DB errors', async () => {
    mockCreate.mockRejectedValueOnce(new Error('db down'))
    await expect(
      writeAuditEvent({ action: 'test.event' })
    ).resolves.toBeUndefined()
  })
})

describe('request id', () => {
  it('reuses valid incoming header', () => {
    const req = new Request('http://localhost/x', {
      headers: { [REQUEST_ID_HEADER]: 'abc12345-valid' },
    })
    expect(getOrCreateRequestId(req)).toBe('abc12345-valid')
  })

  it('generates uuid when missing', () => {
    const id = getOrCreateRequestId(new Request('http://localhost/x'))
    expect(id.length).toBeGreaterThanOrEqual(8)
  })
})
