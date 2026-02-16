import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient()
    const { id: taskId } = await params
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    // Validate status
    if (!status || !['pending', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "pending" or "completed"' },
        { status: 400 }
      )
    }

    // Get task and verify permissions
    const { data: task } = await supabase
      .from('event_tasks')
      .select('*, events!inner(family_id)')
      .eq('id', taskId)
      .single()

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Verify user is member of the family
    const { data: membership } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', task.events.family_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this family' },
        { status: 403 }
      )
    }

    // Update task status
    const { data: updatedTask, error } = await supabase
      .from('event_tasks')
      .update({ status })
      .eq('id', taskId)
      .select('*, users!event_tasks_assigned_to_fkey(id, name, avatar)')
      .single()

    if (error) {
      console.error('Error updating task:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(updatedTask, { status: 200 })
  } catch (error) {
    console.error('Error in PATCH /api/tasks/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
