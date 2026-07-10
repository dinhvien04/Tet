import { NextResponse } from 'next/server'

/**
 * Liveness — process is up. No DB, no secrets, minimal payload.
 * GET /api/health
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
