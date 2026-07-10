import { NextRequest, NextResponse } from 'next/server'
import { checkAndCreateNotifications } from '@/lib/notifications'

function isProduction() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
}

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET

    // Fail closed in production when secret is missing
    if (!cronSecret) {
      if (isProduction()) {
        return NextResponse.json(
          { error: 'CRON_SECRET is not configured' },
          { status: 503 }
        )
      }
      // Allow unauthenticated cron in local development only
      console.warn('[cron] CRON_SECRET not set; allowing request in non-production')
    } else {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const stats = await checkAndCreateNotifications()

    return NextResponse.json({
      success: true,
      message: 'Notifications checked and created',
      stats,
    })
  } catch (error) {
    console.error('Error in notification cron job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Prefer POST when platform allows (still supported for manual triggers)
export async function POST(request: NextRequest) {
  return GET(request)
}
