import { NextRequest, NextResponse } from 'next/server'
import { AuthError } from '@/lib/authorization'
import { ValidationError } from '@/lib/api/validate'

type RouteHandler = (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse>

/**
 * Wrap API route handlers with consistent error mapping.
 */
export function withApiHandler(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context)
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      console.error('[api]', error)
      return NextResponse.json({ error: 'Có lỗi xảy ra' }, { status: 500 })
    }
  }
}
