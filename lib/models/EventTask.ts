import mongoose, { Schema, Model } from 'mongoose'

export interface IEventTask {
  _id: mongoose.Types.ObjectId
  eventId: mongoose.Types.ObjectId
  task: string
  assignedTo: mongoose.Types.ObjectId
  status: 'pending' | 'completed'
  createdAt: Date
  updatedAt: Date
}

const EventTaskSchema = new Schema<IEventTask>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    task: {
      type: String,
      required: true,
      trim: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
EventTaskSchema.index({ eventId: 1 })
EventTaskSchema.index({ assignedTo: 1, status: 1 })

const EventTask: Model<IEventTask> = 
  mongoose.models.EventTask || mongoose.model<IEventTask>('EventTask', EventTaskSchema)

export default EventTask
