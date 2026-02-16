import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { family_id, content, type } = body

    // Validate required fields
    if (!family_id || !content || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: family_id, content, type' },
        { status: 400 }
      )
    }

    // Validate type
    const validTypes = ['cau-doi', 'loi-chuc', 'thiep-tet']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: cau-doi, loi-chuc, thiep-tet' },
        { status: 400 }
      )
    }

    // Verify user is member of the family
    const { data: membership } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', family_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this family' },
        { status: 403 }
      )
    }

    // Create post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        family_id,
        user_id: user.id,
        content,
        type
      })
      .select(`
        *,
        users (
          id,
          name,
          avatar,
          email
        )
      `)
      .single()

    if (postError) {
      console.error('Error creating post:', postError)
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: 500 }
      )
    }

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const familyId = searchParams.get('familyId')

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

    // Get posts with user info and reaction counts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
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
      .order('created_at', { ascending: false })

    if (postsError) {
      console.error('Error fetching posts:', postsError)
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      )
    }

    // Get reaction counts for all posts
    const postIds = posts.map((p: any) => p.id)
    const { data: reactions } = await supabase
      .from('reactions')
      .select('post_id, type, user_id')
      .in('post_id', postIds)

    // Aggregate reactions by post
    const postsWithReactions = posts.map((post: any) => {
      const postReactions = reactions?.filter((r: any) => r.post_id === post.id) || []
      const heartCount = postReactions.filter((r: any) => r.type === 'heart').length
      const hahaCount = postReactions.filter((r: any) => r.type === 'haha').length
      const userReaction = postReactions.find((r: any) => r.user_id === user.id)?.type || null

      return {
        ...post,
        reactions: {
          heart: heartCount,
          haha: hahaCount
        },
        userReaction
      }
    })

    return NextResponse.json(postsWithReactions)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
