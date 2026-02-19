import mongoose, { Schema, Model } from 'mongoose'

export interface IPost {
  _id: mongoose.Types.ObjectId
  familyId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  content: string
  type: 'cau-doi' | 'loi-chuc' | 'thiep-tet'
  createdAt: Date
  updatedAt: Date
}

const PostSchema = new Schema<IPost>(
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
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['cau-doi', 'loi-chuc', 'thiep-tet'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
PostSchema.index({ familyId: 1, createdAt: -1 })
PostSchema.index({ userId: 1 })

const Post: Model<IPost> = mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema)

export default Post
