import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import Comment from '@/lib/models/Comment'
import FamilyMember from '@/lib/models/FamilyMember'

function formatComment(comment: {
  _id: { toString(): string }
  postId: { toString(): string }
  content: string
  createdAt: Date
  userId: unknown
}) {
  const user = comment.userId as {
    _id: { toString(): string }
    name: string
    avatar?: string | null
  }

  return {
    id: comment._id.toString(),
    postId: comment.postId.toString(),
    userId: user._id.toString(),
    content: comment.content,
    createdAt: comment.createdAt,
    users: {
      id: user._id.toString(),
      name: user.name,
      avatar: user.avatar ?? null,
    },
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
      .populate('userId', 'name avatar')
      .sort({ createdAt: 1 })
      .lean()

    return NextResponse.json({
      comments: comments.map((c) => formatComment(c as never)),
    })
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

    await comment.populate('userId', 'name avatar')

    return NextResponse.json({
      success: true,
      comment: formatComment(comment as never),
    })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Khong the tao binh luan' }, { status: 500 })
  }
}
