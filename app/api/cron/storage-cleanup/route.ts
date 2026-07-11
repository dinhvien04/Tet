import { NextRequest, NextResponse } from 'next/server'
import { processStorageCleanupJobs } from '@/lib/storage-cleanup'

function isProduction() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
}

/**
 * Process pending Cloudinary/local storage cleanup outbox jobs.
 * Auth: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      if (isProduction()) {
        return NextResponse.json(
          { error: 'CRON_SECRET is not configured' },
          { status: 503 }
        )
      }
      console.warn('[cron/storage-cleanup] CRON_SECRET not set; allowing non-production')
    } else {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const result = await processStorageCleanupJobs(50)

    return NextResponse.json({
      success: true,
      message: 'Storage cleanup processed',
      ...result,
    })
  } catch (error) {
    console.error('Error in storage cleanup cron:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
