/**
 * HTTP-level protected route checks against a running production server.
 *
 * Usage:
 *   npm run build
 *   NEXTAUTH_SECRET=... NEXTAUTH_URL=http://localhost:3000 npm run start &
 *   E2E_BASE_URL=http://localhost:3000 npm run test:e2e
 *
 * Skips when E2E_BASE_URL is not set (default CI without long-running server).
 */
import { describe, it, expect } from 'vitest'

const base = process.env.E2E_BASE_URL
const describeIf = base ? describe : describe.skip

const PROTECTED = [
  '/dashboard',
  '/family',
  '/admin',
  '/profile',
  '/games/bau-cua',
  '/events',
  '/photos',
  '/posts',
  '/ai/generate',
]

async function fetchAnon(path: string, extraHeaders?: Record<string, string>) {
  const url = `${base!.replace(/\/$/, '')}${path}`
  return fetch(url, {
    redirect: 'manual',
    headers: {
      Accept: 'text/html',
      ...extraHeaders,
    },
  })
}

describeIf('E2E production protected routes (anonymous)', () => {
  it('blocks anonymous access to protected paths', async () => {
    for (const path of PROTECTED) {
      const res = await fetchAnon(path)
      // NextAuth middleware redirects to login (307/302) or 401
      expect(
        [302, 303, 307, 308, 401, 403].includes(res.status),
        `${path} status ${res.status}`
      ).toBe(true)
      const loc = res.headers.get('location') || ''
      if (loc) {
        expect(loc).toMatch(/login|signin/i)
      }
    }
  }, 60_000)

  it('blocks with RSC / Next-Router-Prefetch headers', async () => {
    const res = await fetchAnon('/dashboard', {
      RSC: '1',
      'Next-Router-Prefetch': '1',
      'Next-Url': '/dashboard',
    })
    expect([302, 303, 307, 308, 401, 403].includes(res.status)).toBe(true)
  })

  it('blocks odd paths (query, trailing slash)', async () => {
    for (const path of ['/dashboard/', '/dashboard?x=1', '/profile/settings']) {
      const res = await fetchAnon(path)
      expect([302, 303, 307, 308, 401, 403].includes(res.status)).toBe(true)
    }
  })

  it('allows public health without auth', async () => {
    const res = await fetch(`${base!.replace(/\/$/, '')}/api/health`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })
})

describe('E2E skip marker', () => {
  it('documents when E2E is skipped', () => {
    if (!base) {
      expect(true).toBe(true) // skipped suite when E2E_BASE_URL unset
    } else {
      expect(base.startsWith('http')).toBe(true)
    }
  })
})
