import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import FamilyMember from '@/lib/models/FamilyMember'

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions)
  return session?.user?.id || null
}

function formatMember(member: any) {
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
}

async function getRequesterMembership(familyId: string, userId: string) {
  return FamilyMember.findOne({
    familyId,
    userId,
  })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Vui long dang nhap' }, { status: 401 })
    }

    await connectDB()

    const userMembership = await getRequesterMembership(id, userId)
    if (!userMembership) {
      return NextResponse.json({ error: 'Ban khong phai thanh vien cua nha nay' }, { status: 403 })
    }

    const members = await FamilyMember.find({ familyId: id })
      .populate('userId', 'name email avatar')
      .lean()

    const formattedMembers = members.map(formatMember)

    return NextResponse.json({ members: formattedMembers })
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json({ error: 'Khong the lay danh sach thanh vien' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getAuthenticatedUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Vui long dang nhap' }, { status: 401 })
    }

    const { memberId, role } = await request.json()
    if (!memberId || !['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Thieu memberId hoac role khong hop le' },
        { status: 400 }
      )
    }

    await connectDB()

    const requesterMembership = await getRequesterMembership(id, userId)
    if (!requesterMembership) {
      return NextResponse.json({ error: 'Ban khong phai thanh vien cua nha nay' }, { status: 403 })
    }

    if (requesterMembership.role !== 'admin') {
      return NextResponse.json({ error: 'Chi admin moi duoc quan ly thanh vien' }, { status: 403 })
    }

    const targetMembership = await FamilyMember.findOne({
      _id: memberId,
      familyId: id,
    }).populate('userId', 'name email avatar')

    if (!targetMembership) {
      return NextResponse.json({ error: 'Khong tim thay thanh vien' }, { status: 404 })
    }

    if (targetMembership.role === 'admin' && role === 'member') {
      const adminCount = await FamilyMember.countDocuments({ familyId: id, role: 'admin' })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Nha phai co it nhat 1 admin' },
          { status: 400 }
        )
      }
    }

    targetMembership.role = role
    await targetMembership.save()

    return NextResponse.json({
      success: true,
      member: formatMember(targetMembership),
    })
  } catch (error) {
    console.error('Error updating member role:', error)
    return NextResponse.json({ error: 'Khong the cap nhat quyen thanh vien' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getAuthenticatedUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Vui long dang nhap' }, { status: 401 })
    }

    const memberId = request.nextUrl.searchParams.get('memberId')
    if (!memberId) {
      return NextResponse.json({ error: 'Thieu memberId' }, { status: 400 })
    }

    await connectDB()

    const requesterMembership = await getRequesterMembership(id, userId)
    if (!requesterMembership) {
      return NextResponse.json({ error: 'Ban khong phai thanh vien cua nha nay' }, { status: 403 })
    }

    if (requesterMembership.role !== 'admin') {
      return NextResponse.json({ error: 'Chi admin moi duoc xoa thanh vien' }, { status: 403 })
    }

    const targetMembership = await FamilyMember.findOne({
      _id: memberId,
      familyId: id,
    })

    if (!targetMembership) {
      return NextResponse.json({ error: 'Khong tim thay thanh vien' }, { status: 404 })
    }

    if (targetMembership.userId.toString() === userId) {
      return NextResponse.json({ error: 'Khong the tu xoa chinh minh' }, { status: 400 })
    }

    if (targetMembership.role === 'admin') {
      const adminCount = await FamilyMember.countDocuments({ familyId: id, role: 'admin' })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Nha phai co it nhat 1 admin' },
          { status: 400 }
        )
      }
    }

    await FamilyMember.deleteOne({ _id: targetMembership._id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting family member:', error)
    return NextResponse.json({ error: 'Khong the xoa thanh vien' }, { status: 500 })
  }
}
