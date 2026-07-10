import type { IFamily } from '@/lib/models/Family'

export function isInviteValid(family: {
  inviteExpiresAt?: Date | null
}): { valid: boolean; reason?: string } {
  if (family.inviteExpiresAt) {
    const exp = new Date(family.inviteExpiresAt)
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
      return { valid: false, reason: 'Mã mời đã hết hạn' }
    }
  }
  return { valid: true }
}

export function computeInviteExpiry(days: number | null | undefined): Date | null {
  if (days === null || days === undefined) return null
  if (!Number.isFinite(days) || days <= 0) return null
  const d = new Date()
  d.setDate(d.getDate() + Math.min(365, Math.floor(days)))
  return d
}

export function formatInviteExpiry(family: Pick<IFamily, 'inviteExpiresAt'>): string | null {
  if (!family.inviteExpiresAt) return null
  return new Date(family.inviteExpiresAt).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
  })
}
