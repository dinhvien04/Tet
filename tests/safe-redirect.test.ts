import { describe, it, expect } from 'vitest'
import { getSafeRedirectPath } from '@/lib/safe-redirect'

describe('getSafeRedirectPath', () => {
  it('returns fallback for null/empty', () => {
    expect(getSafeRedirectPath(null)).toBe('/dashboard')
    expect(getSafeRedirectPath('')).toBe('/dashboard')
    expect(getSafeRedirectPath('   ')).toBe('/dashboard')
  })

  it('allows internal paths', () => {
    expect(getSafeRedirectPath('/dashboard')).toBe('/dashboard')
    expect(getSafeRedirectPath('/family/create')).toBe('/family/create')
    expect(getSafeRedirectPath('/events/abc?x=1')).toBe('/events/abc?x=1')
  })

  it('rejects open redirects', () => {
    expect(getSafeRedirectPath('//evil.com')).toBe('/dashboard')
    expect(getSafeRedirectPath('https://evil.com')).toBe('/dashboard')
    expect(getSafeRedirectPath('http://evil.com/phish')).toBe('/dashboard')
    expect(getSafeRedirectPath('javascript:alert(1)')).toBe('/dashboard')
    expect(getSafeRedirectPath('\\\\evil.com')).toBe('/dashboard')
    expect(getSafeRedirectPath('/\\evil.com')).toBe('/dashboard')
  })

  it('supports custom fallback', () => {
    expect(getSafeRedirectPath('https://x.com', '/login')).toBe('/login')
  })
})
