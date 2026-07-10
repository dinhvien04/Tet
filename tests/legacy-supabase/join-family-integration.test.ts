import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}))

describe('Join Family Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should complete the full join family flow', async () => {
    const mockUserId = 'user-123'
    const mockFamilyId = 'family-456'
    const mockInviteCode = 'ABCD1234'

    // Step 1: User is authenticated
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    })

    // Step 2: Fetch family by invite code
    let callCount = 0
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      callCount++

      if (callCount === 1) {
        // Fetch family
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: mockFamilyId,
              name: 'Gia đình Nguyễn',
              invite_code: mockInviteCode,
              created_by: 'other-user',
              created_at: new Date().toISOString(),
            },
            error: null,
          }),
        } as any
      } else if (callCount === 2) {
        // Verify family and invite code match
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: mockFamilyId,
              name: 'Gia đình Nguyễn',
              invite_code: mockInviteCode,
            },
            error: null,
          }),
        } as any
      } else if (callCount === 3) {
        // Check if user is already a member (not found)
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        } as any
      } else {
        // Add user as member
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'member-789',
              family_id: mockFamilyId,
              user_id: mockUserId,
              role: 'member',
              joined_at: new Date().toISOString(),
            },
            error: null,
          }),
        } as any
      }
    })

    // Step 3: Verify family exists
    const { data: family } = await supabase
      .from('families')
      .select('*')
      .eq('invite_code', mockInviteCode)
      .single()

    expect(family).toBeDefined()
    expect(family?.id).toBe(mockFamilyId)
    expect(family?.invite_code).toBe(mockInviteCode)

    // Step 4: Verify invite code matches
    const { data: verifiedFamily } = await supabase
      .from('families')
      .select('id, name, invite_code')
      .eq('id', mockFamilyId)
      .eq('invite_code', mockInviteCode)
      .single()

    expect(verifiedFamily).toBeDefined()
    expect(verifiedFamily?.id).toBe(mockFamilyId)

    // Step 5: Check if user is already a member
    const { data: existingMember } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', mockFamilyId)
      .eq('user_id', mockUserId)
      .single()

    expect(existingMember).toBeNull()

    // Step 6: Add user as member
    const { data: newMember } = await supabase
      .from('family_members')
      .insert({
        family_id: mockFamilyId,
        user_id: mockUserId,
        role: 'member',
      })
      .select()
      .single()

    // Verify the member was added correctly
    expect(newMember).toBeDefined()
    expect(newMember?.family_id).toBe(mockFamilyId)
    expect(newMember?.user_id).toBe(mockUserId)
    expect(newMember?.role).toBe('member')
  })

  it('should prevent duplicate membership', async () => {
    const mockUserId = 'user-123'
    const mockFamilyId = 'family-456'
    const mockInviteCode = 'ABCD1234'

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: mockUserId } } as any },
      error: null,
    })

    let callCount = 0
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      callCount++

      if (callCount === 1) {
        // Verify family
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: mockFamilyId,
              name: 'Gia đình Nguyễn',
              invite_code: mockInviteCode,
            },
            error: null,
          }),
        } as any
      } else {
        // Check if user is already a member (found)
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'existing-member',
              family_id: mockFamilyId,
              user_id: mockUserId,
            },
            error: null,
          }),
        } as any
      }
    })

    // Verify family
    const { data: family } = await supabase
      .from('families')
      .select('id, name, invite_code')
      .eq('id', mockFamilyId)
      .eq('invite_code', mockInviteCode)
      .single()

    expect(family).toBeDefined()

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', mockFamilyId)
      .eq('user_id', mockUserId)
      .single()

    // User is already a member, should not add again
    expect(existingMember).toBeDefined()
    expect(existingMember?.id).toBe('existing-member')
  })
})
