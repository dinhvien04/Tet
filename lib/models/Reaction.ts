import mongoose, { Schema, Model } from 'mongoose'

export interface IReaction {
  _id: mongoose.Types.ObjectId
  postId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  type: 'heart' | 'haha'
  createdAt: Date
}

const ReactionSchema = new Schema<IReaction>(
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
    type: {
      type: String,
      enum: ['heart', 'haha'],
      required: true,
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

// Compound unique index - one reaction per user per post
ReactionSchema.index({ postId: 1, userId: 1 }, { unique: true })
ReactionSchema.index({ postId: 1 })

const Reaction: Model<IReaction> = 
  mongoose.models.Reaction || mongoose.model<IReaction>('Reaction', ReactionSchema)

export default Reaction
