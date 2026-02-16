import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { inviteCode } = await request.json()
    const familyId = params.id

    // Validate input
    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json(
        { error: 'Mã mời không hợp lệ' },
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

    // Verify family exists and invite code matches
    const { data: family, error: familyError } = await supabase
      .from('families')
      .select('id, name, invite_code')
      .eq('id', familyId)
      .eq('invite_code', inviteCode)
      .single()

    if (familyError || !family) {
      return NextResponse.json(
        { error: 'Mã mời không hợp lệ' },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', familyId)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'Bạn đã là thành viên của nhà này' },
        { status: 400 }
      )
    }

    // Add user as member
    const { data: member, error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_id: familyId,
        user_id: userId,
        role: 'member',
      })
      .select()
      .single()

    if (memberError) {
      console.error('Error adding family member:', memberError)
      return NextResponse.json(
        { error: 'Không thể tham gia nhà' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        family_id: member.family_id,
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
      },
      family: {
        id: family.id,
        name: family.name,
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
