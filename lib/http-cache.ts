import { NextResponse } from 'next/server'

/** Headers for authenticated / private JSON responses */
export const PRIVATE_NO_STORE = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
} as const

export function withPrivateNoStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', PRIVATE_NO_STORE['Cache-Control'])
  response.headers.set('Pragma', PRIVATE_NO_STORE.Pragma)
  return response
}

export function jsonPrivate(data: unknown, init?: { status?: number }): NextResponse {
  const res = NextResponse.json(data, { status: init?.status ?? 200 })
  return withPrivateNoStore(res)
}
