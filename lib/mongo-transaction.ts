import mongoose, { type ClientSession } from 'mongoose'
import { connectDB } from '@/lib/mongodb'

export class TransactionNotSupportedError extends Error {
  constructor(message = 'MongoDB transactions require a replica set') {
    super(message)
    this.name = 'TransactionNotSupportedError'
  }
}

const NEGATIVE_TTL_MS = 15_000
const POSITIVE_TTL_MS = 5 * 60_000

let cachedSupported: boolean | null = null
let cacheExpiresAt = 0

/** Test helper: clear cached capability probe after reconnect. */
export function resetMongoTransactionCache(): void {
  cachedSupported = null
  cacheExpiresAt = 0
}

/**
 * Detect whether the connected deployment supports multi-document transactions.
 * Prefer hello (no replSetGetStatus privileges required on managed MongoDB).
 * Negative results are cached only briefly so transient probe failures recover.
 */
export async function supportsMongoTransactions(): Promise<boolean> {
  const now = Date.now()
  if (cachedSupported !== null && now < cacheExpiresAt) {
    return cachedSupported
  }

  await connectDB()

  try {
    const admin = mongoose.connection.db?.admin()
    if (!admin) {
      cachedSupported = false
      cacheExpiresAt = now + NEGATIVE_TTL_MS
      return false
    }
    const status = await admin.command({ hello: 1 }).catch(() => null)
    const supported = Boolean(
      status && (status.setName || status.msg === 'isdbgrid')
    )
    cachedSupported = supported
    cacheExpiresAt = now + (supported ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS)
    return supported
  } catch {
    cachedSupported = false
    cacheExpiresAt = now + NEGATIVE_TTL_MS
    return false
  }
}

/**
 * Run multi-document work in a transaction when replica set is available.
 * Local standalone: runs without session (single-doc atomic ops only) unless
 * REQUIRE_MONGO_TRANSACTIONS=true or production requireReplicaSet.
 */
export async function withMongoTransaction<T>(
  operation: (session: ClientSession | undefined) => Promise<T>,
  options?: { requireReplicaSet?: boolean }
): Promise<T> {
  await connectDB()
  const requireRs =
    options?.requireReplicaSet === true ||
    process.env.REQUIRE_MONGO_TRANSACTIONS === 'true' ||
    (options?.requireReplicaSet !== false && process.env.NODE_ENV === 'production')

  const supported = await supportsMongoTransactions()

  if (!supported) {
    if (requireRs) {
      throw new TransactionNotSupportedError(
        'MongoDB replica set is required for this operation. Configure MONGODB_URI to a replica set (Atlas default).'
      )
    }
    return operation(undefined)
  }

  return mongoose.connection.transaction(async (session) => operation(session))
}
