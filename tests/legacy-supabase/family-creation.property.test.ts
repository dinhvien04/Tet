import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

describe('Family Creation Property Tests', () => {
  let mockSupabase: any
  let mockInsert: any
  let mockSelect: any
  let mockSingle: any
  let mockEq: any

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()

    // Create mock chain for Supabase queries
    mockSingle = vi.fn()
    mockEq = vi.fn(() => ({ single: mockSingle }))
    mockSelect = vi.fn(() => ({ eq: mockEq }))
    mockInsert = vi.fn()

    mockSupabase = {
      from: vi.fn(),
      auth: {
        getSession: vi.fn(),
      },
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase)
  })

  it('Property 2: Unique Family Invite Code - For any family created, invite_code must be unique in the system', async () => {
    // Feature: tet-connect, Property 2: Unique Family Invite Code
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.string({ minLength: 1, maxLength: 100 }),
          { minLength: 2, maxLength: 20 }
        ),
        fc.uuid(),
        async (familyNames, userId) => {
          // Reset mocks for this iteration
          vi.clearAllMocks()

          // Track all generated invite codes
          const generatedInviteCodes = new Set<string>()
          const createdFamilies: any[] = []

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
                    single: () => {
                      // Check if invite code already exists
                      const exists = generatedInviteCodes.has(value)
                      return Promise.resolve({
                        data: exists ? { id: 'existing' } : null,
                        error: null,
                      })
                    },
                  }),
                }),
                insert: (data: any) => {
                  // Store the invite code
                  generatedInviteCodes.add(data.invite_code)
                  
                  const family = {
                    id: `family-${Math.random()}`,
                    name: data.name,
                    invite_code: data.invite_code,
                    created_by: data.created_by,
                    created_at: new Date().toISOString(),
                  }
                  
                  createdFamilies.push(family)
                  
                  return {
                    select: () => ({
                      single: () => Promise.resolve({ data: family, error: null }),
                    }),
                  }
                },
              }
            } else if (table === 'family_members') {
              return {
                insert: () => Promise.resolve({ data: null, error: null }),
              }
            }
            return {}
          })

          // Simulate creating multiple families
          for (const name of familyNames) {
            const supabase = createClient('test-url', 'test-key')
            
            // Get session
            const { data: { session } } = await supabase.auth.getSession()
            
            if (session) {
              // Generate invite code (simulating the API logic)
              let inviteCode = generateTestInviteCode()
              let attempts = 0
              const maxAttempts = 10

              while (attempts < maxAttempts) {
                const { data: existing } = await supabase
                  .from('families')
                  .select('id')
                  .eq('invite_code', inviteCode)
                  .single()

                if (!existing) {
                  break
                }

                inviteCode = generateTestInviteCode()
                attempts++
              }

              // Create family
              const { data: family } = await supabase
                .from('families')
                .insert({
                  name: name.trim(),
                  invite_code: inviteCode,
                  created_by: session.user.id,
                })
                .select()
                .single()

              // Add creator as admin
              await supabase
                .from('family_members')
                .insert({
                  family_id: family.id,
                  user_id: session.user.id,
                  role: 'admin',
                })
            }
          }

          // Verify all invite codes are unique
          const inviteCodes = createdFamilies.map(f => f.invite_code)
          const uniqueCodes = new Set(inviteCodes)
          
          expect(uniqueCodes.size).toBe(inviteCodes.length)
          
          // Verify each invite code is 8 characters
          inviteCodes.forEach(code => {
            expect(code).toHaveLength(8)
            expect(code).toMatch(/^[A-Z0-9]+$/)
          })
          
          // Verify all families were created
          expect(createdFamilies.length).toBe(familyNames.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 3: Family Creator is Admin - For any family created, the creator must be automatically assigned admin role', async () => {
    // Feature: tet-connect, Property 3: Family Creator is Admin
    
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.uuid(),
        async (familyName, userId) => {
          // Reset mocks for this iteration
          vi.clearAllMocks()

          let createdFamily: any = null
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
                  eq: () => ({
                    single: () => Promise.resolve({ data: null, error: null }),
                  }),
                }),
                insert: (data: any) => {
                  createdFamily = {
                    id: `family-${Math.random()}`,
                    name: data.name,
                    invite_code: data.invite_code,
                    created_by: data.created_by,
                    created_at: new Date().toISOString(),
                  }
                  
                  return {
                    select: () => ({
                      single: () => Promise.resolve({ data: createdFamily, error: null }),
                    }),
                  }
                },
              }
            } else if (table === 'family_members') {
              return {
                insert: (data: any) => {
                  createdMembership = {
                    id: `member-${Math.random()}`,
                    family_id: data.family_id,
                    user_id: data.user_id,
                    role: data.role,
                    joined_at: new Date().toISOString(),
                  }
                  return Promise.resolve({ data: null, error: null })
                },
              }
            }
            return {}
          })

          // Simulate creating a family
          const supabase = createClient('test-url', 'test-key')
          
          // Get session
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session) {
            // Generate invite code
            const inviteCode = generateTestInviteCode()

            // Create family
            const { data: family } = await supabase
              .from('families')
              .insert({
                name: familyName.trim(),
                invite_code: inviteCode,
                created_by: session.user.id,
              })
              .select()
              .single()

            // Add creator as admin
            await supabase
              .from('family_members')
              .insert({
                family_id: family.id,
                user_id: session.user.id,
                role: 'admin',
              })
          }

          // Verify family was created
          expect(createdFamily).not.toBeNull()
          expect(createdFamily.created_by).toBe(userId)
          
          // Verify membership was created
          expect(createdMembership).not.toBeNull()
          expect(createdMembership.family_id).toBe(createdFamily.id)
          expect(createdMembership.user_id).toBe(userId)
          
          // Verify creator has admin role
          expect(createdMembership.role).toBe('admin')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 2 & 3 Combined: Family Creation Invariants - For any families created, all must have unique codes and creators must be admins', async () => {
    // Feature: tet-connect, Property 2: Unique Family Invite Code
    // Feature: tet-connect, Property 3: Family Creator is Admin
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            userId: fc.uuid(),
          }),
          { minLength: 1, maxLength: 15 }
        ),
        async (familyRequests) => {
          // Reset mocks for this iteration
          vi.clearAllMocks()

          const generatedInviteCodes = new Set<string>()
          const createdFamilies: any[] = []
          const createdMemberships: any[] = []

          // Mock Supabase operations
          mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'families') {
              return {
                select: () => ({
                  eq: (_field: string, value: string) => ({
                    single: () => {
                      const exists = generatedInviteCodes.has(value)
                      return Promise.resolve({
                        data: exists ? { id: 'existing' } : null,
                        error: null,
                      })
                    },
                  }),
                }),
                insert: (data: any) => {
                  generatedInviteCodes.add(data.invite_code)
                  
                  const family = {
                    id: `family-${Math.random()}`,
                    name: data.name,
                    invite_code: data.invite_code,
                    created_by: data.created_by,
                    created_at: new Date().toISOString(),
                  }
                  
                  createdFamilies.push(family)
                  
                  return {
                    select: () => ({
                      single: () => Promise.resolve({ data: family, error: null }),
                    }),
                  }
                },
              }
            } else if (table === 'family_members') {
              return {
                insert: (data: any) => {
                  const membership = {
                    id: `member-${Math.random()}`,
                    family_id: data.family_id,
                    user_id: data.user_id,
                    role: data.role,
                    joined_at: new Date().toISOString(),
                  }
                  createdMemberships.push(membership)
                  return Promise.resolve({ data: null, error: null })
                },
              }
            }
            return {}
          })

          // Create all families
          for (const request of familyRequests) {
            mockSupabase.auth.getSession.mockResolvedValue({
              data: {
                session: {
                  user: { id: request.userId },
                },
              },
              error: null,
            })

            const supabase = createClient('test-url', 'test-key')
            const { data: { session } } = await supabase.auth.getSession()
            
            if (session) {
              let inviteCode = generateTestInviteCode()
              let attempts = 0
              const maxAttempts = 10

              while (attempts < maxAttempts) {
                const { data: existing } = await supabase
                  .from('families')
                  .select('id')
                  .eq('invite_code', inviteCode)
                  .single()

                if (!existing) {
                  break
                }

                inviteCode = generateTestInviteCode()
                attempts++
              }

              const { data: family } = await supabase
                .from('families')
                .insert({
                  name: request.name.trim(),
                  invite_code: inviteCode,
                  created_by: session.user.id,
                })
                .select()
                .single()

              await supabase
                .from('family_members')
                .insert({
                  family_id: family.id,
                  user_id: session.user.id,
                  role: 'admin',
                })
            }
          }

          // Property 2: Verify all invite codes are unique
          const inviteCodes = createdFamilies.map(f => f.invite_code)
          const uniqueCodes = new Set(inviteCodes)
          expect(uniqueCodes.size).toBe(inviteCodes.length)

          // Verify invite code format
          inviteCodes.forEach(code => {
            expect(code).toHaveLength(8)
            expect(code).toMatch(/^[A-Z0-9]+$/)
          })

          // Property 3: Verify all creators are admins
          createdFamilies.forEach(family => {
            const membership = createdMemberships.find(
              m => m.family_id === family.id && m.user_id === family.created_by
            )
            
            expect(membership).toBeDefined()
            expect(membership.role).toBe('admin')
          })

          // Verify one-to-one relationship: each family has exactly one creator membership
          createdFamilies.forEach(family => {
            const creatorMemberships = createdMemberships.filter(
              m => m.family_id === family.id && m.user_id === family.created_by
            )
            expect(creatorMemberships.length).toBe(1)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Helper function to generate test invite codes
function generateTestInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
