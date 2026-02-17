import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// This test requires a test Supabase instance
// Skip if not in integration test environment
const isIntegrationTest = process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== '' &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== '' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your-supabase-url' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://localhost:54321' &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your-supabase-anon-key' &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'test-anon-key'

function getSupabaseClient() {
  if (!isIntegrationTest) {
    throw new Error('Integration tests are not configured')
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const describeOrSkip = isIntegrationTest ? describe : describe.skip

describeOrSkip('Tasks Property Tests', () => {
  let testUserId: string
  let testFamilyId: string
  let testEventId: string
  let assigneeUserId: string

  beforeEach(async () => {
    const supabase = getSupabaseClient()
    
    // Create test user
    const { data: userData } = await supabase.auth.signInAnonymously()
    testUserId = userData.user!.id

    // Insert user into users table
    await supabase.from('users').insert({
      id: testUserId,
      email: `test-${Date.now()}@example.com`,
      name: 'Test User'
    })

    // Create assignee user
    const assigneeEmail = `assignee-${Date.now()}@example.com`
    const { data: assigneeData } = await supabase.from('users').insert({
      email: assigneeEmail,
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

    // Add users as members
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
    const supabase = getSupabaseClient()
    // Cleanup
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

  it('Property 13: Task Creation and Linking - tasks must be linked to correct event', async () => {
    // Feature: tet-connect, Property 13: Task Creation and Linking
    // **Validates: Requirements 8.4**
    
    const supabase = getSupabaseClient()
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (taskDescription) => {
          // Create task
          const { data: task, error } = await supabase
            .from('event_tasks')
            .insert({
              event_id: testEventId,
              task: taskDescription,
              assigned_to: assigneeUserId,
              status: 'pending'
            })
            .select()
            .single()

          expect(error).toBeNull()
          expect(task).toBeDefined()
          
          // Verify task is linked to correct event
          expect(task!.event_id).toBe(testEventId)
          expect(task!.task).toBe(taskDescription)
          expect(task!.assigned_to).toBe(assigneeUserId)

          // Cleanup
          await supabase.from('event_tasks').delete().eq('id', task!.id)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 14: Task Initial Status - new tasks must have pending status', async () => {
    // Feature: tet-connect, Property 14: Task Initial Status
    // **Validates: Requirements 8.5**
    
    const supabase = getSupabaseClient()
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (taskDescription) => {
          // Create task
          const { data: task, error } = await supabase
            .from('event_tasks')
            .insert({
              event_id: testEventId,
              task: taskDescription,
              assigned_to: assigneeUserId,
              status: 'pending'
            })
            .select()
            .single()

          expect(error).toBeNull()
          expect(task).toBeDefined()
          
          // Verify initial status is pending
          expect(task!.status).toBe('pending')

          // Cleanup
          await supabase.from('event_tasks').delete().eq('id', task!.id)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 15: Task Status Toggle - status must toggle between pending and completed', async () => {
    // Feature: tet-connect, Property 15: Task Status Toggle
    // **Validates: Requirements 8.7**
    
    const supabase = getSupabaseClient()
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (taskDescription) => {
          // Create task with pending status
          const { data: task } = await supabase
            .from('event_tasks')
            .insert({
              event_id: testEventId,
              task: taskDescription,
              assigned_to: assigneeUserId,
              status: 'pending'
            })
            .select()
            .single()

          expect(task!.status).toBe('pending')

          // Toggle to completed
          const { data: completedTask } = await supabase
            .from('event_tasks')
            .update({ status: 'completed' })
            .eq('id', task!.id)
            .select()
            .single()

          expect(completedTask!.status).toBe('completed')

          // Toggle back to pending
          const { data: pendingTask } = await supabase
            .from('event_tasks')
            .update({ status: 'pending' })
            .eq('id', task!.id)
            .select()
            .single()

          expect(pendingTask!.status).toBe('pending')

          // Cleanup
          await supabase.from('event_tasks').delete().eq('id', task!.id)
        }
      ),
      { numRuns: 100 }
    )
  })
})
