import mongoose, { Schema, Model } from 'mongoose'
import type { BauCuaItem } from './BauCuaRound'

export interface IBauCuaBet {
  _id: mongoose.Types.ObjectId
  roundId: mongoose.Types.ObjectId
  familyId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  item: BauCuaItem
  amount: number
  /** Client-supplied or server-generated key for idempotent retries */
  idempotencyKey?: string
  createdAt: Date
}

const BauCuaBetSchema = new Schema<IBauCuaBet>(
  {
    roundId: {
      type: Schema.Types.ObjectId,
      ref: 'BauCuaRound',
      required: true,
      index: true,
    },
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
    item: {
      type: String,
      enum: ['bau', 'cua', 'tom', 'ca', 'ga', 'nai'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      max: 10000,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
)

BauCuaBetSchema.index({ roundId: 1, userId: 1 })
BauCuaBetSchema.index({ familyId: 1, createdAt: -1 })
BauCuaBetSchema.index(
  { roundId: 1, userId: 1, idempotencyKey: 1 },
  { unique: true, sparse: true }
)

const BauCuaBet: Model<IBauCuaBet> =
  mongoose.models.BauCuaBet || mongoose.model<IBauCuaBet>('BauCuaBet', BauCuaBetSchema)

export default BauCuaBet
