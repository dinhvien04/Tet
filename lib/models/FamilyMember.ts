import mongoose, { Schema, Model } from 'mongoose'

export interface IFamilyMember {
  _id: mongoose.Types.ObjectId
  familyId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  role: 'admin' | 'member'
  joinedAt: Date
}

const FamilyMemberSchema = new Schema<IFamilyMember>(
  {
    familyId: {
      type: Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
)

// Compound unique index to prevent duplicate memberships
FamilyMemberSchema.index({ familyId: 1, userId: 1 }, { unique: true })
FamilyMemberSchema.index({ userId: 1 })

const FamilyMember: Model<IFamilyMember> = 
  mongoose.models.FamilyMember || mongoose.model<IFamilyMember>('FamilyMember', FamilyMemberSchema)

export default FamilyMember
