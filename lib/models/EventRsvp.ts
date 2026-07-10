import mongoose, { Schema, Model } from 'mongoose'

export const RSVP_STATUSES = ['going', 'maybe', 'not_going'] as const
export type RsvpStatus = (typeof RSVP_STATUSES)[number]

export interface IEventRsvp {
  _id: mongoose.Types.ObjectId
  eventId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  status: RsvpStatus
  updatedAt: Date
  createdAt: Date
}

const EventRsvpSchema = new Schema<IEventRsvp>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: RSVP_STATUSES,
      required: true,
    },
  },
  { timestamps: true }
)

EventRsvpSchema.index({ eventId: 1, userId: 1 }, { unique: true })

const EventRsvp: Model<IEventRsvp> =
  mongoose.models.EventRsvp || mongoose.model<IEventRsvp>('EventRsvp', EventRsvpSchema)

export default EventRsvp
