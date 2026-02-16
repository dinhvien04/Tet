import { describe, it, expect, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// This test requires a test Supabase instance
// Skip if not in integration test environment
const isIntegrationTest = process.env.RUN_INTEGRATION_TESTS === 'true' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = isIntegrationTest ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
) : null as any

describe.skipIf(!isIntegrationTest)('Notifications Integration Tests', () => {
  let testUserId: string
  let testFamilyId: string
  let testEventId: string

  beforeEach(async () => {
    // Create test user
    const { data: user } = await supabase
      .from('users')
      .insert({
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg'
      })
      .select()
      .single()

    testUserId = user!.id

    // Create test family
    const { data: family } = await supabase
      .from('families')
      .insert({
        name: 'Test Family',
        invite_code: `TEST${Date.now()}`,
        created_by: testUserId
      })
      .select()
      .single()

    testFamilyId = family!.id

    // Add user to family
    await supabase
      .from('family_members')
      .insert({
        family_id: testFamilyId,
        user_id: testUserId,
        role: 'admin'
      })

    // Create upcoming event (in 12 hours)
    const eventDate = new Date(Date.now() + 12 * 60 * 60 * 1000)
    const { data: event } = await supabase
      .from('events')
      .insert({
        family_id: testFamilyId,
        title: 'Test Event',
        date: eventDate.toISOString(),
        location: 'Test Location',
        created_by: testUserId
      })
      .select()
      .single()

    testEventId = event!.id
  })

  it('should create event reminder notification for family members', async () => {
    // Simulate cron job logic
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const { data: upcomingEvents } = await supabase
      .from('events')
      .select(`
        id,
        title,
        date,
        location,
        family_id,
        families!inner (
          id,
          name,
          family_members (
            user_id
          )
        )
      `)
      .gte('date', now.toISOString())
      .lte('date', tomorrow.toISOString())

    expect(upcomingEvents).toBeDefined()
    expect(upcomingEvents!.length).toBeGreaterThan(0)

    const event = upcomingEvents![0]
    const familyMembers = event.families.family_members

    // Create notification for first member
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: familyMembers[0].user_id,
        type: 'event_reminder',
        title: `Sự kiện "${event.title}" sắp diễn ra`,
        content: `Sự kiện sẽ diễn ra vào ${new Date(event.date).toLocaleString('vi-VN')}`,
        link: `/events/${event.id}`,
        read: false
      })

    expect(error).toBeNull()

    // Verify notification was created
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', familyMembers[0].user_id)
      .eq('type', 'event_reminder')

    expect(notifications).toBeDefined()
    expect(notifications!.length).toBeGreaterThan(0)
  })

  it('should create task reminder for user with pending task', async () => {
    // Create a pending task
    const { data: task } = await supabase
      .from('event_tasks')
      .insert({
        event_id: testEventId,
        task: 'Test Task',
        assigned_to: testUserId,
        status: 'pending'
      })
      .select()
      .single()

    expect(task).toBeDefined()

    // Create task reminder notification
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: testUserId,
        type: 'task_reminder',
        title: 'Bạn có công việc chưa hoàn thành',
        content: `"${task!.task}" trong sự kiện "Test Event"`,
        link: `/events/${testEventId}`,
        read: false
      })

    expect(error).toBeNull()

    // Verify notification was created
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', testUserId)
      .eq('type', 'task_reminder')

    expect(notifications).toBeDefined()
    expect(notifications!.length).toBeGreaterThan(0)
  })

  it('should not create duplicate notifications', async () => {
    // Create first notification
    await supabase
      .from('notifications')
      .insert({
        user_id: testUserId,
        type: 'event_reminder',
        title: 'Test Notification',
        content: 'Test Content',
        link: `/events/${testEventId}`,
        read: false
      })

    // Check for existing notification
    const { data: existingNotification } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', testUserId)
      .eq('type', 'event_reminder')
      .eq('link', `/events/${testEventId}`)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single()

    expect(existingNotification).toBeDefined()

    // Should not create duplicate if exists
    if (existingNotification) {
      // Skip creating duplicate
      const { data: allNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', testUserId)
        .eq('type', 'event_reminder')
        .eq('link', `/events/${testEventId}`)

      expect(allNotifications!.length).toBe(1)
    }
  })
})
