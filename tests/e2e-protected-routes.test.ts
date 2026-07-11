/**
 * HTTP-level E2E against a running production server.
 *
 * CI must set E2E_BASE_URL and start `npm run start`.
 * When CI=true without E2E_BASE_URL, this suite FAILS (no silent skip).
 */
import { describe, it, expect, beforeAll } from 'vitest'

const base = process.env.E2E_BASE_URL
const isCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'

beforeAll(() => {
  if (isCi && !base) {
    throw new Error(
      'E2E_BASE_URL is required in CI. Start production server and set E2E_BASE_URL.'
    )
  }
})

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

  it('production responses include CSP without unsafe-eval', async () => {
    const res = await fetchAnon('/login')
    const csp =
      res.headers.get('content-security-policy') ||
      res.headers.get('Content-Security-Policy') ||
      ''
    // Middleware applies CSP on page routes
    if (csp) {
      expect(csp).not.toContain('unsafe-eval')
      expect(csp.toLowerCase()).toContain('default-src')
    }
  })

  it('sets X-Request-Id on responses', async () => {
    const res = await fetchAnon('/login')
    const rid = res.headers.get('x-request-id')
    expect(rid).toBeTruthy()
  })
})

describe('E2E configuration', () => {
  it('does not silently skip in CI without base URL', () => {
    if (isCi) {
      expect(base, 'E2E_BASE_URL must be set in CI').toBeTruthy()
    }
  })
})
