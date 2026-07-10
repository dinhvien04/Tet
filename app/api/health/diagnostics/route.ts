import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import mongoose from 'mongoose'

function isAuthorized(request: NextRequest): boolean {
  const token =
    process.env.HEALTH_DIAGNOSTICS_TOKEN ||
    process.env.CRON_SECRET ||
    process.env.INTERNAL_HEALTH_TOKEN

  if (!token) {
    // Fail closed when no token configured
    return false
  }

  const auth = request.headers.get('authorization')
  return auth === `Bearer ${token}`
}

/**
 * Internal diagnostics — NOT public.
 * Requires Authorization: Bearer <HEALTH_DIAGNOSTICS_TOKEN|CRON_SECRET>
 * GET /api/health/diagnostics
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let db: 'ok' | 'error' = 'error'
  let replicaSet: boolean | null = null
  let transactions: 'supported' | 'unsupported' | 'unknown' = 'unknown'

  try {
    await connectDB()
    const database = mongoose.connection.db
    if (database) {
      await database.admin().command({ ping: 1 })
      db = 'ok'
      try {
        const status = await database.admin().command({ replSetGetStatus: 1 })
        replicaSet = Boolean(status?.ok)
        transactions = replicaSet ? 'supported' : 'unsupported'
      } catch {
        // Standalone mongod — transactions not available
        replicaSet = false
        transactions = 'unsupported'
      }
    }
  } catch {
    db = 'error'
  }

  return NextResponse.json({
    status: db === 'ok' ? 'ok' : 'degraded',
    checks: {
      database: db,
      replicaSet,
      transactions,
    },
    runtime: {
      nodeEnv: process.env.NODE_ENV ?? 'unknown',
      // Never return connection strings or secrets
      cloudinaryConfigured: Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET
      ),
      nextAuthConfigured: Boolean(process.env.NEXTAUTH_SECRET),
    },
  })
}
