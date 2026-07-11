import { describe, it, expect } from 'vitest'
import { NextResponse } from 'next/server'
import { applySecurityHeaders, buildCsp } from '@/lib/security-headers'

describe('security headers', () => {
  it('buildCsp includes baseline directives', () => {
    const csp = buildCsp(false)
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain('https://res.cloudinary.com')
    expect(csp).toContain('https://lh3.googleusercontent.com')
    expect(csp).not.toContain('upgrade-insecure-requests')
  })

  it('development CSP may include unsafe-eval', () => {
    expect(buildCsp(false)).toContain('unsafe-eval')
  })

  it('production CSP does NOT include unsafe-eval', () => {
    const csp = buildCsp(true)
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).toContain('upgrade-insecure-requests')
  })

  it('enforces CSP by default (not report-only)', () => {
    const res = NextResponse.next()
    applySecurityHeaders(res, { production: false, reportOnlyCsp: false })
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy()
    expect(res.headers.get('Content-Security-Policy-Report-Only')).toBeNull()
  })

  it('can use report-only mode when requested', () => {
    const res = NextResponse.next()
    applySecurityHeaders(res, { production: false, reportOnlyCsp: true })
    expect(res.headers.get('Content-Security-Policy-Report-Only')).toBeTruthy()
    expect(res.headers.get('Content-Security-Policy')).toBeNull()
  })

  it('sets HSTS only in production', () => {
    const prod = NextResponse.next()
    applySecurityHeaders(prod, { production: true, reportOnlyCsp: false })
    expect(prod.headers.get('Strict-Transport-Security')).toContain('max-age=')

    const dev = NextResponse.next()
    applySecurityHeaders(dev, { production: false, reportOnlyCsp: false })
    expect(dev.headers.get('Strict-Transport-Security')).toBeNull()
  })

  it('sets Permissions-Policy and nosniff', () => {
    const res = NextResponse.next()
    applySecurityHeaders(res, { production: false })
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('Permissions-Policy')).toContain('camera=()')
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
  })
})
