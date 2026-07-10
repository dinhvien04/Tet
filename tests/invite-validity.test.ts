import { describe, it, expect } from 'vitest'
import { isInviteValid, computeInviteExpiry } from '@/lib/invite'

describe('invite validity', () => {
  it('accepts invite without expiry', () => {
    expect(isInviteValid({}).valid).toBe(true)
    expect(isInviteValid({ inviteExpiresAt: null }).valid).toBe(true)
  })

  it('rejects expired invite', () => {
    const past = new Date(Date.now() - 60_000)
    const result = isInviteValid({ inviteExpiresAt: past })
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/hết hạn/i)
  })

  it('accepts future expiry', () => {
    const future = new Date(Date.now() + 86_400_000)
    expect(isInviteValid({ inviteExpiresAt: future }).valid).toBe(true)
  })

  it('computeInviteExpiry returns null for invalid days', () => {
    expect(computeInviteExpiry(null)).toBeNull()
    expect(computeInviteExpiry(0)).toBeNull()
    expect(computeInviteExpiry(-1)).toBeNull()
  })

  it('computeInviteExpiry adds days', () => {
    const exp = computeInviteExpiry(7)
    expect(exp).toBeInstanceOf(Date)
    expect(exp!.getTime()).toBeGreaterThan(Date.now())
  })
})
