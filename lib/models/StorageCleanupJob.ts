import mongoose, { Schema, Model } from 'mongoose'

export type StorageCleanupStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface IStorageCleanupJob {
  _id: mongoose.Types.ObjectId
  type: 'cloudinary' | 'local'
  publicId: string
  userId?: mongoose.Types.ObjectId | null
  photoId?: mongoose.Types.ObjectId | null
  attempts: number
  status: StorageCleanupStatus
  lastError?: string | null
  nextRetryAt: Date
  createdAt: Date
  updatedAt: Date
}

const StorageCleanupJobSchema = new Schema<IStorageCleanupJob>(
  {
    type: {
      type: String,
      enum: ['cloudinary', 'local'],
      required: true,
    },
    publicId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    photoId: { type: Schema.Types.ObjectId, ref: 'Photo', default: null },
    attempts: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    lastError: { type: String, default: null },
    nextRetryAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
)

// Deduplicate pending jobs for same publicId
StorageCleanupJobSchema.index(
  { publicId: 1, status: 1 },
  { partialFilterExpression: { status: 'pending' } }
)

const StorageCleanupJob: Model<IStorageCleanupJob> =
  mongoose.models.StorageCleanupJob ||
  mongoose.model<IStorageCleanupJob>('StorageCleanupJob', StorageCleanupJobSchema)

export default StorageCleanupJob
