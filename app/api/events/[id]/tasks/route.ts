import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient()
    const { id: eventId } = await params
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { task, assigned_to } = body

    // Validate required fields
    if (!task || !assigned_to) {
      return NextResponse.json(
        { error: 'Missing required fields: task, assigned_to' },
        { status: 400 }
      )
    }

    // Verify event exists and user is member of the family
    const { data: event } = await supabase
      .from('events')
      .select('family_id')
      .eq('id', eventId)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const { data: membership } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', event.family_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this family' },
        { status: 403 }
      )
    }

    // Verify assigned_to user is also a member
    const { data: assigneeMembership } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', event.family_id)
      .eq('user_id', assigned_to)
      .single()

    if (!assigneeMembership) {
      return NextResponse.json(
        { error: 'Assigned user is not a member of this family' },
        { status: 400 }
      )
    }

    // Create task
    const { data: newTask, error } = await supabase
      .from('event_tasks')
      .insert({
        event_id: eventId,
        task,
        assigned_to,
        status: 'pending'
      })
      .select('*, users!event_tasks_assigned_to_fkey(id, name, avatar)')
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(newTask, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/events/[id]/tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient()
    const { id: eventId } = await params
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify event exists and user is member of the family
    const { data: event } = await supabase
      .from('events')
      .select('family_id')
      .eq('id', eventId)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const { data: membership } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', event.family_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this family' },
        { status: 403 }
      )
    }

    // Get tasks for this event
    const { data: tasks, error } = await supabase
      .from('event_tasks')
      .select('*, users!event_tasks_assigned_to_fkey(id, name, avatar)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(tasks, { status: 200 })
  } catch (error) {
    console.error('Error in GET /api/events/[id]/tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
