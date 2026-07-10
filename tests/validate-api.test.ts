import { describe, it, expect } from 'vitest'
import {
  requireString,
  requireEnum,
  ValidationError,
  optionalString,
  requireDate,
  requireObjectIdString,
  pickFamilyId,
} from '@/lib/api/validate'

describe('api validate helpers', () => {
  it('requireString trims and enforces length', () => {
    expect(requireString('  hello  ', 'field')).toBe('hello')
    expect(() => requireString('', 'field')).toThrow(ValidationError)
    expect(() => requireString('x'.repeat(20), 'field', { max: 5 })).toThrow(
      ValidationError
    )
  })

  it('requireEnum only allows listed values', () => {
    expect(requireEnum('a', 't', ['a', 'b'] as const)).toBe('a')
    expect(() => requireEnum('c', 't', ['a', 'b'] as const)).toThrow(ValidationError)
  })

  it('optionalString returns undefined for empty', () => {
    expect(optionalString(undefined, 'f')).toBeUndefined()
    expect(optionalString('', 'f')).toBeUndefined()
    expect(optionalString(' hi ', 'f')).toBe('hi')
  })

  it('requireDate accepts ISO and rejects garbage', () => {
    const d = requireDate('2026-02-01T00:00:00.000Z', 'date')
    expect(d.toISOString()).toBe('2026-02-01T00:00:00.000Z')
    expect(() => requireDate('not-a-date', 'date')).toThrow(ValidationError)
    expect(() => requireDate({}, 'date')).toThrow(ValidationError)
  })

  it('requireObjectIdString rejects non-hex ids', () => {
    expect(requireObjectIdString('507f1f77bcf86cd799439011', 'id')).toBe(
      '507f1f77bcf86cd799439011'
    )
    expect(() => requireObjectIdString('not-valid', 'id')).toThrow(ValidationError)
    expect(() => requireObjectIdString(123, 'id')).toThrow(ValidationError)
  })

  it('pickFamilyId accepts familyId or family_id', () => {
    expect(pickFamilyId({ familyId: '507f1f77bcf86cd799439011' })).toBe(
      '507f1f77bcf86cd799439011'
    )
    expect(pickFamilyId({ family_id: '507f1f77bcf86cd799439011' })).toBe(
      '507f1f77bcf86cd799439011'
    )
    expect(() => pickFamilyId({})).toThrow(ValidationError)
  })
})
