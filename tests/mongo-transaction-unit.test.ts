import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn(async () => ({})),
}))

vi.mock('mongoose', () => {
  const connection = {
    db: {
      admin: () => ({
        command: vi.fn(async () => ({})), // standalone — no setName
      }),
    },
    transaction: vi.fn(),
  }
  return {
    default: { connection },
    connection,
  }
})

describe('withMongoTransaction', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('runs without session on standalone when not required', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.REQUIRE_MONGO_TRANSACTIONS
    const { withMongoTransaction } = await import('@/lib/mongo-transaction')
    // reset module-level cache by re-import after setting env
    const result = await withMongoTransaction(async (session) => {
      expect(session).toBeUndefined()
      return 42
    }, { requireReplicaSet: false })
    expect(result).toBe(42)
  })
})
