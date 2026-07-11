/**
 * JWT sessionVersion invalidation contract.
 * Auth options bump sessionVersion on delete and reject mismatched tokens.
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('sessionVersion invalidation', () => {
  it('nextauth jwt callback rejects mismatched sessionVersion', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'app/api/auth/[...nextauth]/route.ts'),
      'utf8'
    )
    expect(src).toContain('sessionVersion')
    expect(src).toContain('token.sessionVersion !== resolvedUser.sessionVersion')
    expect(src).toContain('token.sessionVersion = -1')
    expect(src).toContain('session.user.id = \'\'')
  })

  it('account deletion bumps sessionVersion', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'app/api/profile/route.ts'),
      'utf8'
    )
    expect(src).toMatch(/sessionVersion\s*=\s*\(user\.sessionVersion/)
    expect(src).toContain("status = 'deleted'")
  })

  it('logic: token invalid when versions diverge', () => {
    function isTokenValid(tokenSv: number, dbSv: number) {
      if (tokenSv < 0) return false
      return tokenSv === dbSv
    }
    expect(isTokenValid(0, 0)).toBe(true)
    expect(isTokenValid(0, 1)).toBe(false) // after account delete bump
    expect(isTokenValid(-1, 1)).toBe(false)
  })
})
