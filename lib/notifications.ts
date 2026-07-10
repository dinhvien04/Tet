import { connectDB } from '@/lib/mongodb'
import Event from '@/lib/models/Event'
import EventTask from '@/lib/models/EventTask'
import FamilyMember from '@/lib/models/FamilyMember'
import Notification from '@/lib/models/Notification'
import User from '@/lib/models/User'

const TIMEZONE = 'Asia/Ho_Chi_Minh'

function formatVietnamDate(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: TIMEZONE,
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date)
}

/**
 * Check for upcoming events and create notifications (idempotent via dedupeKey).
 */
export async function checkAndCreateNotifications() {
  await connectDB()

  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  // Dedupe uses semantic keys (event/task + user + window), not UTC calendar day,
  // so cron across midnight cannot double-notify the same 24h window.

  const upcomingEvents = await Event.find({
    date: {
      $gte: now,
      $lte: tomorrow,
    },
  })
    .select('_id title date location familyId')
    .lean()

  if (upcomingEvents.length === 0) {
    return {
      eventsChecked: 0,
      eventNotificationsCreated: 0,
      taskNotificationsCreated: 0,
    }
  }

  const familyIds = [...new Set(upcomingEvents.map((e) => e.familyId.toString()))]
  const allMembers = await FamilyMember.find({
    familyId: { $in: familyIds },
  })
    .select('familyId userId')
    .lean()

  const membersByFamily = new Map<string, typeof allMembers>()
  for (const member of allMembers) {
    const key = member.familyId.toString()
    const list = membersByFamily.get(key) || []
    list.push(member)
    membersByFamily.set(key, list)
  }

  const eventIds = upcomingEvents.map((e) => e._id)
  const pendingTasks = await EventTask.find({
    eventId: { $in: eventIds },
    status: 'pending',
  })
    .select('_id task assignedTo eventId')
    .lean()

  const tasksByEvent = new Map<string, typeof pendingTasks>()
  for (const task of pendingTasks) {
    const key = task.eventId.toString()
    const list = tasksByEvent.get(key) || []
    list.push(task)
    tasksByEvent.set(key, list)
  }

  const docs: Array<{
    userId: (typeof allMembers)[0]['userId']
    type: 'event_reminder' | 'task_reminder'
    title: string
    content: string
    link: string
    dedupeKey: string
    read: boolean
    createdAt: Date
  }> = []

  // Respect per-user notification preferences
  const allUserIds = new Set<string>()
  for (const list of membersByFamily.values()) {
    for (const m of list) allUserIds.add(m.userId.toString())
  }
  for (const tasks of tasksByEvent.values()) {
    for (const t of tasks) allUserIds.add(t.assignedTo.toString())
  }

  const users = await User.find({ _id: { $in: [...allUserIds] } })
    .select('_id notificationPreferences')
    .lean()

  const prefsByUser = new Map<
    string,
    { eventReminders: boolean; taskReminders: boolean }
  >()
  for (const u of users) {
    prefsByUser.set(u._id.toString(), {
      eventReminders: u.notificationPreferences?.eventReminders ?? true,
      taskReminders: u.notificationPreferences?.taskReminders ?? true,
    })
  }

  for (const event of upcomingEvents) {
    const familyKey = event.familyId.toString()
    const members = membersByFamily.get(familyKey) || []
    const eventLink = `/events/${event._id}`
    const when = formatVietnamDate(new Date(event.date))

    for (const member of members) {
      const uid = member.userId.toString()
      const prefs = prefsByUser.get(uid) || {
        eventReminders: true,
        taskReminders: true,
      }
      if (!prefs.eventReminders) continue

      docs.push({
        userId: member.userId,
        type: 'event_reminder',
        title: `Sự kiện "${event.title}" sắp diễn ra`,
        content: `Sự kiện sẽ diễn ra vào ${when}${event.location ? ` tại ${event.location}` : ''}`,
        link: eventLink,
        dedupeKey: `event:${event._id}:user:${member.userId}:window:24h`,
        read: false,
        createdAt: now,
      })
    }

    const tasks = tasksByEvent.get(event._id.toString()) || []
    for (const task of tasks) {
      const uid = task.assignedTo.toString()
      const prefs = prefsByUser.get(uid) || {
        eventReminders: true,
        taskReminders: true,
      }
      if (!prefs.taskReminders) continue

      docs.push({
        userId: task.assignedTo,
        type: 'task_reminder',
        title: 'Bạn có công việc chưa hoàn thành',
        content: `"${task.task}" trong sự kiện "${event.title}"`,
        link: eventLink,
        dedupeKey: `task:${task._id}:user:${task.assignedTo}:window:24h`,
        read: false,
        createdAt: now,
      })
    }
  }

  let eventNotificationsCreated = 0
  let taskNotificationsCreated = 0

  if (docs.length > 0) {
    try {
      const result = await Notification.insertMany(docs, { ordered: false })
      for (const doc of result) {
        if (doc.type === 'event_reminder') eventNotificationsCreated++
        else taskNotificationsCreated++
      }
    } catch (error: unknown) {
      // Partial success with duplicate key errors is expected under concurrency
      const bulkError = error as {
        insertedDocs?: Array<{ type: string }>
        writeErrors?: unknown[]
        code?: number
      }
      if (bulkError.insertedDocs) {
        for (const doc of bulkError.insertedDocs) {
          if (doc.type === 'event_reminder') eventNotificationsCreated++
          else taskNotificationsCreated++
        }
      } else if (bulkError.code !== 11000) {
        throw error
      }
    }
  }

  return {
    eventsChecked: upcomingEvents.length,
    eventNotificationsCreated,
    taskNotificationsCreated,
  }
}

export async function getUnreadNotifications(userId: string) {
  await connectDB()

  return Notification.find({
    userId,
    read: false,
  })
    .sort({ createdAt: -1 })
    .lean()
}

export async function markNotificationAsRead(notificationId: string) {
  await connectDB()

  await Notification.findByIdAndUpdate(notificationId, {
    read: true,
  })
}
