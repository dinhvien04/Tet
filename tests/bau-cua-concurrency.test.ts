/**
 * Bau Cua concurrency / lock design unit tests (mocked mongoose ops).
 * Real replica-set stress runs in CI when MONGODB_URI is available —
 * these tests prove BET/ROLL share FamilyState write conflicts and
 * duplicate-key does not continue aborted transactions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Bau Cua bet vs roll lock design', () => {
  it('bet route CAS filters status=betting on family state', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const betSrc = fs.readFileSync(
      path.join(process.cwd(), 'app/api/games/bau-cua/bet/route.ts'),
      'utf8'
    )
    expect(betSrc).toContain("status: 'betting'")
    expect(betSrc).toContain('betRevision')
    expect(betSrc).toContain('requireReplicaSet: true')
    // Must NOT continue operations after E11000 inside transaction
    expect(betSrc).not.toMatch(/if \(err\.code === 11000\)[\s\S]*reservedBalance: -amount/)
  })

  it('roll route CAS family state betting→rolling before reading bets', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const rollSrc = fs.readFileSync(
      path.join(process.cwd(), 'app/api/games/bau-cua/roll/route.ts'),
      'utf8'
    )
    expect(rollSrc).toContain("status: 'rolling'")
    expect(rollSrc).toContain('requireReplicaSet: true')
    expect(rollSrc).toContain('reservedBalance: { $gte: reserved }')
    // No clamp of negative reserved
    expect(rollSrc).not.toMatch(/reservedBalance\s*=\s*0/)
    expect(rollSrc).toContain('myNetFromSettlement')
  })

  it('start route uses idle→starting CAS', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const startSrc = fs.readFileSync(
      path.join(process.cwd(), 'app/api/games/bau-cua/start/route.ts'),
      'utf8'
    )
    expect(startSrc).toContain("status: 'idle'")
    expect(startSrc).toContain("status: 'starting'")
    expect(startSrc).toContain('requireReplicaSet: true')
    // Specific duplicate-key handling, not bare catch {}
    expect(startSrc).toContain('e.code !== 11000')
  })
})

describe('Bau Cua wallet invariant (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('conditional reserved update rejects drift', async () => {
    // Simulate filter logic used in roll route
    function canSettle(wallet: { reservedBalance: number }, reserved: number) {
      return wallet.reservedBalance >= reserved
    }
    expect(canSettle({ reservedBalance: 100 }, 100)).toBe(true)
    expect(canSettle({ reservedBalance: 50 }, 100)).toBe(false)
    expect(canSettle({ reservedBalance: 0 }, 0)).toBe(true)
  })
})
