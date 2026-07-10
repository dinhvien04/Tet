import { MongoClient, Db } from 'mongodb'
import mongoose from 'mongoose'

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: typeof import('mongoose') | null
    promise: Promise<typeof import('mongoose')> | null
  }
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable in .env.local')
  }
  return uri
}

let clientPromise: Promise<MongoClient> | undefined

function getClientPromise(): Promise<MongoClient> {
  if (clientPromise) return clientPromise

  const uri = getMongoUri()
  const options = {}

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, options)
      global._mongoClientPromise = client.connect()
    }
    clientPromise = global._mongoClientPromise
  } else {
    const client = new MongoClient(uri, options)
    clientPromise = client.connect()
  }

  return clientPromise
}

// Lazy default export compatible with `import clientPromise from '@/lib/mongodb'`
const lazyClientPromise = {
  then(
    onfulfilled?: ((value: MongoClient) => unknown) | null,
    onrejected?: ((reason: unknown) => unknown) | null
  ) {
    return getClientPromise().then(onfulfilled ?? undefined, onrejected ?? undefined)
  },
  catch(onrejected?: ((reason: unknown) => unknown) | null) {
    return getClientPromise().catch(onrejected ?? undefined)
  },
} as Promise<MongoClient>

export default lazyClientPromise

export async function getDatabase(): Promise<Db> {
  const client = await getClientPromise()
  return client.db('tet-connect')
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null }

if (!global.mongoose) {
  global.mongoose = cached
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const uri = getMongoUri()
    cached.promise = mongoose.connect(uri, { bufferCommands: false }).then((m) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ MongoDB connected')
      }
      return m
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}
