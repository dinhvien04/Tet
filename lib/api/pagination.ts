/**
 * Cursor pagination helpers (createdAt + _id).
 * Default limit 20, max 50.
 */

import mongoose from 'mongoose'
import { ValidationError } from '@/lib/api/validate'

export const DEFAULT_PAGE_LIMIT = 20
export const MAX_PAGE_LIMIT = 50
/** Reject decoded cursor JSON larger than this (bytes). */
export const MAX_CURSOR_JSON_BYTES = 256
export const CURSOR_VERSION = 1

export interface CursorPayload {
  v?: number
  createdAt: string
  id: string
}

export class InvalidCursorError extends ValidationError {
  constructor(message = 'Cursor phân trang không hợp lệ') {
    super(message)
    this.name = 'InvalidCursorError'
  }
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
    v: CURSOR_VERSION,
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString(),
    id,
  }
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

/**
 * Decode and strictly validate cursor.
 * Invalid cursors throw InvalidCursorError (→ 400) instead of silently becoming first page.
 * Pass `strict: false` for backward-compatible null-on-error behavior.
 */
export function decodeCursor(
  cursor: string | null | undefined,
  options?: { strict?: boolean }
): CursorPayload | null {
  const strict = options?.strict !== false

  if (!cursor || typeof cursor !== 'string') {
    return null
  }

  if (cursor.length > 512) {
    if (strict) throw new InvalidCursorError('Cursor quá dài')
    return null
  }

  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8')
    if (json.length > MAX_CURSOR_JSON_BYTES) {
      if (strict) throw new InvalidCursorError('Cursor payload quá lớn')
      return null
    }

    const data = JSON.parse(json) as Record<string, unknown>
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      if (strict) throw new InvalidCursorError()
      return null
    }

    // Reject unexpected extra fields (allow only v, createdAt, id)
    const allowed = new Set(['v', 'createdAt', 'id'])
    for (const key of Object.keys(data)) {
      if (!allowed.has(key)) {
        if (strict) throw new InvalidCursorError('Cursor chứa trường không hợp lệ')
        return null
      }
    }

    if (typeof data.createdAt !== 'string' || typeof data.id !== 'string') {
      if (strict) throw new InvalidCursorError()
      return null
    }

    if (data.v !== undefined && data.v !== CURSOR_VERSION) {
      if (strict) throw new InvalidCursorError('Phiên bản cursor không được hỗ trợ')
      return null
    }

    const date = new Date(data.createdAt)
    if (Number.isNaN(date.getTime())) {
      if (strict) throw new InvalidCursorError('Cursor timestamp không hợp lệ')
      return null
    }

    if (!mongoose.Types.ObjectId.isValid(data.id)) {
      if (strict) throw new InvalidCursorError('Cursor id không phải ObjectId hợp lệ')
      return null
    }

    // Ensure 24-hex (reject castable but non-standard forms)
    if (!/^[a-fA-F0-9]{24}$/.test(data.id)) {
      if (strict) throw new InvalidCursorError('Cursor id không phải ObjectId hợp lệ')
      return null
    }

    return {
      v: CURSOR_VERSION,
      createdAt: date.toISOString(),
      id: data.id,
    }
  } catch (err) {
    if (err instanceof InvalidCursorError) throw err
    if (strict) throw new InvalidCursorError()
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
