import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import FamilyMember from '@/lib/models/FamilyMember'
import Reaction from '@/lib/models/Reaction'
import Comment from '@/lib/models/Comment'

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
        reactions: {
          heart: 0,
          haha: 0,
        },
        userReaction: null,
        commentsCount: 0,
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
    // Prefer cursor pagination; keep from/to for backward compatibility
    const { parseLimit, decodeCursor, cursorFilter, buildNextCursor } = await import(
      '@/lib/api/pagination'
    )
    const limit = parseLimit(searchParams.get('limit') || searchParams.get('to'))
    const cursor = decodeCursor(searchParams.get('cursor'))
    const from = Math.max(0, parseInt(searchParams.get('from') || '0', 10) || 0)

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

    const filter = {
      familyId,
      ...cursorFilter(cursor, 'createdAt'),
    }

    let query = Post.find(filter)
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)

    // Legacy offset only when no cursor provided
    if (!cursor && from > 0) {
      query = query.skip(Math.min(from, 500))
    }

    const posts = await query.lean()
    const nextCursor = buildNextCursor(posts as Array<{ createdAt: Date; _id: { toString(): string } }>, limit)

    const postIds = posts.map((postDoc) => postDoc._id.toString())

    const [reactions, comments] = await Promise.all([
      postIds.length > 0
        ? Reaction.find({ postId: { $in: postIds } }).select('postId userId type').lean()
        : Promise.resolve([]),
      postIds.length > 0
        ? Comment.find({ postId: { $in: postIds } }).select('postId').lean()
        : Promise.resolve([]),
    ])

    const reactionCountMap = new Map<string, { heart: number; haha: number }>()
    const userReactionMap = new Map<string, 'heart' | 'haha'>()

    reactions.forEach((reaction) => {
      const postId = reaction.postId.toString()
      const counts = reactionCountMap.get(postId) || { heart: 0, haha: 0 }
      counts[reaction.type] += 1
      reactionCountMap.set(postId, counts)

      if (reaction.userId.toString() === session.user.id) {
        userReactionMap.set(postId, reaction.type)
      }
    })

    const commentsCountMap = new Map<string, number>()
    comments.forEach((comment) => {
      const postId = comment.postId.toString()
      commentsCountMap.set(postId, (commentsCountMap.get(postId) || 0) + 1)
    })

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
        reactions: reactionCountMap.get(postDoc._id.toString()) || { heart: 0, haha: 0 },
        userReaction: userReactionMap.get(postDoc._id.toString()) || null,
        commentsCount: commentsCountMap.get(postDoc._id.toString()) || 0,
        users: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar ?? null,
        },
      }
    })

    return NextResponse.json({
      posts: formattedPosts,
      nextCursor,
      limit,
    })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: 'Khong the lay danh sach bai dang' }, { status: 500 })
  }
}
