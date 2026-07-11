import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { applySecurityHeaders } from '@/lib/security-headers'
import { getOrCreateRequestId, REQUEST_ID_HEADER } from '@/lib/request-id'

export default withAuth(
  function middleware(req: NextRequest) {
    // Always mint server-side request id (validated if incoming)
    const requestId = getOrCreateRequestId(req)
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set(REQUEST_ID_HEADER, requestId)

    const res = NextResponse.next({
      request: { headers: requestHeaders },
    })
    res.headers.set(REQUEST_ID_HEADER, requestId)
    return applySecurityHeaders(res, {
      production: process.env.NODE_ENV === 'production',
    })
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const protectedRoutes = [
          '/dashboard',
          '/family',
          '/events',
          '/photos',
          '/posts',
          '/games',
          '/admin',
          '/profile',
          '/ai',
        ]
        const isProtectedRoute = protectedRoutes.some((route) =>
          req.nextUrl.pathname.startsWith(route)
        )

        const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')

        if (isProtectedRoute) {
          if (!token?.id) {
            return false
          }

          if (isAdminRoute) {
            return token.role === 'admin'
          }

          return true
        }

        return true
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|map|woff2?)$).*)',
  ],
}
