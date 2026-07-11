import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockMemberCount = vi.hoisted(() => vi.fn())
const mockFamilyAdminFindOne = vi.hoisted(() => vi.fn())
const mockFamilyAdminCreate = vi.hoisted(() => vi.fn())
const mockFamilyAdminFindOneAndUpdate = vi.hoisted(() => vi.fn())
const mockFamilyAdminUpdateOne = vi.hoisted(() => vi.fn())
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
    updateOne: (...a: unknown[]) => mockFamilyAdminUpdateOne(...a),
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

  it('casDecrementFamilyAdmin fails when actual adminCount <= 1', async () => {
    mockFamilyAdminFindOneAndUpdate.mockResolvedValue({ version: 1 })
    mockMemberCount.mockResolvedValue(1)

    const ok = await casDecrementFamilyAdmin('507f1f77bcf86cd799439011')
    expect(ok).toBe(false)
    expect(mockMemberCount).toHaveBeenCalled()
  })

  it('casDecrementFamilyAdmin succeeds when actual > 1', async () => {
    mockFamilyAdminFindOneAndUpdate.mockResolvedValue({ version: 2, adminCount: 1 })
    mockMemberCount.mockResolvedValue(2)

    const ok = await casDecrementFamilyAdmin('507f1f77bcf86cd799439011')
    expect(ok).toBe(true)
  })

  it('casDecrementSystemAdmin protects last system admin', async () => {
    mockSystemFindOneAndUpdate.mockResolvedValue({ version: 1 })
    mockUserCount.mockResolvedValue(1)

    const ok = await casDecrementSystemAdmin()
    expect(ok).toBe(false)
  })

  it('ensureFamilyAdminState returns actual count', async () => {
    mockMemberCount.mockResolvedValue(2)
    mockFamilyAdminFindOne.mockResolvedValue({ adminCount: 2, version: 3 })
    const s = await ensureFamilyAdminState('507f1f77bcf86cd799439011')
    expect(s.adminCount).toBe(2)
  })
})
