import mongoose, { Schema, Model } from 'mongoose'

/**
 * Ensures at most one active (betting/rolling) round per family via unique familyId
 * and application CAS on activeRoundId.
 */
export interface IBauCuaFamilyState {
  _id: mongoose.Types.ObjectId
  familyId: mongoose.Types.ObjectId
  activeRoundId: mongoose.Types.ObjectId | null
  status: 'idle' | 'starting' | 'betting' | 'rolling'
  version: number
  /** Incremented on each bet so concurrent BET and ROLL share a write conflict. */
  betRevision: number
  updatedAt: Date
}

const BauCuaFamilyStateSchema = new Schema<IBauCuaFamilyState>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    unique: true,
  },
  activeRoundId: {
    type: Schema.Types.ObjectId,
    ref: 'BauCuaRound',
    default: null,
  },
  status: {
    type: String,
    enum: ['idle', 'starting', 'betting', 'rolling'],
    default: 'idle',
  },
  version: { type: Number, default: 0 },
  betRevision: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
})

const BauCuaFamilyState: Model<IBauCuaFamilyState> =
  mongoose.models.BauCuaFamilyState ||
  mongoose.model<IBauCuaFamilyState>('BauCuaFamilyState', BauCuaFamilyStateSchema)

export default BauCuaFamilyState
