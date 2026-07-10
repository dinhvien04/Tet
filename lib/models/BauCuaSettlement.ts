import mongoose, { Schema, Model } from 'mongoose'
import type { BauCuaItem } from './BauCuaRound'

export interface IBauCuaSettlementEntry {
  userId: mongoose.Types.ObjectId
  reservedAmount: number
  netDelta: number
  balanceBefore: number
  balanceAfter: number
}

export interface IBauCuaSettlement {
  _id: mongoose.Types.ObjectId
  roundId: mongoose.Types.ObjectId
  familyId: mongoose.Types.ObjectId
  diceResults: BauCuaItem[]
  entries: IBauCuaSettlementEntry[]
  status: 'completed'
  createdAt: Date
  completedAt: Date
}

const EntrySchema = new Schema<IBauCuaSettlementEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reservedAmount: { type: Number, required: true },
    netDelta: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
  },
  { _id: false }
)

const BauCuaSettlementSchema = new Schema<IBauCuaSettlement>({
  roundId: {
    type: Schema.Types.ObjectId,
    ref: 'BauCuaRound',
    required: true,
    unique: true,
  },
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  diceResults: { type: [String], required: true },
  entries: { type: [EntrySchema], default: [] },
  status: { type: String, enum: ['completed'], default: 'completed' },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: Date.now },
})

const BauCuaSettlement: Model<IBauCuaSettlement> =
  mongoose.models.BauCuaSettlement ||
  mongoose.model<IBauCuaSettlement>('BauCuaSettlement', BauCuaSettlementSchema)

export default BauCuaSettlement
