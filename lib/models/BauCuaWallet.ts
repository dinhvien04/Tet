import mongoose, { Schema, Model } from 'mongoose'

export interface IBauCuaWallet {
  _id: mongoose.Types.ObjectId
  familyId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  balance: number
  updatedAt: Date
}

const BauCuaWalletSchema = new Schema<IBauCuaWallet>(
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
    balance: {
      type: Number,
      default: 1000,
      min: 0,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
)

BauCuaWalletSchema.index({ familyId: 1, userId: 1 }, { unique: true })
BauCuaWalletSchema.index({ familyId: 1, balance: -1 })

const BauCuaWallet: Model<IBauCuaWallet> =
  mongoose.models.BauCuaWallet || mongoose.model<IBauCuaWallet>('BauCuaWallet', BauCuaWalletSchema)

export default BauCuaWallet
