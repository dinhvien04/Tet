import mongoose, { type ClientSession } from 'mongoose'
import { connectDB } from '@/lib/mongodb'

export class TransactionNotSupportedError extends Error {
  constructor(message = 'MongoDB transactions require a replica set') {
    super(message)
    this.name = 'TransactionNotSupportedError'
  }
}

let replicaSetChecked = false
let replicaSetSupported = false

/** Test helper: clear cached capability probe after reconnect. */
export function resetMongoTransactionCache(): void {
  replicaSetChecked = false
  replicaSetSupported = false
}

/**
 * Detect whether the connected deployment supports multi-document transactions.
 * Prefer hello (no replSetGetStatus privileges required on managed MongoDB).
 */
export async function supportsMongoTransactions(): Promise<boolean> {
  if (replicaSetChecked) return replicaSetSupported
  await connectDB()

  try {
    const admin = mongoose.connection.db?.admin()
    if (!admin) {
      replicaSetSupported = false
    } else {
      const status = await admin.command({ hello: 1 }).catch(() => null)
      replicaSetSupported = Boolean(
        status &&
          (status.setName ||
            status.msg === 'isdbgrid' ||
            // Some managed configs expose sessions without setName in edge cases
            (typeof status.logicalSessionTimeoutMinutes === 'number' &&
              status.setName))
      )
    }
  } catch {
    replicaSetSupported = false
  }

  replicaSetChecked = true
  return replicaSetSupported
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
