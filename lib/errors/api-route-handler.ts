import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string
  code?: string
  details?: any
}

/**
 * Wrapper for API route handlers with standardized error handling
 */
export function withErrorHandling(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context)
    } catch (error: any) {
      console.error('API Route Error:', error)

      // Handle specific error types
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Dữ liệu đã tồn tại', code: 'DUPLICATE_ENTRY' } as ErrorResponse,
          { status: 409 }
        )
      }

      if (error.code === '42501') {
        return NextResponse.json(
          { error: 'Bạn không có quyền thực hiện thao tác này', code: 'PERMISSION_DENIED' } as ErrorResponse,
          { status: 403 }
        )
      }

      // Default error response
      return NextResponse.json(
        { 
          error: 'Có lỗi xảy ra. Vui lòng thử lại.',
          code: 'INTERNAL_ERROR',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        } as ErrorResponse,
        { status: 500 }
      )
    }
  }
}

/**
 * Wrapper for authenticated API routes
 */
export function withAuth(
  handler: (request: NextRequest, user: any, context?: any) => Promise<NextResponse>
) {
  return withErrorHandling(async (request: NextRequest, context?: any) => {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Phiên đăng nhập đã hết hạn', code: 'UNAUTHORIZED' } as ErrorResponse,
        { status: 401 }
      )
    }

    return handler(request, user, context)
  })
}

/**
 * Validate request body against schema
 */
export function validateBody<T>(
  body: any,
  requiredFields: (keyof T)[]
): { valid: boolean; error?: NextResponse } {
  for (const field of requiredFields) {
    if (!body[field]) {
      return {
        valid: false,
        error: NextResponse.json(
          { 
            error: `Thiếu trường bắt buộc: ${String(field)}`,
            code: 'VALIDATION_ERROR'
          } as ErrorResponse,
          { status: 400 }
        )
      }
    }
  }

  return { valid: true }
}

/**
 * Check if user is member of a family
 */
export async function checkFamilyMembership(
  familyId: string,
  userId: string
): Promise<{ isMember: boolean; error?: NextResponse }> {
  const supabase = createClient()
  
  const { data: membership, error } = await supabase
    .from('family_members')
    .select('id')
    .eq('family_id', familyId)
    .eq('user_id', userId)
    .single()

  if (error || !membership) {
    return {
      isMember: false,
      error: NextResponse.json(
        { 
          error: 'Bạn không phải thành viên của gia đình này',
          code: 'NOT_FAMILY_MEMBER'
        } as ErrorResponse,
        { status: 403 }
      )
    }
  }

  return { isMember: true }
}
