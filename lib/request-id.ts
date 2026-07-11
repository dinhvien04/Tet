import { randomUUID } from 'crypto'
import type { NextRequest } from 'next/server'

export const REQUEST_ID_HEADER = 'x-request-id'

/**
 * Resolve or create a correlation id for the request.
 */
export function getOrCreateRequestId(request?: NextRequest | Request | null): string {
  const incoming =
    request?.headers.get(REQUEST_ID_HEADER) ||
    request?.headers.get('X-Request-Id') ||
    null
  if (incoming && /^[a-zA-Z0-9_-]{8,64}$/.test(incoming)) {
    return incoming
  }
  return randomUUID()
}

export function withRequestIdHeaders(
  headers: Headers,
  requestId: string
): Headers {
  headers.set(REQUEST_ID_HEADER, requestId)
  return headers
}
