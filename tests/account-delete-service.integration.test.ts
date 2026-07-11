/**
 * Calls production deleteUserAccount service (not schema-only).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import mongoose from 'mongoose'
import {
  connectIntegrationDb,
  dropIntegrationDb,
  getIntegrationMongoUri,
  isReplicaSetReady,
} from './mongo-rs-helpers'
import { resetMongoTransactionCache } from '@/lib/mongo-transaction'
import { deleteUserAccount } from '@/lib/services/account/delete-account'
import User from '@/lib/models/User'
import Photo from '@/lib/models/Photo'
import StorageCleanupJob from '@/lib/models/StorageCleanupJob'
import { hashPassword } from '@/lib/auth'

const uri = getIntegrationMongoUri()
const requireRs = process.env.REQUIRE_MONGO_RS === 'true'
const describeIf = uri || requireRs ? describe : describe.skip

describeIf('deleteUserAccount production service', () => {
  beforeAll(async () => {
    if (!uri) {
      if (requireRs) throw new Error('MONGODB_URI required')
      return
    }
    await connectIntegrationDb(uri)
    resetMongoTransactionCache()
    if (!(await isReplicaSetReady()) && requireRs) {
      throw new Error('Replica set required')
    }
  }, 30_000)

  afterAll(async () => {
    try {
      await dropIntegrationDb()
    } finally {
      await mongoose.disconnect().catch(() => undefined)
    }
  })

  it('soft-deletes credentials user and creates cleanup outbox in TX', async () => {
    const password = await hashPassword('Password1')
    const user = await User.create({
      email: `del-${Date.now()}@example.com`,
      name: 'Delete Me',
      password,
      provider: 'credentials',
      status: 'active',
      role: 'user',
      sessionVersion: 0,
    })

    await Photo.create({
      familyId: new mongoose.Types.ObjectId(),
      userId: user._id,
      url: 'https://res.cloudinary.com/demo/image/upload/x.jpg',
      publicId: `tet-connect/test/${user._id.toString()}/x`,
    })

    const result = await deleteUserAccount({
      userId: user._id.toString(),
      requestId: 'test-req-1',
    })
    expect(result.success).toBe(true)
    expect(result.cleanupPending).toBe(true)

    const reloaded = await User.findById(user._id)
    expect(reloaded?.status).toBe('deleted')
    expect(reloaded?.password).toBeFalsy()
    expect(reloaded?.sessionVersion).toBe(1)

    const photos = await Photo.countDocuments({ userId: user._id })
    expect(photos).toBe(0)

    const jobs = await StorageCleanupJob.find({ userId: user._id })
    expect(jobs.length).toBeGreaterThanOrEqual(1)
    expect(jobs[0].idempotencyKey).toContain('account-delete')
    expect(jobs[0].status).toBe('pending')

    // Idempotent second call
    const again = await deleteUserAccount({ userId: user._id.toString() })
    expect(again.alreadyDeleted).toBe(true)
  })
})
