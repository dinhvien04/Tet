/**
 * Build a minimal iCalendar (.ics) file for an event (Asia/Ho_Chi_Minh display).
 */

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** UTC timestamp in ICS format */
export function toIcsUtc(date: Date): string {
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  )
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

export function buildEventIcs(options: {
  id: string
  title: string
  date: Date
  location?: string | null
  description?: string
  durationMinutes?: number
}): string {
  const start = options.date
  const end = new Date(start.getTime() + (options.durationMinutes ?? 120) * 60_000)
  const uid = `event-${options.id}@tet-connect`
  const now = new Date()

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tet Connect//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(now)}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeText(options.title)}`,
  ]

  if (options.location) {
    lines.push(`LOCATION:${escapeText(options.location)}`)
  }
  if (options.description) {
    lines.push(`DESCRIPTION:${escapeText(options.description)}`)
  }

  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}
