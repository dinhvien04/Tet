import Family from '@/lib/models/Family'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export function generateInviteCode(length = 8): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length))
  }
  return code
}

export async function generateUniqueInviteCode(maxAttempts = 12): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateInviteCode()
    const existing = await Family.findOne({ inviteCode: code }).select('_id').lean()
    if (!existing) return code
  }
  throw new Error('Không thể tạo mã mời duy nhất')
}
