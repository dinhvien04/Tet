import type { ClientSession } from 'mongoose'
import FamilyMember from '@/lib/models/FamilyMember'
import FamilyAdminState from '@/lib/models/FamilyAdminState'
import SystemAdminState from '@/lib/models/SystemAdminState'
import User from '@/lib/models/User'

export class InvariantViolationError extends Error {
  status = 400
  constructor(message: string) {
    super(message)
    this.name = 'InvariantViolationError'
  }
}

const sessionOpt = (session?: ClientSession) => (session ? { session } : {})

/**
 * Ensure FamilyAdminState exists and matches actual admin count (best-effort bootstrap).
 * Must run inside a transaction when concurrent mutations are possible.
 */
export async function ensureFamilyAdminState(
  familyId: string | { toString(): string },
  session?: ClientSession
): Promise<{ adminCount: number; version: number }> {
  const fid = familyId.toString()
  const actual = await FamilyMember.countDocuments(
    { familyId: fid, role: 'admin' },
    sessionOpt(session)
  )

  const existing = await FamilyAdminState.findOne({ familyId: fid }, null, sessionOpt(session))
  if (existing) {
    return { adminCount: existing.adminCount, version: existing.version }
  }

  try {
    await FamilyAdminState.create(
      [
        {
          familyId: fid,
          adminCount: Math.max(actual, 0),
          version: 0,
          updatedAt: new Date(),
        },
      ],
      session ? { session } : undefined
    )
  } catch (err: unknown) {
    const e = err as { code?: number }
    if (e.code !== 11000) throw err
  }

  const state = await FamilyAdminState.findOne({ familyId: fid }, null, sessionOpt(session))
  return {
    adminCount: state?.adminCount ?? actual,
    version: state?.version ?? 0,
  }
}

/**
 * CAS-demote/delete one family admin: requires adminCount > 1 before decrement.
 * Returns false if CAS failed (caller should throw LastAdminError).
 */
export async function casDecrementFamilyAdmin(
  familyId: string | { toString(): string },
  session?: ClientSession
): Promise<boolean> {
  const fid = familyId.toString()
  await ensureFamilyAdminState(fid, session)

  const updated = await FamilyAdminState.findOneAndUpdate(
    { familyId: fid, adminCount: { $gt: 1 } },
    {
      $inc: { adminCount: -1, version: 1 },
      $set: { updatedAt: new Date() },
    },
    { new: true, ...sessionOpt(session) }
  )

  return Boolean(updated)
}

/**
 * CAS-promote member to admin: increment adminCount.
 */
export async function casIncrementFamilyAdmin(
  familyId: string | { toString(): string },
  session?: ClientSession
): Promise<void> {
  const fid = familyId.toString()
  await ensureFamilyAdminState(fid, session)

  await FamilyAdminState.findOneAndUpdate(
    { familyId: fid },
    {
      $inc: { adminCount: 1, version: 1 },
      $set: { updatedAt: new Date() },
    },
    { upsert: true, ...sessionOpt(session) }
  )
}

export async function ensureSystemAdminState(
  session?: ClientSession
): Promise<{ adminCount: number; version: number }> {
  const actual = await User.countDocuments(
    { role: 'admin', status: { $ne: 'deleted' } },
    sessionOpt(session)
  )

  const existing = await SystemAdminState.findOne(
    { key: 'system-admin' },
    null,
    sessionOpt(session)
  )
  if (existing) {
    return { adminCount: existing.adminCount, version: existing.version }
  }

  try {
    await SystemAdminState.create(
      [
        {
          key: 'system-admin',
          adminCount: Math.max(actual, 0),
          version: 0,
          updatedAt: new Date(),
        },
      ],
      session ? { session } : undefined
    )
  } catch (err: unknown) {
    const e = err as { code?: number }
    if (e.code !== 11000) throw err
  }

  const state = await SystemAdminState.findOne(
    { key: 'system-admin' },
    null,
    sessionOpt(session)
  )
  return {
    adminCount: state?.adminCount ?? actual,
    version: state?.version ?? 0,
  }
}

/**
 * Demote/delete a system admin: CAS adminCount > 1.
 */
export async function casDecrementSystemAdmin(
  session?: ClientSession
): Promise<boolean> {
  await ensureSystemAdminState(session)

  const updated = await SystemAdminState.findOneAndUpdate(
    { key: 'system-admin', adminCount: { $gt: 1 } },
    {
      $inc: { adminCount: -1, version: 1 },
      $set: { updatedAt: new Date() },
    },
    { new: true, ...sessionOpt(session) }
  )

  return Boolean(updated)
}

export async function casIncrementSystemAdmin(
  session?: ClientSession
): Promise<void> {
  await ensureSystemAdminState(session)

  await SystemAdminState.findOneAndUpdate(
    { key: 'system-admin' },
    {
      $inc: { adminCount: 1, version: 1 },
      $set: { updatedAt: new Date() },
    },
    { upsert: true, ...sessionOpt(session) }
  )
}
