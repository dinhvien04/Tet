import { describe, it, expect } from 'vitest'
import {
  parseLimit,
  encodeCursor,
  decodeCursor,
  cursorFilter,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
} from '@/lib/api/pagination'

describe('pagination helpers', () => {
  it('uses default and clamps limit', () => {
    expect(parseLimit(null)).toBe(DEFAULT_PAGE_LIMIT)
    expect(parseLimit('abc')).toBe(DEFAULT_PAGE_LIMIT)
    expect(parseLimit('-5')).toBe(DEFAULT_PAGE_LIMIT)
    expect(parseLimit('0')).toBe(DEFAULT_PAGE_LIMIT)
    expect(parseLimit('10')).toBe(10)
    expect(parseLimit('999')).toBe(MAX_PAGE_LIMIT)
  })

  it('round-trips cursor', () => {
    const date = new Date('2026-01-15T10:00:00.000Z')
    const cursor = encodeCursor(date, '507f1f77bcf86cd799439011')
    const decoded = decodeCursor(cursor)
    expect(decoded?.createdAt).toBe(date.toISOString())
    expect(decoded?.id).toBe('507f1f77bcf86cd799439011')
  })

  it('rejects invalid cursor', () => {
    expect(decodeCursor('not-valid')).toBeNull()
    expect(decodeCursor('')).toBeNull()
  })

  it('builds cursor filter', () => {
    const filter = cursorFilter({
      createdAt: '2026-01-15T10:00:00.000Z',
      id: '507f1f77bcf86cd799439011',
    })
    expect(filter).toHaveProperty('$or')
  })
})
