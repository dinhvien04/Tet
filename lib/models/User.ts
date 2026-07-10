import mongoose, { Schema, Model } from 'mongoose'
import { UserRole } from '@/lib/system-admin'

export interface INotificationPreferences {
  eventReminders: boolean
  taskReminders: boolean
}

export interface IUser {
  _id: mongoose.Types.ObjectId
  email: string
  password?: string // Optional for OAuth users
  name: string
  avatar?: string
  role: UserRole
  provider: 'credentials' | 'google'
  notificationPreferences?: INotificationPreferences
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // Required only for credentials provider
      required: function(this: IUser) {
        return this.provider === 'credentials'
      },
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true,
    },
    provider: {
      type: String,
      enum: ['credentials', 'google'],
      default: 'credentials',
    },
    notificationPreferences: {
      eventReminders: { type: Boolean, default: true },
      taskReminders: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
UserSchema.index({ email: 1 })

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User
