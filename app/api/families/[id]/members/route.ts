import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import FamilyMember from '@/lib/models/FamilyMember'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check authentication
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập' },
        { status: 401 }
      )
    }

    const familyId = id

    await connectDB()

    // Check if user is a member of this family
    const userMembership = await FamilyMember.findOne({
      familyId,
      userId: session.user.id,
    })

    if (!userMembership) {
      return NextResponse.json(
        { error: 'Bạn không phải thành viên của nhà này' },
        { status: 403 }
      )
    }

    // Get all members
    const members = await FamilyMember.find({ familyId })
      .populate('userId', 'name email avatar')
      .lean()

    const formattedMembers = members.map((member) => {
      const user = member.userId as unknown as {
        _id: { toString(): string }
        name: string
        email: string
        avatar?: string
      }

      return {
        id: member._id.toString(),
        user_id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: member.role,
        joined_at: member.joinedAt,
        // Backward-compatible nested shape for older UI code.
        users: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
      }
    })

    return NextResponse.json({ members: formattedMembers })
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Không thể lấy danh sách thành viên' },
      { status: 500 }
    )
  }
}
