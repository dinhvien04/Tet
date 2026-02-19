import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import FamilyMember from '@/lib/models/FamilyMember'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui long dang nhap' }, { status: 401 })
    }

    const body = await request.json()
    const familyId = body.familyId || body.family_id
    const content = body.content
    const type = body.type

    if (!familyId || !content || !type) {
      return NextResponse.json({ error: 'Thieu thong tin bat buoc' }, { status: 400 })
    }

    if (!['cau-doi', 'loi-chuc', 'thiep-tet'].includes(type)) {
      return NextResponse.json({ error: 'Loai bai dang khong hop le' }, { status: 400 })
    }

    await connectDB()

    const membership = await FamilyMember.findOne({
      familyId,
      userId: session.user.id,
    })
    if (!membership) {
      return NextResponse.json(
        { error: 'Ban khong phai thanh vien cua nha nay' },
        { status: 403 }
      )
    }

    const post = await Post.create({
      familyId,
      userId: session.user.id,
      content: content.trim(),
      type,
    })
    await post.populate('userId', 'name email avatar')

    const user = post.userId as unknown as {
      _id: { toString(): string }
      name: string
      email: string
      avatar?: string
    }

    return NextResponse.json({
      success: true,
      post: {
        id: post._id.toString(),
        family_id: post.familyId.toString(),
        user_id: user._id.toString(),
        content: post.content,
        type: post.type,
        created_at: post.createdAt,
        users: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar ?? null,
        },
      },
    })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Khong the tao bai dang' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui long dang nhap' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const familyId = searchParams.get('familyId')
    const from = parseInt(searchParams.get('from') || '0', 10)
    const to = parseInt(searchParams.get('to') || '49', 10)
    const limit = Math.max(1, to - from + 1)
    if (!familyId) {
      return NextResponse.json({ error: 'Thieu familyId' }, { status: 400 })
    }

    await connectDB()

    const membership = await FamilyMember.findOne({
      familyId,
      userId: session.user.id,
    })
    if (!membership) {
      return NextResponse.json(
        { error: 'Ban khong phai thanh vien cua nha nay' },
        { status: 403 }
      )
    }

    const posts = await Post.find({ familyId })
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(from)
      .limit(limit)
      .lean()

    const formattedPosts = posts.map((postDoc) => {
      const user = postDoc.userId as unknown as {
        _id: { toString(): string }
        name: string
        email: string
        avatar?: string
      }

      return {
        id: postDoc._id.toString(),
        family_id: postDoc.familyId.toString(),
        user_id: user._id.toString(),
        content: postDoc.content,
        type: postDoc.type,
        created_at: postDoc.createdAt,
        users: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar ?? null,
        },
      }
    })

    return NextResponse.json({ posts: formattedPosts })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: 'Khong the lay danh sach bai dang' }, { status: 500 })
  }
}
