import { connectDB } from '@/lib/mongodb'
import Event from '@/lib/models/Event'
import EventTask from '@/lib/models/EventTask'
import FamilyMember from '@/lib/models/FamilyMember'
import Notification from '@/lib/models/Notification'

/**
 * Check for upcoming events and create notifications
 * This function is used by the cron job but can also be called manually
 */
export async function checkAndCreateNotifications() {
  await connectDB()

  // Calculate time range: events happening in the next 24 hours
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Get upcoming events in the next 24 hours
  const upcomingEvents = await Event.find({
    date: {
      $gte: now,
      $lte: tomorrow,
    },
  }).lean()

  let eventNotificationsCreated = 0
  let taskNotificationsCreated = 0

  // Process each upcoming event
  for (const event of upcomingEvents) {
    // Get all family members
    const familyMembers = await FamilyMember.find({
      familyId: event.familyId,
    }).select('userId')

    // Create event reminders for all family members
    for (const member of familyMembers) {
      // Check if notification already exists to avoid duplicates
      const existingNotification = await Notification.findOne({
        userId: member.userId,
        type: 'event_reminder',
        link: `/events/${event._id}`,
        createdAt: { $gte: yesterday },
      })

      if (!existingNotification) {
        await Notification.create({
          userId: member.userId,
          type: 'event_reminder',
          title: `Sự kiện "${event.title}" sắp diễn ra`,
          content: `Sự kiện sẽ diễn ra vào ${new Date(event.date).toLocaleString('vi-VN')}${event.location ? ` tại ${event.location}` : ''}`,
          link: `/events/${event._id}`,
          read: false,
        })
        eventNotificationsCreated++
      }
    }

    // Get pending tasks for this event
    const pendingTasks = await EventTask.find({
      eventId: event._id,
      status: 'pending',
    }).select('_id task assignedTo')

    for (const task of pendingTasks) {
      // Check if task notification already exists
      const existingTaskNotification = await Notification.findOne({
        userId: task.assignedTo,
        type: 'task_reminder',
        link: `/events/${event._id}`,
        createdAt: { $gte: yesterday },
      })

      if (!existingTaskNotification) {
        await Notification.create({
          userId: task.assignedTo,
          type: 'task_reminder',
          title: 'Bạn có công việc chưa hoàn thành',
          content: `"${task.task}" trong sự kiện "${event.title}"`,
          link: `/events/${event._id}`,
          read: false,
        })
        taskNotificationsCreated++
      }
    }
  }

  return {
    eventsChecked: upcomingEvents.length,
    eventNotificationsCreated,
    taskNotificationsCreated,
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string) {
  await connectDB()

  const notifications = await Notification.find({
    userId,
    read: false,
  })
    .sort({ createdAt: -1 })
    .lean()

  return notifications
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  await connectDB()

  await Notification.findByIdAndUpdate(notificationId, {
    read: true,
  })
}
