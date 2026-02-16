import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Generate unique 8-character invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    // Validate input
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Tên nhà không hợp lệ' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Generate unique invite code with retry logic
    let inviteCode = generateInviteCode()
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      // Check if code already exists
      const { data: existing } = await supabase
        .from('families')
        .select('id')
        .eq('invite_code', inviteCode)
        .single()

      if (!existing) {
        break // Code is unique
      }

      inviteCode = generateInviteCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Không thể tạo mã mời duy nhất. Vui lòng thử lại.' },
        { status: 500 }
      )
    }

    // Create family
    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert({
        name: name.trim(),
        invite_code: inviteCode,
        created_by: userId,
      })
      .select()
      .single()

    if (familyError) {
      console.error('Error creating family:', familyError)
      return NextResponse.json(
        { error: 'Không thể tạo nhà' },
        { status: 500 }
      )
    }

    // Add creator as admin
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_id: family.id,
        user_id: userId,
        role: 'admin',
      })

    if (memberError) {
      console.error('Error adding family member:', memberError)
      // Rollback: delete the family
      await supabase.from('families').delete().eq('id', family.id)
      
      return NextResponse.json(
        { error: 'Không thể thêm thành viên' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      family: {
        id: family.id,
        name: family.name,
        invite_code: family.invite_code,
        created_at: family.created_at,
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}
