import mongoose, { Schema, Model } from 'mongoose'

export interface IEvent {
  _id: mongoose.Types.ObjectId
  familyId: mongoose.Types.ObjectId
  title: string
  date: Date
  location?: string
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const EventSchema = new Schema<IEvent>(
  {
    familyId: {
      type: Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
EventSchema.index({ familyId: 1, date: 1 })
EventSchema.index({ date: 1 })

const Event: Model<IEvent> = mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema)

export default Event
