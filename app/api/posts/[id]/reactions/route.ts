import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import Reaction from '@/lib/models/Reaction'
import FamilyMember from '@/lib/models/FamilyMember'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui long dang nhap' }, { status: 401 })
    }

    const postId = id
    const { type } = await request.json()
    if (!type || !['heart', 'haha'].includes(type)) {
      return NextResponse.json({ error: 'Loai reaction khong hop le' }, { status: 400 })
    }

    await connectDB()

    const post = await Post.findById(postId)
    if (!post) {
      return NextResponse.json({ error: 'Bai dang khong ton tai' }, { status: 404 })
    }

    const membership = await FamilyMember.findOne({
      familyId: post.familyId,
      userId: session.user.id,
    })
    if (!membership) {
      return NextResponse.json(
        { error: 'Ban khong phai thanh vien cua nha nay' },
        { status: 403 }
      )
    }

    const existingReaction = await Reaction.findOne({
      postId,
      userId: session.user.id,
    })

    if (existingReaction) {
      if (existingReaction.type === type) {
        await Reaction.findByIdAndDelete(existingReaction._id)
        return NextResponse.json({ success: true, action: 'removed', type })
      }

      existingReaction.type = type
      await existingReaction.save()
      return NextResponse.json({ success: true, action: 'updated', type })
    }

    await Reaction.create({
      postId,
      userId: session.user.id,
      type,
    })

    return NextResponse.json({ success: true, action: 'added', type })
  } catch (error) {
    console.error('Error toggling reaction:', error)
    return NextResponse.json({ error: 'Khong the thuc hien reaction' }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui long dang nhap' }, { status: 401 })
    }

    const postId = id

    await connectDB()

    const post = await Post.findById(postId)
    if (!post) {
      return NextResponse.json({ error: 'Bai dang khong ton tai' }, { status: 404 })
    }

    const membership = await FamilyMember.findOne({
      familyId: post.familyId,
      userId: session.user.id,
    })
    if (!membership) {
      return NextResponse.json(
        { error: 'Ban khong phai thanh vien cua nha nay' },
        { status: 403 }
      )
    }

    const reactions = await Reaction.find({ postId }).populate('userId', 'name avatar').lean()

    const heartCount = reactions.filter((reaction) => reaction.type === 'heart').length
    const hahaCount = reactions.filter((reaction) => reaction.type === 'haha').length

    const userReaction = reactions.find((reaction) => {
      const user = reaction.userId as unknown as { _id: { toString(): string } }
      return user._id.toString() === session.user.id
    })

    return NextResponse.json({
      reactions: {
        heart: heartCount,
        haha: hahaCount,
      },
      userReaction: userReaction ? userReaction.type : null,
    })
  } catch (error) {
    console.error('Error fetching reactions:', error)
    return NextResponse.json({ error: 'Khong the lay reactions' }, { status: 500 })
  }
}
