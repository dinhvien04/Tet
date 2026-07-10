/**
 * Prevent open redirects: only allow internal relative paths.
 */
export function getSafeRedirectPath(
  value: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!value || typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return fallback
  }

  // Reject absolute URLs, protocol-relative URLs, backslash tricks
  if (
    trimmed.startsWith('//') ||
    trimmed.includes('://') ||
    trimmed.includes('\\') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
  ) {
    return fallback
  }

  // Must be a same-origin path starting with single /
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback
  }

  // Block control characters / encoded newlines
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return fallback
  }

  return trimmed
}
