import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware() {
    // Middleware logic here if needed
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protected routes that require authentication
        const protectedRoutes = ['/dashboard', '/family', '/events', '/photos', '/posts', '/games']
        const isProtectedRoute = protectedRoutes.some((route) =>
          req.nextUrl.pathname.startsWith(route)
        )

        // If accessing protected route, check if user is authenticated
        if (isProtectedRoute) {
          return !!token
        }

        // Allow access to public routes
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
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
