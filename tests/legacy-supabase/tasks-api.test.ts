import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@/lib/supabase'

describe('Tasks API', () => {
  let supabase: ReturnType<typeof createClient>
  let testUserId: string
  let testFamilyId: string
  let testEventId: string
  let assigneeUserId: string

  beforeEach(async () => {
    supabase = createClient()
    
    // Create test user
    const { data: userData } = await supabase.auth.signInAnonymously()
    testUserId = userData.user!.id

    await supabase.from('users').insert({
      id: testUserId,
      email: `test-${Date.now()}@example.com`,
      name: 'Test User'
    })

    // Create assignee user
    const { data: assigneeData } = await supabase.from('users').insert({
      email: `assignee-${Date.now()}@example.com`,
      name: 'Assignee User'
    }).select().single()
    assigneeUserId = assigneeData!.id

    // Create test family
    const { data: familyData } = await supabase
      .from('families')
      .insert({
        name: 'Test Family',
        invite_code: `TEST${Date.now()}`,
        created_by: testUserId
      })
      .select()
      .single()

    testFamilyId = familyData!.id

    await supabase.from('family_members').insert([
      { family_id: testFamilyId, user_id: testUserId, role: 'admin' },
      { family_id: testFamilyId, user_id: assigneeUserId, role: 'member' }
    ])

    // Create test event
    const { data: eventData } = await supabase
      .from('events')
      .insert({
        family_id: testFamilyId,
        title: 'Test Event',
        date: new Date().toISOString(),
        created_by: testUserId
      })
      .select()
      .single()

    testEventId = eventData!.id
  })

  afterEach(async () => {
    if (testEventId) {
      await supabase.from('event_tasks').delete().eq('event_id', testEventId)
      await supabase.from('events').delete().eq('id', testEventId)
    }
    if (testFamilyId) {
      await supabase.from('family_members').delete().eq('family_id', testFamilyId)
      await supabase.from('families').delete().eq('id', testFamilyId)
    }
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId)
    }
    if (assigneeUserId) {
      await supabase.from('users').delete().eq('id', assigneeUserId)
    }
    await supabase.auth.signOut()
  })

  it('should create task with valid data', async () => {
    const { data: task, error } = await supabase
      .from('event_tasks')
      .insert({
        event_id: testEventId,
        task: 'Chuẩn bị mâm cỗ',
        assigned_to: assigneeUserId,
        status: 'pending'
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(task).toBeDefined()
    expect(task!.task).toBe('Chuẩn bị mâm cỗ')
    expect(task!.status).toBe('pending')
    expect(task!.assigned_to).toBe(assigneeUserId)
  })

  it('should reject task creation without required fields', async () => {
    const { error } = await supabase
      .from('event_tasks')
      .insert({
        event_id: testEventId,
        // Missing task and assigned_to
        status: 'pending'
      })

    expect(error).toBeDefined()
  })

  it('should update task status', async () => {
    // Create task
    const { data: task } = await supabase
      .from('event_tasks')
      .insert({
        event_id: testEventId,
        task: 'Test task',
        assigned_to: assigneeUserId,
        status: 'pending'
      })
      .select()
      .single()

    // Update to completed
    const { data: updatedTask, error } = await supabase
      .from('event_tasks')
      .update({ status: 'completed' })
      .eq('id', task!.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updatedTask!.status).toBe('completed')
  })

  it('should fetch tasks for an event', async () => {
    // Create multiple tasks
    const tasks = [
      {
        event_id: testEventId,
        task: 'Task 1',
        assigned_to: assigneeUserId,
        status: 'pending'
      },
      {
        event_id: testEventId,
        task: 'Task 2',
        assigned_to: testUserId,
        status: 'completed'
      }
    ]

    await supabase.from('event_tasks').insert(tasks)

    const { data: fetchedTasks } = await supabase
      .from('event_tasks')
      .select('*')
      .eq('event_id', testEventId)

    expect(fetchedTasks).toBeDefined()
    expect(fetchedTasks!.length).toBe(2)
  })

  it('should reject invalid status values', async () => {
    const { error } = await supabase
      .from('event_tasks')
      .insert({
        event_id: testEventId,
        task: 'Test task',
        assigned_to: assigneeUserId,
        status: 'invalid_status' as any
      })

    expect(error).toBeDefined()
  })
})
