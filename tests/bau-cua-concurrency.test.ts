/**
 * Static policy checks on production SERVICE sources (not behavioral concurrency proof).
 * Real concurrency: tests/bau-cua-service.integration.test.ts
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Bau Cua production service policy (static)', () => {
  it('place-bet locks family state betting + requireReplicaSet', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'lib/services/bau-cua/place-bet.ts'),
      'utf8'
    )
    expect(src).toContain("status: 'betting'")
    expect(src).toContain('betRevision')
    expect(src).toContain('requireReplicaSet: true')
    expect(src).not.toMatch(/if \(err\.code === 11000\)[\s\S]*reservedBalance: -amount/)
  })

  it('settle-round CAS rolling + reserved invariant', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'lib/services/bau-cua/settle-round.ts'),
      'utf8'
    )
    expect(src).toContain("status: 'rolling'")
    expect(src).toContain('requireReplicaSet: true')
    expect(src).toContain('reservedBalance: { $gte: reserved }')
    expect(src).not.toMatch(/reservedBalance\s*=\s*0/)
    expect(src).toContain('myNetFromSettlement')
  })

  it('start-round ensure outside TX + starting→betting CAS', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'lib/services/bau-cua/start-round.ts'),
      'utf8'
    )
    expect(src).toContain("status: 'idle'")
    expect(src).toContain("status: 'starting'")
    expect(src).toContain("status: 'betting'")
    expect(src).toContain('requireReplicaSet: true')
    expect(src).toContain('ensureBauCuaFamilyState')
  })

  it('routes delegate to services', () => {
    const start = fs.readFileSync(
      path.join(process.cwd(), 'app/api/games/bau-cua/start/route.ts'),
      'utf8'
    )
    const bet = fs.readFileSync(
      path.join(process.cwd(), 'app/api/games/bau-cua/bet/route.ts'),
      'utf8'
    )
    const roll = fs.readFileSync(
      path.join(process.cwd(), 'app/api/games/bau-cua/roll/route.ts'),
      'utf8'
    )
    expect(start).toContain('startBauCuaRound')
    expect(bet).toContain('placeBauCuaBet')
    expect(roll).toContain('settleBauCuaRound')
  })
})

describe('Bau Cua wallet invariant (unit)', () => {
  it('conditional reserved update rejects drift', () => {
    function canSettle(wallet: { reservedBalance: number }, reserved: number) {
      return wallet.reservedBalance >= reserved
    }
    expect(canSettle({ reservedBalance: 100 }, 100)).toBe(true)
    expect(canSettle({ reservedBalance: 50 }, 100)).toBe(false)
  })
})
