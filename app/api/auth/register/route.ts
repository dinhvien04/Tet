import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { hashPassword, isValidEmail, isValidPassword } from '@/lib/auth'
import { getDefaultRoleForEmail } from '@/lib/system-admin'

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, mật khẩu và tên là bắt buộc' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Email không hợp lệ' },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordValidation = isValidPassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      )
    }

    // Validate name length
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Tên phải có ít nhất 2 ký tự' },
        { status: 400 }
      )
    }

    await connectDB()

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    
    if (existingUser) {
      if (existingUser.provider === 'google') {
        return NextResponse.json(
          { error: 'Email này đã được đăng ký bằng Google. Vui lòng đăng nhập bằng Google.' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Email đã được đăng ký' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const role = getDefaultRoleForEmail(email)
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name.trim(),
      provider: 'credentials',
      role,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Đăng ký thất bại. Vui lòng thử lại.' },
      { status: 500 }
    )
  }
}
