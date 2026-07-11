/**
 * Real Mongoose schema + soft-delete for credentials users.
 * Uses live Mongo when MONGODB_URI is available; skips otherwise.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import mongoose from 'mongoose'
import {
  connectIntegrationDb,
  dropIntegrationDb,
  getIntegrationMongoUri,
} from './mongo-rs-helpers'
import User from '@/lib/models/User'
import { hashPassword } from '@/lib/auth'

const uri = getIntegrationMongoUri()
const describeIf = uri ? describe : describe.skip

describeIf('Account deletion schema (live Mongo)', () => {
  beforeAll(async () => {
    await connectIntegrationDb(uri!)
  }, 20_000)

  afterAll(async () => {
    try {
      await dropIntegrationDb()
    } finally {
      await mongoose.disconnect().catch(() => undefined)
    }
  })

  it('credentials user soft-delete unsets password and validates', async () => {
    const email = `cred-${Date.now()}@example.com`
    const password = await hashPassword('Password1')
    const user = await User.create({
      email,
      name: 'Cred User',
      password,
      provider: 'credentials',
      status: 'active',
      role: 'user',
      sessionVersion: 0,
    })

    user.status = 'deleted'
    user.deletedAt = new Date()
    user.sessionVersion = (user.sessionVersion || 0) + 1
    user.email = `deleted+${user._id.toString()}@invalid.local`
    user.name = 'Tài khoản đã xóa'
    user.password = undefined
    await user.save()

    const reloaded = await User.findById(user._id)
    expect(reloaded?.status).toBe('deleted')
    expect(reloaded?.password).toBeFalsy()
    expect(reloaded?.sessionVersion).toBe(1)

    // Active credentials without password still fails validation
    const bad = new User({
      email: `active-${Date.now()}@example.com`,
      name: 'Bad',
      provider: 'credentials',
      status: 'active',
    })
    await expect(bad.validate()).rejects.toBeTruthy()
  })

  it('google user deletes without password field', async () => {
    const user = await User.create({
      email: `g-${Date.now()}@example.com`,
      name: 'Google User',
      provider: 'google',
      status: 'active',
      role: 'user',
    })
    user.status = 'deleted'
    user.sessionVersion = 1
    user.email = `deleted+${user._id.toString()}@invalid.local`
    user.name = 'Tài khoản đã xóa'
    await user.save()
    expect(user.status).toBe('deleted')
  })
})
