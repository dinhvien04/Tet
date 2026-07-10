/**
 * Avatar URL policy aligned with next/image remotePatterns.
 * Policy: only allow HTTPS hosts we explicitly trust (Cloudinary + Google avatars).
 * Arbitrary remote URLs are rejected (SSRF / tracking / http image abuse).
 */

export const MAX_AVATAR_URL_LENGTH = 500

/** Exact hostnames allowed for user avatar URLs (must match next.config.ts). */
export const ALLOWED_AVATAR_HOSTS = new Set([
  'res.cloudinary.com',
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
])

export type AvatarValidation =
  | { ok: true; url: string | null }
  | { ok: false; error: string }

/**
 * Validate avatar input for profile updates.
 * - null/undefined/'' → clear avatar
 * - must be https URL on allowlisted host
 */
export function validateAvatarUrl(value: unknown): AvatarValidation {
  if (value === null || value === undefined || value === '') {
    return { ok: true, url: null }
  }

  if (typeof value !== 'string') {
    return { ok: false, error: 'Avatar phải là chuỗi URL' }
  }

  const trimmed = value.trim()
  if (trimmed === '') {
    return { ok: true, url: null }
  }

  if (trimmed.length > MAX_AVATAR_URL_LENGTH) {
    return { ok: false, error: `Avatar URL tối đa ${MAX_AVATAR_URL_LENGTH} ký tự` }
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { ok: false, error: 'Avatar URL không hợp lệ' }
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'Avatar chỉ chấp nhận HTTPS' }
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: 'Avatar URL không được chứa credentials' }
  }

  const host = parsed.hostname.toLowerCase()
  if (!ALLOWED_AVATAR_HOSTS.has(host)) {
    return {
      ok: false,
      error:
        'Avatar chỉ cho phép Cloudinary hoặc Google (lh*.googleusercontent.com). Hãy dùng ảnh đã upload.',
    }
  }

  // Block obvious non-image query tricks? Allow path; Google avatars use query params.
  if (parsed.href.includes('\n') || parsed.href.includes('\r')) {
    return { ok: false, error: 'Avatar URL không hợp lệ' }
  }

  return { ok: true, url: parsed.href }
}
