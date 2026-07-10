import mongoose, { Schema, Model } from 'mongoose'

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected'

export interface IFamilyJoinRequest {
  _id: mongoose.Types.ObjectId
  familyId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  status: JoinRequestStatus
  message?: string
  reviewedBy?: mongoose.Types.ObjectId
  reviewedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const FamilyJoinRequestSchema = new Schema<IFamilyJoinRequest>(
  {
    familyId: {
      type: Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    message: { type: String, maxlength: 300 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
)

// One pending request per user per family
FamilyJoinRequestSchema.index(
  { familyId: 1, userId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  }
)

const FamilyJoinRequest: Model<IFamilyJoinRequest> =
  mongoose.models.FamilyJoinRequest ||
  mongoose.model<IFamilyJoinRequest>('FamilyJoinRequest', FamilyJoinRequestSchema)

export default FamilyJoinRequest
