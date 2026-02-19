import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import Family from '@/lib/models/Family'
import FamilyMember from '@/lib/models/FamilyMember'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui long dang nhap' }, { status: 401 })
    }

    const inviteCode = id.toUpperCase()

    await connectDB()

    const family = await Family.findOne({ inviteCode })
    if (!family) {
      return NextResponse.json({ error: 'Ma moi khong hop le' }, { status: 404 })
    }

    const existingMember = await FamilyMember.findOne({
      familyId: family._id,
      userId: session.user.id,
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'Ban da la thanh vien cua nha nay' },
        { status: 400 }
      )
    }

    await FamilyMember.create({
      familyId: family._id,
      userId: session.user.id,
      role: 'member',
    })

    return NextResponse.json({
      success: true,
      family: {
        id: family._id.toString(),
        name: family.name,
      },
    })
  } catch (error) {
    console.error('Error joining family:', error)
    return NextResponse.json({ error: 'Khong the tham gia nha' }, { status: 500 })
  }
}
