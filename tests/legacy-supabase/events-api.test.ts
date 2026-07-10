import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createClient } from '@/lib/supabase'

describe('Events API', () => {
  let supabase: ReturnType<typeof createClient>
  let testUserId: string
  let testFamilyId: string

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

    await supabase.from('family_members').insert({
      family_id: testFamilyId,
      user_id: testUserId,
      role: 'admin'
    })
  })

  afterEach(async () => {
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

  it('should create event with valid data', async () => {
    const eventData = {
      family_id: testFamilyId,
      title: 'Cúng tất niên',
      date: new Date('2025-01-28T18:00:00').toISOString(),
      location: 'Nhà ông bà nội',
      created_by: testUserId
    }

    const { data: event, error } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single()

    expect(error).toBeNull()
    expect(event).toBeDefined()
    expect(event!.title).toBe(eventData.title)
    expect(event!.location).toBe(eventData.location)
  })

  it('should reject event creation without required fields', async () => {
    const { error } = await supabase
      .from('events')
      .insert({
        family_id: testFamilyId,
        // Missing title and date
        created_by: testUserId
      })

    expect(error).toBeDefined()
  })

  it('should fetch events for a family ordered by date', async () => {
    // Create multiple events
    const events = [
      {
        family_id: testFamilyId,
        title: 'Event 1',
        date: new Date('2025-01-30').toISOString(),
        created_by: testUserId
      },
      {
        family_id: testFamilyId,
        title: 'Event 2',
        date: new Date('2025-01-28').toISOString(),
        created_by: testUserId
      },
      {
        family_id: testFamilyId,
        title: 'Event 3',
        date: new Date('2025-02-01').toISOString(),
        created_by: testUserId
      }
    ]

    await supabase.from('events').insert(events)

    const { data: fetchedEvents } = await supabase
      .from('events')
      .select('*')
      .eq('family_id', testFamilyId)
      .order('date', { ascending: true })

    expect(fetchedEvents).toBeDefined()
    expect(fetchedEvents!.length).toBe(3)
    expect(fetchedEvents![0].title).toBe('Event 2')
    expect(fetchedEvents![1].title).toBe('Event 1')
    expect(fetchedEvents![2].title).toBe('Event 3')
  })

  it('should allow event creation without location', async () => {
    const { data: event, error } = await supabase
      .from('events')
      .insert({
        family_id: testFamilyId,
        title: 'Event without location',
        date: new Date().toISOString(),
        created_by: testUserId
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(event!.location).toBeNull()
  })
})
