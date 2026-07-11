/**
 * Schema-level proof: credentials user soft-delete must not fail password.required.
 * Uses Mongoose document validation without a live DB connection when possible.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import mongoose from 'mongoose'

describe('User password required vs soft-delete', () => {
  beforeAll(async () => {
    // Ensure model is registered
    await import('@/lib/models/User')
  })

  it('requires password for active credentials user', async () => {
    const User = mongoose.models.User
    const doc = new User({
      email: 'active-cred@example.com',
      name: 'Active',
      provider: 'credentials',
      status: 'active',
      role: 'user',
    })
    const err = doc.validateSync()
    expect(err?.errors?.password).toBeTruthy()
  })

  it('allows deleted credentials user without password', async () => {
    const User = mongoose.models.User
    const doc = new User({
      email: 'deleted+507f1f77bcf86cd799439011@invalid.local',
      name: 'Tài khoản đã xóa',
      provider: 'credentials',
      status: 'deleted',
      role: 'user',
      sessionVersion: 1,
      deletedAt: new Date(),
    })
    // Explicitly no password
    doc.password = undefined
    const err = doc.validateSync()
    expect(err?.errors?.password).toBeUndefined()
  })

  it('google user never requires password', async () => {
    const User = mongoose.models.User
    const doc = new User({
      email: 'g@example.com',
      name: 'G',
      provider: 'google',
      status: 'active',
      role: 'user',
    })
    const err = doc.validateSync()
    expect(err?.errors?.password).toBeUndefined()
  })
})
