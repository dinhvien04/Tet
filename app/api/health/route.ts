import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'

/**
 * Public liveness/readiness — minimal payload, no secrets or stack traces.
 */
export async function GET() {
  try {
    await connectDB()
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}
