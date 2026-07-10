import type { NextResponse } from 'next/server'

/**
 * Baseline security headers for middleware / response helpers.
 *
 * CSP is enforced by default. Set CSP_REPORT_ONLY=true to measure violations
 * without blocking (e.g. during a staged rollout).
 *
 * Notes:
 * - MegaLLM / AI is server-side only → not in connect-src
 * - Google OAuth uses top-level redirects (not form-action to Google)
 * - next/font self-hosts fonts → font-src 'self'
 * - Images: Cloudinary + Google avatar hosts (match next.config remotePatterns)
 */
export function buildCsp(production: boolean): string {
  const directives = [
    "default-src 'self'",
    // Next.js App Router still needs inline for some bootstrapping; nonces later
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    [
      "img-src 'self' data: blob:",
      'https://res.cloudinary.com',
      'https://lh3.googleusercontent.com',
      'https://lh4.googleusercontent.com',
      'https://lh5.googleusercontent.com',
      'https://lh6.googleusercontent.com',
    ].join(' '),
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "worker-src 'self' blob:",
  ]

  if (production) {
    directives.push('upgrade-insecure-requests')
  }

  return directives.join('; ')
}

export function applySecurityHeaders(
  res: NextResponse,
  options?: { production?: boolean; reportOnlyCsp?: boolean }
): NextResponse {
  const production = options?.production ?? process.env.NODE_ENV === 'production'
  // Default: enforce. Opt into report-only via env.
  const reportOnly =
    options?.reportOnlyCsp ?? process.env.CSP_REPORT_ONLY === 'true'

  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  )
  res.headers.set('X-Frame-Options', 'DENY')
  // Cross-origin isolation lite
  res.headers.set('X-DNS-Prefetch-Control', 'off')

  if (production) {
    res.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    )
  }

  const csp = buildCsp(production)
  const cspHeader = reportOnly
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy'
  res.headers.set(cspHeader, csp)

  // Clear the alternate header so only one mode is active
  if (reportOnly) {
    res.headers.delete('Content-Security-Policy')
  } else {
    res.headers.delete('Content-Security-Policy-Report-Only')
  }

  return res
}
