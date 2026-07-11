/**
 * Helpers for real MongoDB replica-set integration tests.
 * Skips when URI missing, points at Atlas without ALLOW_PROD, or not a replica set.
 */
import mongoose from 'mongoose'

export function getIntegrationMongoUri(): string | null {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_INTEGRATION_URI
  if (!uri) return null
  const lower = uri.toLowerCase()
  if (lower.includes('mongodb.net') && process.env.ALLOW_PROD_MIGRATION !== '1') {
    return null
  }
  return uri
}

export async function connectIntegrationDb(uri: string): Promise<typeof mongoose> {
  // Fresh connection for isolation
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect()
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  return mongoose
}

export async function isReplicaSetReady(): Promise<boolean> {
  try {
    const admin = mongoose.connection.db?.admin()
    if (!admin) return false
    const hello = await admin.command({ hello: 1 })
    return Boolean(hello?.setName || hello?.msg === 'isdbgrid')
  } catch {
    return false
  }
}

export async function dropIntegrationDb(): Promise<void> {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase()
  }
}
