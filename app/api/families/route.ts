import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import Family from '@/lib/models/Family'
import FamilyMember from '@/lib/models/FamilyMember'

// Generate unique 8-character invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập' },
        { status: 401 }
      )
    }

    const { name } = await request.json()

    // Validate input
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Tên nhà không hợp lệ' },
        { status: 400 }
      )
    }

    await connectDB()

    // Generate unique invite code with retry logic
    let inviteCode = generateInviteCode()
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      // Check if code already exists
      const existing = await Family.findOne({ inviteCode })

      if (!existing) {
        break // Code is unique
      }

      inviteCode = generateInviteCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Không thể tạo mã mời duy nhất. Vui lòng thử lại.' },
        { status: 500 }
      )
    }

    // Create family
    const family = await Family.create({
      name: name.trim(),
      inviteCode,
      createdBy: session.user.id,
    })

    // Add creator as admin
    try {
      await FamilyMember.create({
        familyId: family._id,
        userId: session.user.id,
        role: 'admin',
      })
    } catch (memberError) {
      console.error('Error adding family member:', memberError)
      // Rollback: delete the family
      await Family.findByIdAndDelete(family._id)
      
      return NextResponse.json(
        { error: 'Không thể thêm thành viên' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      family: {
        id: family._id.toString(),
        name: family.name,
        invite_code: family.inviteCode,
        created_at: family.createdAt,
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}

// GET all families for current user OR get family by invite code
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const inviteCode = searchParams.get('inviteCode')

    // If invite code is provided, allow public access (no auth required)
    if (inviteCode) {
      await connectDB()

      const family = await Family.findOne({ inviteCode }).lean()

      if (!family) {
        return NextResponse.json(
          { error: 'Mã mời không hợp lệ' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        families: [{
          id: family._id.toString(),
          name: family.name,
          invite_code: family.inviteCode,
          created_at: family.createdAt,
        }]
      })
    }

    // Otherwise, require authentication to get user's families
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập' },
        { status: 401 }
      )
    }

    await connectDB()

    // Get all family memberships for user
    const memberships = await FamilyMember.find({ userId: session.user.id })
      .populate('familyId')
      .lean()

    const families = memberships.map((membership: any) => ({
      id: membership.familyId._id.toString(),
      name: membership.familyId.name,
      invite_code: membership.familyId.inviteCode,
      role: membership.role,
      joined_at: membership.joinedAt,
      created_at: membership.familyId.createdAt,
    }))

    return NextResponse.json({ families })
  } catch (error) {
    console.error('Error fetching families:', error)
    return NextResponse.json(
      { error: 'Không thể lấy danh sách nhà' },
      { status: 500 }
    )
  }
}
