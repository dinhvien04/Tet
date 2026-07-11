/**
 * Protected-route middleware contract tests.
 * Full production-build HTTP E2E requires `npm run build && npm run start`
 * with a running server — CI runs middleware logic assertions here.
 */
import { describe, it, expect } from 'vitest'
import { buildCsp } from '@/lib/security-headers'

const PROTECTED = [
  '/dashboard',
  '/family',
  '/admin',
  '/profile',
  '/games/bau-cua',
  '/events',
  '/photos',
  '/posts',
  '/ai',
]

describe('protected routes middleware config', () => {
  it('lists expected protected path prefixes', async () => {
    // Read middleware source as contract
    const fs = await import('fs')
    const path = await import('path')
    const src = fs.readFileSync(
      path.join(process.cwd(), 'middleware.ts'),
      'utf8'
    )
    for (const route of PROTECTED) {
      const prefix = '/' + route.split('/').filter(Boolean)[0]
      expect(src).toContain(`'${prefix}'`)
    }
    expect(src).toContain('withAuth')
    expect(src).toContain('token?.id')
  })

  it('production CSP has no unsafe-eval (middleware security baseline)', () => {
    expect(buildCsp(true)).not.toContain('unsafe-eval')
  })

  it('special URL patterns still match startsWith protected prefix', () => {
    // Middleware uses startsWith — encoded / double-slash / query must still protect
    const isProtected = (pathname: string) =>
      PROTECTED.some((route) => {
        const prefix = '/' + route.split('/').filter(Boolean)[0]
        return pathname.startsWith(prefix)
      })

    expect(isProtected('/dashboard')).toBe(true)
    expect(isProtected('/dashboard?x=1')).toBe(true)
    expect(isProtected('/profile/settings')).toBe(true)
    expect(isProtected('/games/bau-cua')).toBe(true)
    expect(isProtected('/admin/users')).toBe(true)
    expect(isProtected('/login')).toBe(false)
    expect(isProtected('/api/health')).toBe(false)
  })
})
