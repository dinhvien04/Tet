import mongoose, { Schema, Model } from 'mongoose'

export interface IAuditEvent {
  _id: mongoose.Types.ObjectId
  actorId?: mongoose.Types.ObjectId | null
  familyId?: mongoose.Types.ObjectId | null
  action: string
  targetType?: string | null
  targetId?: string | null
  /** Safe metadata only — never secrets, invite codes, passwords, AI prompts */
  metadata?: Record<string, unknown>
  requestId?: string | null
  createdAt: Date
}

const AuditEventSchema = new Schema<IAuditEvent>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', default: null, index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, default: null },
    targetId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: undefined },
    requestId: { type: String, default: null, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
)

AuditEventSchema.index({ createdAt: -1 })

const AuditEvent: Model<IAuditEvent> =
  mongoose.models.AuditEvent ||
  mongoose.model<IAuditEvent>('AuditEvent', AuditEventSchema)

export default AuditEvent
