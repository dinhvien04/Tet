import mongoose, { Schema, Model } from 'mongoose'

export interface IPhoto {
  _id: mongoose.Types.ObjectId
  familyId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  url: string
  publicId: string // Cloudinary public_id for deletion
  uploadedAt: Date
}

const PhotoSchema = new Schema<IPhoto>(
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
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
)

// Indexes
PhotoSchema.index({ familyId: 1, uploadedAt: -1 })
PhotoSchema.index({ userId: 1 })

const Photo: Model<IPhoto> = mongoose.models.Photo || mongoose.model<IPhoto>('Photo', PhotoSchema)

export default Photo
