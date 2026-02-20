export const USER_ROLES = ['user', 'admin'] as const

export type UserRole = (typeof USER_ROLES)[number]

function getSystemAdminEmailSet(): Set<string> {
  const raw = process.env.SYSTEM_ADMIN_EMAILS || ''
  const emails = raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  return new Set(emails)
}

export function isSystemAdminEmail(email?: string | null): boolean {
  if (!email) {
    return false
  }

  return getSystemAdminEmailSet().has(email.trim().toLowerCase())
}

export function getDefaultRoleForEmail(email?: string | null): UserRole {
  return isSystemAdminEmail(email) ? 'admin' : 'user'
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.includes(value as UserRole)
}
