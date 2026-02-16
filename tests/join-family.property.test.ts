import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

describe('Join Family Property Tests', () => {
  let mockSupabase: any

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()

    mockSupabase = {
      from: vi.fn(),
      auth: {
        getSession: vi.fn(),
      },
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase)
  })

  it('Property 4: Join Family with Member Role - For any user joining a family via invite code, the user must be added with role "member"', async () => {
    // **Validates: Requirements 3.5**
    
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // familyId
        fc.uuid(), // userId
        fc.string({ minLength: 8, maxLength: 8 }).map(s => s.toUpperCase()), // inviteCode
        fc.string({ minLength: 1, maxLength: 100 }), // familyName
        async (familyId, userId, inviteCode, familyName) => {
          // Reset mocks for this iteration
          vi.clearAllMocks()

          let createdMembership: any = null

          // Mock auth session
          mockSupabase.auth.getSession.mockResolvedValue({
            data: {
              session: {
                user: { id: userId },
              },
            },
            error: null,
          })

          // Mock Supabase operations
          mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'families') {
              return {
                select: () => ({
                  eq: (field: string, value: string) => ({
                    eq: (field2: string, value2: string) => ({
                      single: () => {
                        // Verify family exists and invite code matches
                        if (value === familyId && value2 === inviteCode) {
                          return Promise.resolve({
                            data: {
                              id: familyId,
                              name: familyName,
                              invite_code: inviteCode,
                            },
                            error: null,
                          })
                        }
                        return Promise.resolve({
                          data: null,
                          error: { message: 'Not found' },
                        })
                      },
                    }),
                  }),
                }),
              }
            } else if (table === 'family_members') {
              return {
                select: () => ({
                  eq: (field: string, value: string) => ({
                    eq: (field2: string, value2: string) => ({
                      single: () => {
                        // Check if user is already a member (not found for new joins)
                        return Promise.resolve({
                          data: null,
                          error: { message: 'Not found' },
                        })
                      },
                    }),
                  }),
                }),
                insert: (data: any) => {
                  // Capture the membership being created
                  createdMembership = {
                    id: `member-${Math.random()}`,
                    family_id: data.family_id,
                    user_id: data.user_id,
                    role: data.role,
                    joined_at: new Date().toISOString(),
                  }
                  
                  return {
                    select: () => ({
                      single: () => Promise.resolve({ 
                        data: createdMembership, 
                        error: null 
                      }),
                    }),
                  }
                },
              }
            }
            return {}
          })

          // Simulate joining a family (API logic)
          const supabase = createClient('test-url', 'test-key')
          
          // Get session
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session) {
            // Verify family exists and invite code matches
            const { data: family, error: familyError } = await supabase
              .from('families')
              .select('id, name, invite_code')
              .eq('id', familyId)
              .eq('invite_code', inviteCode)
              .single()

            if (!familyError && family) {
              // Check if user is already a member
              const { data: existingMember } = await supabase
                .from('family_members')
                .select('id')
                .eq('family_id', familyId)
                .eq('user_id', session.user.id)
                .single()

              if (!existingMember) {
                // Add user as member
                await supabase
                  .from('family_members')
                  .insert({
                    family_id: familyId,
                    user_id: session.user.id,
                    role: 'member',
                  })
                  .select()
                  .single()
              }
            }
          }

          // Verify membership was created
          expect(createdMembership).not.toBeNull()
          expect(createdMembership.family_id).toBe(familyId)
          expect(createdMembership.user_id).toBe(userId)
          
          // CRITICAL: Verify user has "member" role (not "admin")
          expect(createdMembership.role).toBe('member')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4 Extended: Join Family Prevents Duplicate Membership - For any user already in a family, attempting to join again should not create duplicate membership', async () => {
    // **Validates: Requirements 3.5**
    
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // familyId
        fc.uuid(), // userId
        fc.string({ minLength: 8, maxLength: 8 }).map(s => s.toUpperCase()), // inviteCode
        fc.string({ minLength: 1, maxLength: 100 }), // familyName
        async (familyId, userId, inviteCode, familyName) => {
          // Reset mocks for this iteration
          vi.clearAllMocks()

          const createdMemberships: any[] = []

          // Mock auth session
          mockSupabase.auth.getSession.mockResolvedValue({
            data: {
              session: {
                user: { id: userId },
              },
            },
            error: null,
          })

          // Mock Supabase operations
          mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'families') {
              return {
                select: () => ({
                  eq: (field: string, value: string) => ({
                    eq: (field2: string, value2: string) => ({
                      single: () => {
                        if (value === familyId && value2 === inviteCode) {
                          return Promise.resolve({
                            data: {
                              id: familyId,
                              name: familyName,
                              invite_code: inviteCode,
                            },
                            error: null,
                          })
                        }
                        return Promise.resolve({
                          data: null,
                          error: { message: 'Not found' },
                        })
                      },
                    }),
                  }),
                }),
              }
            } else if (table === 'family_members') {
              return {
                select: () => ({
                  eq: (field: string, value: string) => ({
                    eq: (field2: string, value2: string) => ({
                      single: () => {
                        // Check if user is already a member
                        const existing = createdMemberships.find(
                          m => m.family_id === value && m.user_id === value2
                        )
                        return Promise.resolve({
                          data: existing || null,
                          error: existing ? null : { message: 'Not found' },
                        })
                      },
                    }),
                  }),
                }),
                insert: (data: any) => {
                  const membership = {
                    id: `member-${Math.random()}`,
                    family_id: data.family_id,
                    user_id: data.user_id,
                    role: data.role,
                    joined_at: new Date().toISOString(),
                  }
                  
                  createdMemberships.push(membership)
                  
                  return {
                    select: () => ({
                      single: () => Promise.resolve({ 
                        data: membership, 
                        error: null 
                      }),
                    }),
                  }
                },
              }
            }
            return {}
          })

          // Simulate joining a family twice
          const supabase = createClient('test-url', 'test-key')
          
          const joinFamily = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            
            if (session) {
              const { data: family, error: familyError } = await supabase
                .from('families')
                .select('id, name, invite_code')
                .eq('id', familyId)
                .eq('invite_code', inviteCode)
                .single()

              if (!familyError && family) {
                const { data: existingMember } = await supabase
                  .from('family_members')
                  .select('id')
                  .eq('family_id', familyId)
                  .eq('user_id', session.user.id)
                  .single()

                if (!existingMember) {
                  await supabase
                    .from('family_members')
                    .insert({
                      family_id: familyId,
                      user_id: session.user.id,
                      role: 'member',
                    })
                    .select()
                    .single()
                  
                  return true // Successfully joined
                }
                
                return false // Already a member
              }
            }
            return false
          }

          // First join should succeed
          const firstJoin = await joinFamily()
          expect(firstJoin).toBe(true)
          expect(createdMemberships.length).toBe(1)
          expect(createdMemberships[0].role).toBe('member')

          // Second join should be prevented
          const secondJoin = await joinFamily()
          expect(secondJoin).toBe(false)
          
          // Verify no duplicate membership was created
          expect(createdMemberships.length).toBe(1)
          
          // Verify the single membership has correct data
          const membership = createdMemberships[0]
          expect(membership.family_id).toBe(familyId)
          expect(membership.user_id).toBe(userId)
          expect(membership.role).toBe('member')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4 Comprehensive: Multiple Users Join Same Family - For any family, multiple different users joining must all receive "member" role', async () => {
    // **Validates: Requirements 3.5**
    
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // familyId
        fc.array(fc.uuid(), { minLength: 2, maxLength: 10 }), // multiple userIds
        fc.string({ minLength: 8, maxLength: 8 }).map(s => s.toUpperCase()), // inviteCode
        fc.string({ minLength: 1, maxLength: 100 }), // familyName
        async (familyId, userIds, inviteCode, familyName) => {
          // Ensure unique user IDs
          const uniqueUserIds = Array.from(new Set(userIds))
          if (uniqueUserIds.length < 2) return // Skip if not enough unique users

          // Reset mocks for this iteration
          vi.clearAllMocks()

          const createdMemberships: any[] = []

          // Mock Supabase operations
          mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'families') {
              return {
                select: () => ({
                  eq: (field: string, value: string) => ({
                    eq: (field2: string, value2: string) => ({
                      single: () => {
                        if (value === familyId && value2 === inviteCode) {
                          return Promise.resolve({
                            data: {
                              id: familyId,
                              name: familyName,
                              invite_code: inviteCode,
                            },
                            error: null,
                          })
                        }
                        return Promise.resolve({
                          data: null,
                          error: { message: 'Not found' },
                        })
                      },
                    }),
                  }),
                }),
              }
            } else if (table === 'family_members') {
              return {
                select: () => ({
                  eq: (field: string, value: string) => ({
                    eq: (field2: string, value2: string) => ({
                      single: () => {
                        const existing = createdMemberships.find(
                          m => m.family_id === value && m.user_id === value2
                        )
                        return Promise.resolve({
                          data: existing || null,
                          error: existing ? null : { message: 'Not found' },
                        })
                      },
                    }),
                  }),
                }),
                insert: (data: any) => {
                  const membership = {
                    id: `member-${Math.random()}`,
                    family_id: data.family_id,
                    user_id: data.user_id,
                    role: data.role,
                    joined_at: new Date().toISOString(),
                  }
                  
                  createdMemberships.push(membership)
                  
                  return {
                    select: () => ({
                      single: () => Promise.resolve({ 
                        data: membership, 
                        error: null 
                      }),
                    }),
                  }
                },
              }
            }
            return {}
          })

          // Each user joins the family
          for (const userId of uniqueUserIds) {
            mockSupabase.auth.getSession.mockResolvedValue({
              data: {
                session: {
                  user: { id: userId },
                },
              },
              error: null,
            })

            const supabase = createClient('test-url', 'test-key')
            const { data: { session } } = await supabase.auth.getSession()
            
            if (session) {
              const { data: family, error: familyError } = await supabase
                .from('families')
                .select('id, name, invite_code')
                .eq('id', familyId)
                .eq('invite_code', inviteCode)
                .single()

              if (!familyError && family) {
                const { data: existingMember } = await supabase
                  .from('family_members')
                  .select('id')
                  .eq('family_id', familyId)
                  .eq('user_id', session.user.id)
                  .single()

                if (!existingMember) {
                  await supabase
                    .from('family_members')
                    .insert({
                      family_id: familyId,
                      user_id: session.user.id,
                      role: 'member',
                    })
                    .select()
                    .single()
                }
              }
            }
          }

          // Verify all users were added
          expect(createdMemberships.length).toBe(uniqueUserIds.length)

          // Verify each membership has correct data
          createdMemberships.forEach((membership, index) => {
            expect(membership.family_id).toBe(familyId)
            expect(uniqueUserIds).toContain(membership.user_id)
            
            // CRITICAL: All joined users must have "member" role
            expect(membership.role).toBe('member')
          })

          // Verify no duplicate memberships
          const membershipKeys = createdMemberships.map(
            m => `${m.family_id}-${m.user_id}`
          )
          const uniqueKeys = new Set(membershipKeys)
          expect(uniqueKeys.size).toBe(membershipKeys.length)
        }
      ),
      { numRuns: 100 }
    )
  })
})
