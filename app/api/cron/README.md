# Cron Jobs

This directory contains API routes that are designed to be called by Vercel Cron or other scheduling services.

## Check Notifications

**Endpoint:** `/api/cron/check-notifications`

**Schedule:** Every hour (configured in `vercel.json`)

**Purpose:** Checks for upcoming events in the next 24 hours and creates notifications for:
1. Event reminders for all family members
2. Task reminders for users with pending tasks

### How it works

1. Queries the database for events happening in the next 24 hours
2. For each upcoming event:
   - Creates an event reminder notification for all family members
   - Checks for pending tasks in that event
   - Creates task reminder notifications for users with pending tasks
3. Prevents duplicate notifications by checking if a similar notification was created in the last 24 hours

### Security

The endpoint can be protected with a secret token:

1. Set `CRON_SECRET` environment variable in Vercel
2. Add the secret to the cron job configuration in Vercel dashboard
3. The endpoint will verify the `Authorization: Bearer <token>` header

### Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin access)

Optional:
- `CRON_SECRET` - Secret token for authentication

### Testing

Run unit tests:
```bash
npm test -- tests/notifications-cron.test.ts
```

Run integration tests (requires test Supabase instance):
```bash
RUN_INTEGRATION_TESTS=true npm test -- tests/notifications-integration.test.ts
```

### Manual Testing

You can manually trigger the cron job by visiting:
```
http://localhost:3000/api/cron/check-notifications
```

Or in production:
```
https://your-domain.vercel.app/api/cron/check-notifications
```

### Vercel Cron Configuration

The cron schedule is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-notifications",
      "schedule": "0 * * * *"
    }
  ]
}
```

This runs the job every hour. You can adjust the schedule using standard cron syntax:
- `0 * * * *` - Every hour
- `*/30 * * * *` - Every 30 minutes
- `0 0 * * *` - Once a day at midnight
- `0 */6 * * *` - Every 6 hours

### Monitoring

Check the Vercel dashboard for:
- Cron job execution logs
- Success/failure rates
- Execution duration

The endpoint returns a JSON response with statistics:
```json
{
  "success": true,
  "message": "Notifications checked and created",
  "stats": {
    "eventsChecked": 5,
    "eventNotificationsCreated": 12,
    "taskNotificationsCreated": 3
  }
}
```
