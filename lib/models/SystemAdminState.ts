import mongoose, { Schema, Model } from 'mongoose'

/**
 * Shared lock for system-admin invariant (adminCount >= 1).
 * All system role changes and account deletions of admins write this document.
 */
export interface ISystemAdminState {
  _id: mongoose.Types.ObjectId
  key: string
  adminCount: number
  version: number
  updatedAt: Date
}

const SystemAdminStateSchema = new Schema<ISystemAdminState>({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'system-admin',
  },
  adminCount: { type: Number, required: true, min: 0, default: 0 },
  version: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
})

const SystemAdminState: Model<ISystemAdminState> =
  mongoose.models.SystemAdminState ||
  mongoose.model<ISystemAdminState>('SystemAdminState', SystemAdminStateSchema)

export default SystemAdminState
