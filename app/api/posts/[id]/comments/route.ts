import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import Comment from '@/lib/models/Comment'
import FamilyMember from '@/lib/models/FamilyMember'

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

    await connectDB()

    const post = await Post.findById(id)
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

    const comments = await Comment.find({ postId: id })
      .populate('userId', 'name email avatar')
      .sort({ createdAt: 1 })
      .lean()

    const formattedComments = comments.map((comment) => {
      const user = comment.userId as unknown as {
        _id: { toString(): string }
        name: string
        email: string
        avatar?: string | null
      }

      return {
        id: comment._id.toString(),
        post_id: comment.postId.toString(),
        user_id: user._id.toString(),
        content: comment.content,
        created_at: comment.createdAt,
        users: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar ?? null,
        },
      }
    })

    return NextResponse.json({ comments: formattedComments })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: 'Khong the lay binh luan' }, { status: 500 })
  }
}

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

    const body = await request.json()
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    if (!content) {
      return NextResponse.json({ error: 'Noi dung binh luan khong duoc de trong' }, { status: 400 })
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Noi dung toi da 1000 ky tu' }, { status: 400 })
    }

    await connectDB()

    const post = await Post.findById(id)
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

    const comment = await Comment.create({
      postId: id,
      userId: session.user.id,
      content,
    })

    await comment.populate('userId', 'name email avatar')
    const user = comment.userId as unknown as {
      _id: { toString(): string }
      name: string
      email: string
      avatar?: string | null
    }

    return NextResponse.json({
      success: true,
      comment: {
        id: comment._id.toString(),
        post_id: comment.postId.toString(),
        user_id: user._id.toString(),
        content: comment.content,
        created_at: comment.createdAt,
        users: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar ?? null,
        },
      },
    })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Khong the tao binh luan' }, { status: 500 })
  }
}
