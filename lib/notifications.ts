import { createClient } from '@supabase/supabase-js'

/**
 * Check for upcoming events and create notifications
 * This function is used by the cron job but can also be called manually
 */
export async function checkAndCreateNotifications() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Calculate time range: events happening in the next 24 hours
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  // Get upcoming events in the next 24 hours
  const { data: upcomingEvents, error: eventsError } = await supabase
    .from('events')
    .select(`
      id,
      title,
      date,
      location,
      family_id,
      families!inner (
        id,
        name,
        family_members (
          user_id
        )
      )
    `)
    .gte('date', now.toISOString())
    .lte('date', tomorrow.toISOString())

  if (eventsError) {
    throw new Error(`Failed to fetch events: ${eventsError.message}`)
  }

  let eventNotificationsCreated = 0
  let taskNotificationsCreated = 0

  // Process each upcoming event
  for (const event of upcomingEvents || []) {
    // Create event reminders for all family members
    const familyMembers = (event.families as any).family_members || []
    
    for (const member of familyMembers) {
      // Check if notification already exists to avoid duplicates
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', member.user_id)
        .eq('type', 'event_reminder')
        .eq('link', `/events/${event.id}`)
        .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .single()

      if (!existingNotification) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: member.user_id,
            type: 'event_reminder',
            title: `Sự kiện "${event.title}" sắp diễn ra`,
            content: `Sự kiện sẽ diễn ra vào ${new Date(event.date).toLocaleString('vi-VN')}${event.location ? ` tại ${event.location}` : ''}`,
            link: `/events/${event.id}`,
            read: false
          })

        if (!notificationError) {
          eventNotificationsCreated++
        }
      }
    }

    // Get pending tasks for this event
    const { data: pendingTasks, error: tasksError } = await supabase
      .from('event_tasks')
      .select('id, task, assigned_to')
      .eq('event_id', event.id)
      .eq('status', 'pending')

    if (!tasksError && pendingTasks) {
      for (const task of pendingTasks) {
        // Check if task notification already exists
        const { data: existingTaskNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', task.assigned_to)
          .eq('type', 'task_reminder')
          .eq('link', `/events/${event.id}`)
          .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .single()

        if (!existingTaskNotification) {
          const { error: taskNotificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: task.assigned_to,
              type: 'task_reminder',
              title: 'Bạn có công việc chưa hoàn thành',
              content: `"${task.task}" trong sự kiện "${event.title}"`,
              link: `/events/${event.id}`,
              read: false
            })

          if (!taskNotificationError) {
            taskNotificationsCreated++
          }
        }
      }
    }
  }

  return {
    eventsChecked: upcomingEvents?.length || 0,
    eventNotificationsCreated,
    taskNotificationsCreated
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch notifications: ${error.message}`)
  }

  return data
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`)
  }
}
