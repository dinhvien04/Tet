import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { createClient } from '@/lib/supabase'

describe('Events Property Tests', () => {
  let supabase: ReturnType<typeof createClient>
  let testUserId: string
  let testFamilyId: string

  beforeEach(async () => {
    supabase = createClient()
    
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
    // Cleanup
    if (testFamilyId) {
      await supabase.from('events').delete().eq('family_id', testFamilyId)
      await supabase.from('family_members').delete().eq('family_id', testFamilyId)
      await supabase.from('families').delete().eq('id', testFamilyId)
    }
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId)
    }
    await supabase.auth.signOut()
  })

  it('Property 11: Event Persistence - all event data must be persisted correctly', async () => {
    // Feature: tet-connect, Property 11: Event Persistence
    // **Validates: Requirements 7.4**
    
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          date: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
          location: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null })
        }),
        async (eventData) => {
          // Create event
          const { data: event, error } = await supabase
            .from('events')
            .insert({
              family_id: testFamilyId,
              title: eventData.title,
              date: eventData.date.toISOString(),
              location: eventData.location,
              created_by: testUserId
            })
            .select()
            .single()

          expect(error).toBeNull()
          expect(event).toBeDefined()
          
          // Verify all fields are persisted
          expect(event!.id).toBeDefined()
          expect(event!.family_id).toBe(testFamilyId)
          expect(event!.title).toBe(eventData.title)
          expect(new Date(event!.date).toISOString()).toBe(eventData.date.toISOString())
          expect(event!.location).toBe(eventData.location)
          expect(event!.created_by).toBe(testUserId)
          expect(event!.created_at).toBeDefined()

          // Cleanup
          await supabase.from('events').delete().eq('id', event!.id)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 12: Event Timeline Ordering - events must be ordered by date', async () => {
    // Feature: tet-connect, Property 12: Event Timeline Ordering
    // **Validates: Requirements 7.5**
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 50 }),
            date: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') })
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (eventsData) => {
          // Create multiple events
          const createdEvents = []
          for (const eventData of eventsData) {
            const { data: event } = await supabase
              .from('events')
              .insert({
                family_id: testFamilyId,
                title: eventData.title,
                date: eventData.date.toISOString(),
                created_by: testUserId
              })
              .select()
              .single()
            
            if (event) {
              createdEvents.push(event)
            }
          }

          // Fetch events ordered by date
          const { data: fetchedEvents } = await supabase
            .from('events')
            .select('*')
            .eq('family_id', testFamilyId)
            .order('date', { ascending: true })

          expect(fetchedEvents).toBeDefined()
          expect(fetchedEvents!.length).toBe(createdEvents.length)

          // Verify ordering
          for (let i = 0; i < fetchedEvents!.length - 1; i++) {
            const currentDate = new Date(fetchedEvents![i].date).getTime()
            const nextDate = new Date(fetchedEvents![i + 1].date).getTime()
            expect(currentDate).toBeLessThanOrEqual(nextDate)
          }

          // Cleanup
          for (const event of createdEvents) {
            await supabase.from('events').delete().eq('id', event.id)
          }
        }
      ),
      { numRuns: 50 }
    )
  })
})
