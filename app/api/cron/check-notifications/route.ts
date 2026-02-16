import { NextRequest, NextResponse } from 'next/server'
import { checkAndCreateNotifications } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  try {
    // Verify authorization (optional: add a secret token for security)
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await checkAndCreateNotifications()

    return NextResponse.json({
      success: true,
      message: 'Notifications checked and created',
      stats
    })
  } catch (error) {
    console.error('Error in notification cron job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
