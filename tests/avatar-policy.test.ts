import { describe, it, expect } from 'vitest'
import { validateAvatarUrl, ALLOWED_AVATAR_HOSTS } from '@/lib/avatar'

describe('validateAvatarUrl', () => {
  it('clears empty / null', () => {
    expect(validateAvatarUrl(null)).toEqual({ ok: true, url: null })
    expect(validateAvatarUrl('')).toEqual({ ok: true, url: null })
    expect(validateAvatarUrl('   ')).toEqual({ ok: true, url: null })
  })

  it('accepts Cloudinary HTTPS', () => {
    const r = validateAvatarUrl('https://res.cloudinary.com/demo/image/upload/v1/a.jpg')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.url).toContain('res.cloudinary.com')
  })

  it('accepts Google avatar hosts', () => {
    const r = validateAvatarUrl('https://lh3.googleusercontent.com/a/photo')
    expect(r.ok).toBe(true)
  })

  it('rejects http', () => {
    const r = validateAvatarUrl('http://res.cloudinary.com/x.jpg')
    expect(r.ok).toBe(false)
  })

  it('rejects arbitrary hosts', () => {
    const r = validateAvatarUrl('https://evil.example.com/track.gif')
    expect(r.ok).toBe(false)
  })

  it('rejects oversized URL', () => {
    const r = validateAvatarUrl(`https://res.cloudinary.com/${'a'.repeat(600)}`)
    expect(r.ok).toBe(false)
  })

  it('rejects credentials in URL', () => {
    const r = validateAvatarUrl('https://user:pass@res.cloudinary.com/x.jpg')
    expect(r.ok).toBe(false)
  })

  it('allowlist matches next/image hosts', () => {
    expect(ALLOWED_AVATAR_HOSTS.has('res.cloudinary.com')).toBe(true)
    expect(ALLOWED_AVATAR_HOSTS.has('lh3.googleusercontent.com')).toBe(true)
  })
})
