import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import mongoose from 'mongoose'

/**
 * Readiness — can serve traffic that needs MongoDB.
 * Public response stays generic (no stack / URI / env dump).
 * GET /api/health/ready
 */
export async function GET() {
  try {
    await connectDB()
    const db = mongoose.connection.db
    if (!db) {
      return NextResponse.json({ status: 'error' }, { status: 503 })
    }
    await db.admin().command({ ping: 1 })
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch {
    // Never leak raw driver errors publicly
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}
