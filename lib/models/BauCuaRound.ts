import mongoose, { Schema, Model } from 'mongoose'

export const BAU_CUA_ITEMS = ['bau', 'cua', 'tom', 'ca', 'ga', 'nai'] as const
export type BauCuaItem = (typeof BAU_CUA_ITEMS)[number]

export interface IBauCuaRound {
  _id: mongoose.Types.ObjectId
  familyId: mongoose.Types.ObjectId
  roundNumber: number
  status: 'betting' | 'rolling' | 'rolled'
  hostUserId: mongoose.Types.ObjectId
  bettingClosesAt?: Date
  diceResults?: BauCuaItem[]
  settlementCompleted: boolean
  startedAt: Date
  rolledAt?: Date
}

const BauCuaRoundSchema = new Schema<IBauCuaRound>(
  {
    familyId: {
      type: Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
      index: true,
    },
    roundNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['betting', 'rolling', 'rolled'],
      default: 'betting',
      index: true,
    },
    hostUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bettingClosesAt: {
      type: Date,
      default: undefined,
    },
    diceResults: {
      type: [String],
      default: undefined,
    },
    settlementCompleted: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    rolledAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: false,
  }
)

BauCuaRoundSchema.index({ familyId: 1, roundNumber: -1 }, { unique: true })
// At most one active (betting/rolling) round per family is enforced in application
// with atomic compare-and-set; partial unique index optional if Mongo version allows.

const BauCuaRound: Model<IBauCuaRound> =
  mongoose.models.BauCuaRound ||
  mongoose.model<IBauCuaRound>('BauCuaRound', BauCuaRoundSchema)

export default BauCuaRound
