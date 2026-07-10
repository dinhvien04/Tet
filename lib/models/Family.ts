import mongoose, { Schema, Model } from 'mongoose'

export interface IFamily {
  _id: mongoose.Types.ObjectId
  name: string
  inviteCode: string
  createdBy: mongoose.Types.ObjectId
  /** When true, join via invite creates a pending request for admin approval */
  requireJoinApproval: boolean
  /** When set, invite code is invalid after this time */
  inviteExpiresAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const FamilySchema = new Schema<IFamily>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requireJoinApproval: {
      type: Boolean,
      default: false,
    },
    inviteExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
FamilySchema.index({ inviteCode: 1 })
FamilySchema.index({ createdBy: 1 })

const Family: Model<IFamily> = mongoose.models.Family || mongoose.model<IFamily>('Family', FamilySchema)

export default Family
