import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import mongoose from 'mongoose'
import { countPendingCleanups } from '@/lib/storage-cleanup'

/**
 * Diagnostics token is intentionally separate from CRON_SECRET.
 * No production fallback to CRON_SECRET (different privilege).
 */
function isAuthorized(request: NextRequest): boolean {
  const token =
    process.env.HEALTH_DIAGNOSTICS_TOKEN || process.env.INTERNAL_HEALTH_TOKEN

  if (!token) {
    return false
  }

  const auth = request.headers.get('authorization')
  return auth === `Bearer ${token}`
}

/**
 * Internal diagnostics — NOT public.
 * Requires Authorization: Bearer <HEALTH_DIAGNOSTICS_TOKEN>
 * GET /api/health/diagnostics
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let db: 'ok' | 'error' = 'error'
  let replicaSet: boolean | null = null
  let transactions: 'supported' | 'unsupported' | 'unknown' = 'unknown'
  let cleanupPending = 0

  try {
    await connectDB()
    const database = mongoose.connection.db
    if (database) {
      await database.admin().command({ ping: 1 })
      db = 'ok'
      try {
        // Prefer hello (works without replSetGetStatus privileges on managed MongoDB)
        const hello = await database.admin().command({ hello: 1 })
        replicaSet = Boolean(hello?.setName || hello?.msg === 'isdbgrid')
        if (
          !replicaSet &&
          typeof hello?.logicalSessionTimeoutMinutes === 'number'
        ) {
          // Sessions available often implies transactions on replica set / mongos
          replicaSet = Boolean(hello.setName || hello.msg === 'isdbgrid')
        }
        transactions = replicaSet ? 'supported' : 'unsupported'
      } catch {
        replicaSet = null
        transactions = 'unknown'
      }
    }
    cleanupPending = await countPendingCleanups().catch(() => 0)
  } catch {
    db = 'error'
  }

  const status = db === 'ok' ? 'ok' : 'degraded'
  const httpStatus = db === 'ok' ? 200 : 503

  return NextResponse.json(
    {
      status,
      checks: {
        database: db,
        replicaSet,
        transactions,
        storageCleanupPending: cleanupPending,
      },
      runtime: {
        nodeEnv: process.env.NODE_ENV ?? 'unknown',
        cloudinaryConfigured: Boolean(
          process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET
        ),
        nextAuthConfigured: Boolean(process.env.NEXTAUTH_SECRET),
      },
    },
    { status: httpStatus }
  )
}
