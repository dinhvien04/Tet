/**
 * Cursor pagination helpers (createdAt + _id).
 * Default limit 20, max 50.
 */

export const DEFAULT_PAGE_LIMIT = 20
export const MAX_PAGE_LIMIT = 50

export interface CursorPayload {
  createdAt: string
  id: string
}

export function parseLimit(value: string | null | undefined, fallback = DEFAULT_PAGE_LIMIT): number {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  const n = Number(value)
  if (!Number.isFinite(n) || Number.isNaN(n) || n < 1) {
    return fallback
  }

  return Math.min(MAX_PAGE_LIMIT, Math.floor(n))
}

export function encodeCursor(createdAt: Date | string, id: string): string {
  const payload: CursorPayload = {
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString(),
    id,
  }
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

export function decodeCursor(cursor: string | null | undefined): CursorPayload | null {
  if (!cursor || typeof cursor !== 'string') {
    return null
  }

  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8')
    const data = JSON.parse(json) as CursorPayload
    if (!data.createdAt || !data.id) return null
    const date = new Date(data.createdAt)
    if (Number.isNaN(date.getTime())) return null
    return { createdAt: date.toISOString(), id: data.id }
  } catch {
    return null
  }
}

/**
 * Mongo filter for pagination relative to cursor.
 * @param direction 'desc' → older items ($lt); 'asc' → newer/later items ($gt)
 */
export function cursorFilter(
  cursor: CursorPayload | null,
  dateField = 'createdAt',
  direction: 'desc' | 'asc' = 'desc'
): Record<string, unknown> {
  if (!cursor) return {}

  const cursorDate = new Date(cursor.createdAt)
  if (direction === 'asc') {
    return {
      $or: [
        { [dateField]: { $gt: cursorDate } },
        {
          [dateField]: cursorDate,
          _id: { $gt: cursor.id },
        },
      ],
    }
  }

  return {
    $or: [
      { [dateField]: { $lt: cursorDate } },
      {
        [dateField]: cursorDate,
        _id: { $lt: cursor.id },
      },
    ],
  }
}

type CursorDateFields = 'createdAt' | 'uploadedAt' | 'date'

export function buildNextCursor<
  T extends {
    createdAt?: Date
    uploadedAt?: Date
    date?: Date
    _id: { toString(): string }
  },
>(items: T[], limit: number, dateField: CursorDateFields = 'createdAt'): string | null {
  if (items.length < limit) return null
  const last = items[items.length - 1]
  const date =
    dateField === 'uploadedAt'
      ? last.uploadedAt
      : dateField === 'date'
        ? last.date
        : last.createdAt
  if (!date) return null
  return encodeCursor(date, last._id.toString())
}
