import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient()
    const { id: postId } = await params
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type } = body

    // Validate type
    const validTypes = ['heart', 'haha']
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: heart, haha' },
        { status: 400 }
      )
    }

    // Verify post exists and user has access
    const { data: post } = await supabase
      .from('posts')
      .select('family_id')
      .eq('id', postId)
      .single()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Verify user is member of the family
    const { data: membership } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', post.family_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this family' },
        { status: 403 }
      )
    }

    // Check if user already has a reaction on this post
    const { data: existingReaction } = await supabase
      .from('reactions')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single()

    if (existingReaction) {
      if (existingReaction.type === type) {
        // Same type - remove reaction
        const { error: deleteError } = await supabase
          .from('reactions')
          .delete()
          .eq('id', existingReaction.id)

        if (deleteError) {
          console.error('Error deleting reaction:', deleteError)
          return NextResponse.json(
            { error: 'Failed to remove reaction' },
            { status: 500 }
          )
        }

        return NextResponse.json({ action: 'removed', type })
      } else {
        // Different type - update reaction
        const { data: updatedReaction, error: updateError } = await supabase
          .from('reactions')
          .update({ type })
          .eq('id', existingReaction.id)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating reaction:', updateError)
          return NextResponse.json(
            { error: 'Failed to update reaction' },
            { status: 500 }
          )
        }

        return NextResponse.json({ action: 'updated', type, reaction: updatedReaction })
      }
    } else {
      // No existing reaction - create new one
      const { data: newReaction, error: insertError } = await supabase
        .from('reactions')
        .insert({
          post_id: postId,
          user_id: user.id,
          type
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating reaction:', insertError)
        return NextResponse.json(
          { error: 'Failed to add reaction' },
          { status: 500 }
        )
      }

      return NextResponse.json({ action: 'added', type, reaction: newReaction }, { status: 201 })
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
