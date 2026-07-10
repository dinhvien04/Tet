import type { NextResponse } from 'next/server'

/**
 * Apply baseline security headers (call from middleware or response helpers).
 * CSP starts in Report-Only mode via header name when reportOnly=true.
 */
export function applySecurityHeaders(
  res: NextResponse,
  options?: { production?: boolean; reportOnlyCsp?: boolean }
): NextResponse {
  const production = options?.production ?? process.env.NODE_ENV === 'production'

  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  )
  res.headers.set('X-Frame-Options', 'DENY')

  if (production) {
    res.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    )
  }

  // Conservative CSP — MegaLLM is server-side only
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js may need; tighten with nonces later
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://*.googleusercontent.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')

  const cspHeader = options?.reportOnlyCsp
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy'
  res.headers.set(cspHeader, csp)

  return res
}
