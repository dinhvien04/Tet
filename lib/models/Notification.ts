import mongoose, { Schema, Model } from 'mongoose'

export interface INotification {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  type: 'event_reminder' | 'task_reminder'
  title: string
  content: string
  link?: string
  read: boolean
  createdAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['event_reminder', 'task_reminder'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    link: {
      type: String,
    },
    read: {
      type: Boolean,
      default: false,
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

// Indexes
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 })

const Notification: Model<INotification> = 
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema)

export default Notification
