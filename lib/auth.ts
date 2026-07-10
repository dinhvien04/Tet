import bcrypt from 'bcryptjs'

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate password strength
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Mật khẩu phải có ít nhất 8 ký tự' }
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Mật khẩu phải có ít nhất 1 chữ hoa' }
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Mật khẩu phải có ít nhất 1 chữ thường' }
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Mật khẩu phải có ít nhất 1 số' }
  }

  return { valid: true }
}
