import mongoose, { Schema, Model } from 'mongoose'

export interface IComment {
  _id: mongoose.Types.ObjectId
  postId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  content: string
  createdAt: Date
}

const CommentSchema = new Schema<IComment>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
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
      trim: true,
      maxlength: 1000,
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

CommentSchema.index({ postId: 1, createdAt: 1 })
CommentSchema.index({ userId: 1 })

const Comment: Model<IComment> =
  mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema)

export default Comment
