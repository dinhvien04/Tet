import { describe, it, expect } from 'vitest'
import { buildEventIcs, toIcsUtc } from '@/lib/ics'

describe('ics', () => {
  it('formats UTC timestamp', () => {
    const d = new Date('2026-02-01T03:30:00.000Z')
    expect(toIcsUtc(d)).toBe('20260201T033000Z')
  })

  it('builds calendar body', () => {
    const ics = buildEventIcs({
      id: 'abc123',
      title: 'Cúng tất niên',
      date: new Date('2026-01-28T12:00:00.000Z'),
      location: 'Nhà ông',
    })
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('SUMMARY:Cúng tất niên')
    expect(ics).toContain('LOCATION:Nhà ông')
    expect(ics).toContain('END:VCALENDAR')
  })
})
