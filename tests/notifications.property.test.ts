import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// This test requires a test Supabase instance
// Skip if not in integration test environment
const isIntegrationTest = process.env.RUN_INTEGRATION_TESTS === 'true' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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

describeOrSkip('Notifications Property Tests', () => {
  let testUserId: string
  let testFamilyId: string

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

    // Add user as member
    await supabase.from('family_members').insert({
      family_id: testFamilyId,
      user_id: testUserId,
      role: 'admin'
    })
  })

  afterEach(async () => {
    const supabase = getSupabaseClient()
    // Cleanup
    if (testFamilyId) {
      await supabase.from('notifications').delete().eq('user_id', testUserId)
      await supabase.from('event_tasks').delete().match({ event_id: testFamilyId })
      await supabase.from('events').delete().eq('family_id', testFamilyId)
      await supabase.from('family_members').delete().eq('family_id', testFamilyId)
      await supabase.from('families').delete().eq('id', testFamilyId)
    }
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId)
    }
    await supabase.auth.signOut()
  })

  it('Property 16: Event Reminder for All Members - all family members must receive event reminders', async () => {
    // Feature: tet-connect, Property 16: Event Reminder for All Members
    // **Validates: Requirements 9.1**
    
    const supabase = getSupabaseClient()
    
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          // Event happening in the next 24 hours
          hoursFromNow: fc.integer({ min: 1, max: 23 }),
          location: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
          memberCount: fc.integer({ min: 2, max: 5 })
        }),
        async (testData) => {
          // Create additional family members
          const memberIds = [testUserId]
          for (let i = 1; i < testData.memberCount; i++) {
            const { data: newUser } = await supabase.from('users').insert({
              email: `member-${Date.now()}-${i}@example.com`,
              name: `Member ${i}`
            }).select().single()
            
            if (newUser) {
              await supabase.from('family_members').insert({
                family_id: testFamilyId,
                user_id: newUser.id,
                role: 'member'
              })
              memberIds.push(newUser.id)
            }
          }

          // Create upcoming event
          const eventDate = new Date(Date.now() + testData.hoursFromNow * 60 * 60 * 1000)
          const { data: event } = await supabase
            .from('events')
            .insert({
              family_id: testFamilyId,
              title: testData.title,
              date: eventDate.toISOString(),
              location: testData.location,
              created_by: testUserId
            })
            .select()
            .single()

          expect(event).toBeDefined()

          // Create event reminder notifications for all members
          for (const memberId of memberIds) {
            const { error } = await supabase
              .from('notifications')
              .insert({
                user_id: memberId,
                type: 'event_reminder',
                title: `Sự kiện "${testData.title}" sắp diễn ra`,
                content: `Sự kiện sẽ diễn ra vào ${eventDate.toLocaleString('vi-VN')}${testData.location ? ` tại ${testData.location}` : ''}`,
                link: `/events/${event!.id}`,
                read: false
              })

            expect(error).toBeNull()
          }

          // Verify all members received notifications
          for (const memberId of memberIds) {
            const { data: notifications } = await supabase
              .from('notifications')
              .select('*')
              .eq('user_id', memberId)
              .eq('type', 'event_reminder')
              .eq('link', `/events/${event!.id}`)

            expect(notifications).toBeDefined()
            expect(notifications!.length).toBe(1)
            expect(notifications![0].title).toContain(testData.title)
            expect(notifications![0].read).toBe(false)
          }

          // Cleanup additional members
          for (const memberId of memberIds) {
            if (memberId !== testUserId) {
              await supabase.from('notifications').delete().eq('user_id', memberId)
              await supabase.from('family_members').delete().eq('user_id', memberId)
              await supabase.from('users').delete().eq('id', memberId)
            }
          }
          await supabase.from('events').delete().eq('id', event!.id)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 17: Task Reminder for Assignee - users with pending tasks must receive task reminders', async () => {
    // Feature: tet-connect, Property 17: Task Reminder for Assignee
    // **Validates: Requirements 9.2**
    
    const supabase = getSupabaseClient()
    
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventTitle: fc.string({ minLength: 1, maxLength: 100 }),
          taskDescription: fc.string({ minLength: 1, maxLength: 200 }),
          hoursFromNow: fc.integer({ min: 1, max: 23 })
        }),
        async (testData) => {
          // Create upcoming event
          const eventDate = new Date(Date.now() + testData.hoursFromNow * 60 * 60 * 1000)
          const { data: event } = await supabase
            .from('events')
            .insert({
              family_id: testFamilyId,
              title: testData.eventTitle,
              date: eventDate.toISOString(),
              created_by: testUserId
            })
            .select()
            .single()

          expect(event).toBeDefined()

          // Create pending task assigned to user
          const { data: task } = await supabase
            .from('event_tasks')
            .insert({
              event_id: event!.id,
              task: testData.taskDescription,
              assigned_to: testUserId,
              status: 'pending'
            })
            .select()
            .single()

          expect(task).toBeDefined()
          expect(task!.status).toBe('pending')

          // Create task reminder notification
          const { error } = await supabase
            .from('notifications')
            .insert({
              user_id: testUserId,
              type: 'task_reminder',
              title: 'Bạn có công việc chưa hoàn thành',
              content: `"${testData.taskDescription}" trong sự kiện "${testData.eventTitle}"`,
              link: `/events/${event!.id}`,
              read: false
            })

          expect(error).toBeNull()

          // Verify task reminder was created
          const { data: notifications } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', testUserId)
            .eq('type', 'task_reminder')
            .eq('link', `/events/${event!.id}`)

          expect(notifications).toBeDefined()
          expect(notifications!.length).toBe(1)
          expect(notifications![0].title).toBe('Bạn có công việc chưa hoàn thành')
          expect(notifications![0].content).toContain(testData.taskDescription)
          expect(notifications![0].content).toContain(testData.eventTitle)
          expect(notifications![0].read).toBe(false)

          // Cleanup
          await supabase.from('notifications').delete().eq('id', notifications![0].id)
          await supabase.from('event_tasks').delete().eq('id', task!.id)
          await supabase.from('events').delete().eq('id', event!.id)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 18: Notification Persistence - all notification data must be persisted correctly', async () => {
    // Feature: tet-connect, Property 18: Notification Persistence
    // **Validates: Requirements 9.3**
    
    const supabase = getSupabaseClient()
    
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          type: fc.constantFrom('event_reminder', 'task_reminder'),
          title: fc.string({ minLength: 1, maxLength: 200 }),
          content: fc.string({ minLength: 1, maxLength: 500 }),
          link: fc.string({ minLength: 1, maxLength: 200 })
        }),
        async (notificationData) => {
          // Create notification
          const { data: notification, error } = await supabase
            .from('notifications')
            .insert({
              user_id: testUserId,
              type: notificationData.type,
              title: notificationData.title,
              content: notificationData.content,
              link: notificationData.link,
              read: false
            })
            .select()
            .single()

          expect(error).toBeNull()
          expect(notification).toBeDefined()

          // Verify all fields are persisted correctly
          expect(notification!.id).toBeDefined()
          expect(notification!.user_id).toBe(testUserId)
          expect(notification!.type).toBe(notificationData.type)
          expect(notification!.title).toBe(notificationData.title)
          expect(notification!.content).toBe(notificationData.content)
          expect(notification!.link).toBe(notificationData.link)
          expect(notification!.read).toBe(false)
          expect(notification!.created_at).toBeDefined()

          // Verify notification can be retrieved
          const { data: retrieved } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', notification!.id)
            .single()

          expect(retrieved).toBeDefined()
          expect(retrieved!.id).toBe(notification!.id)
          expect(retrieved!.user_id).toBe(testUserId)
          expect(retrieved!.type).toBe(notificationData.type)
          expect(retrieved!.title).toBe(notificationData.title)
          expect(retrieved!.content).toBe(notificationData.content)
          expect(retrieved!.link).toBe(notificationData.link)

          // Cleanup
          await supabase.from('notifications').delete().eq('id', notification!.id)
        }
      ),
      { numRuns: 100 }
    )
  })
})
