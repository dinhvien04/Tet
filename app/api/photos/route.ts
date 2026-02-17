import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get familyId from query params
    const searchParams = request.nextUrl.searchParams
    const familyId = searchParams.get('familyId')
    const from = parseInt(searchParams.get('from') || '0')
    const to = parseInt(searchParams.get('to') || '19')

    if (!familyId) {
      return NextResponse.json(
        { error: 'Missing familyId parameter' },
        { status: 400 }
      )
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

    // Get photos with user info, ordered by upload time (newest first) with pagination
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select(`
        *,
        users (
          id,
          name,
          avatar,
          email
        )
      `)
      .eq('family_id', familyId)
      .order('uploaded_at', { ascending: false })
      .range(from, to)

    if (photosError) {
      console.error('Error fetching photos:', photosError)
      return NextResponse.json(
        { error: 'Failed to fetch photos' },
        { status: 500 }
      )
    }

    return NextResponse.json(photos || [], { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
