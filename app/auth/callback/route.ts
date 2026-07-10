import { NextRequest, NextResponse } from 'next/server'
import { getSafeRedirectPath } from '@/lib/safe-redirect'

/**
 * Legacy Supabase OAuth callback — app now uses NextAuth at /api/auth/[...nextauth].
 * Redirect safely to login/dashboard to avoid broken Supabase flows.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const redirect = getSafeRedirectPath(
    requestUrl.searchParams.get('redirect') || requestUrl.searchParams.get('callbackUrl')
  )

  return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(redirect)}`, requestUrl.origin))
}
