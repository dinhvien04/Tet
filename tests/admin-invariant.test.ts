import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockMemberCount = vi.hoisted(() => vi.fn())
const mockFamilyAdminFindOne = vi.hoisted(() => vi.fn())
const mockFamilyAdminCreate = vi.hoisted(() => vi.fn())
const mockFamilyAdminFindOneAndUpdate = vi.hoisted(() => vi.fn())
const mockUserCount = vi.hoisted(() => vi.fn())
const mockSystemFindOne = vi.hoisted(() => vi.fn())
const mockSystemCreate = vi.hoisted(() => vi.fn())
const mockSystemFindOneAndUpdate = vi.hoisted(() => vi.fn())

vi.mock('@/lib/models/FamilyMember', () => ({
  default: { countDocuments: (...a: unknown[]) => mockMemberCount(...a) },
}))
vi.mock('@/lib/models/FamilyAdminState', () => ({
  default: {
    findOne: (...a: unknown[]) => mockFamilyAdminFindOne(...a),
    create: (...a: unknown[]) => mockFamilyAdminCreate(...a),
    findOneAndUpdate: (...a: unknown[]) => mockFamilyAdminFindOneAndUpdate(...a),
  },
}))
vi.mock('@/lib/models/User', () => ({
  default: { countDocuments: (...a: unknown[]) => mockUserCount(...a) },
}))
vi.mock('@/lib/models/SystemAdminState', () => ({
  default: {
    findOne: (...a: unknown[]) => mockSystemFindOne(...a),
    create: (...a: unknown[]) => mockSystemCreate(...a),
    findOneAndUpdate: (...a: unknown[]) => mockSystemFindOneAndUpdate(...a),
  },
}))

import {
  casDecrementFamilyAdmin,
  casDecrementSystemAdmin,
  ensureFamilyAdminState,
} from '@/lib/admin-invariant'

describe('admin invariant CAS', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('casDecrementFamilyAdmin fails when adminCount would drop below 1', async () => {
    mockMemberCount.mockResolvedValue(1)
    mockFamilyAdminFindOne.mockResolvedValue({ adminCount: 1, version: 0 })
    mockFamilyAdminFindOneAndUpdate.mockResolvedValue(null)

    const ok = await casDecrementFamilyAdmin('507f1f77bcf86cd799439011')
    expect(ok).toBe(false)
    expect(mockFamilyAdminFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ adminCount: { $gt: 1 } }),
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('casDecrementFamilyAdmin succeeds when adminCount > 1', async () => {
    mockMemberCount.mockResolvedValue(2)
    mockFamilyAdminFindOne.mockResolvedValue({ adminCount: 2, version: 1 })
    mockFamilyAdminFindOneAndUpdate.mockResolvedValue({ adminCount: 1, version: 2 })

    const ok = await casDecrementFamilyAdmin('507f1f77bcf86cd799439011')
    expect(ok).toBe(true)
  })

  it('casDecrementSystemAdmin protects last system admin', async () => {
    mockUserCount.mockResolvedValue(1)
    mockSystemFindOne.mockResolvedValue({ adminCount: 1, version: 0 })
    mockSystemFindOneAndUpdate.mockResolvedValue(null)

    const ok = await casDecrementSystemAdmin()
    expect(ok).toBe(false)
  })

  it('ensureFamilyAdminState returns existing', async () => {
    mockMemberCount.mockResolvedValue(2)
    mockFamilyAdminFindOne.mockResolvedValue({ adminCount: 2, version: 3 })
    const s = await ensureFamilyAdminState('507f1f77bcf86cd799439011')
    expect(s).toEqual({ adminCount: 2, version: 3 })
  })
})
