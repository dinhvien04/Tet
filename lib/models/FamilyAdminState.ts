import mongoose, { Schema, Model } from 'mongoose'

/**
 * Shared lock for family admin invariant (adminCount >= 1).
 * Every promote/demote/delete/account-deletion that touches family admins
 * must CAS this document inside a transaction.
 */
export interface IFamilyAdminState {
  _id: mongoose.Types.ObjectId
  familyId: mongoose.Types.ObjectId
  adminCount: number
  version: number
  updatedAt: Date
}

const FamilyAdminStateSchema = new Schema<IFamilyAdminState>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    unique: true,
  },
  adminCount: { type: Number, required: true, min: 0, default: 1 },
  version: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
})

const FamilyAdminState: Model<IFamilyAdminState> =
  mongoose.models.FamilyAdminState ||
  mongoose.model<IFamilyAdminState>('FamilyAdminState', FamilyAdminStateSchema)

export default FamilyAdminState
