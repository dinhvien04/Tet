import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient()
    const { id: familyId } = await params
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is member of the family
    const { data: membership } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', familyId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this family' },
        { status: 403 }
      )
    }

    // Get all family members
    const { data: members, error } = await supabase
      .from('family_members')
      .select('*, users!family_members_user_id_fkey(id, name, avatar)')
      .eq('family_id', familyId)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Error fetching family members:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(members, { status: 200 })
  } catch (error) {
    console.error('Error in GET /api/families/[id]/members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
