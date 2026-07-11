import mongoose, { Schema, Model } from 'mongoose'

export type StorageCleanupStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface IStorageCleanupJob {
  _id: mongoose.Types.ObjectId
  /** Unique operation key for idempotent enqueue */
  idempotencyKey: string
  type: 'cloudinary' | 'local'
  publicId: string
  userId?: mongoose.Types.ObjectId | null
  photoId?: mongoose.Types.ObjectId | null
  attempts: number
  status: StorageCleanupStatus
  leaseId?: string | null
  leaseExpiresAt?: Date | null
  processingStartedAt?: Date | null
  lastError?: string | null
  nextRetryAt: Date
  createdAt: Date
  updatedAt: Date
}

const StorageCleanupJobSchema = new Schema<IStorageCleanupJob>(
  {
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
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
    leaseId: { type: String, default: null },
    leaseExpiresAt: { type: Date, default: null },
    processingStartedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    nextRetryAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true }
)

const StorageCleanupJob: Model<IStorageCleanupJob> =
  mongoose.models.StorageCleanupJob ||
  mongoose.model<IStorageCleanupJob>('StorageCleanupJob', StorageCleanupJobSchema)

export default StorageCleanupJob
