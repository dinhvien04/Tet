import { describe, it, expect } from 'vitest'
import {
  requireString,
  requireEnum,
  ValidationError,
  optionalString,
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
})
