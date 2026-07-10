import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import Reaction from '@/lib/models/Reaction'
import Comment from '@/lib/models/Comment'
import {
  AuthError,
  authErrorResponse,
  requireFamilyMember,
  requireUser,
} from '@/lib/authorization'
import {
  parseJsonBody,
  pickFamilyId,
  requireEnum,
  requireObjectIdString,
  requireString,
  ValidationError,
  validationErrorResponse,
} from '@/lib/api/validate'
import mongoose from 'mongoose'

const POST_TYPES = ['cau-doi', 'loi-chuc', 'thiep-tet'] as const
const MAX_CONTENT = 5_000

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request)
    const familyId = pickFamilyId(body)
    const content = requireString(body.content, 'content', { max: MAX_CONTENT })
    const type = requireEnum(body.type, 'type', POST_TYPES)

    const { user, familyId: familyObjectId } = await requireFamilyMember(familyId)

    const post = await Post.create({
      familyId: familyObjectId,
      userId: user.id,
      content,
      type,
    })
    await post.populate('userId', 'name email avatar')

    const author = post.userId as unknown as {
      _id: { toString(): string }
      name: string
      email: string
      avatar?: string
    }

    // camelCase primary; snake_case kept for legacy client types during migration
    return NextResponse.json({
      success: true,
      post: {
        id: post._id.toString(),
        familyId: post.familyId.toString(),
        userId: author._id.toString(),
        content: post.content,
        type: post.type,
        createdAt: post.createdAt,
        family_id: post.familyId.toString(),
        user_id: author._id.toString(),
        created_at: post.createdAt,
        reactions: { heart: 0, haha: 0 },
        userReaction: null,
        commentsCount: 0,
        users: {
          id: author._id.toString(),
          name: author.name,
          email: author.email,
          avatar: author.avatar ?? null,
        },
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    if (error instanceof ValidationError || error instanceof SyntaxError) {
      const { error: message, status } = validationErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Không thể tạo bài đăng' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const familyIdRaw = searchParams.get('familyId')
    if (!familyIdRaw) {
      return NextResponse.json({ error: 'Thiếu familyId' }, { status: 400 })
    }
    const familyId = requireObjectIdString(familyIdRaw, 'familyId')

    const { parseLimit, decodeCursor, cursorFilter, buildNextCursor } = await import(
      '@/lib/api/pagination'
    )
    const limit = parseLimit(searchParams.get('limit') || searchParams.get('to'))
    const cursor = decodeCursor(searchParams.get('cursor'))
    const from = Math.max(0, parseInt(searchParams.get('from') || '0', 10) || 0)

    const { familyId: familyObjectId } = await requireFamilyMember(familyId)
    await connectDB()

    const filter = {
      familyId: familyObjectId,
      ...cursorFilter(cursor, 'createdAt'),
    }

    let query = Post.find(filter)
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)

    if (!cursor && from > 0) {
      query = query.skip(Math.min(from, 500))
    }

    const posts = await query.lean()
    const nextCursor = buildNextCursor(
      posts as Array<{ createdAt: Date; _id: { toString(): string } }>,
      limit
    )

    const postObjectIds = posts.map((p) => p._id as mongoose.Types.ObjectId)

    // Aggregation counts — avoid loading every comment/reaction document
    const [reactionAgg, commentAgg, userReactions] = await Promise.all([
      postObjectIds.length > 0
        ? Reaction.aggregate<{
            _id: { postId: mongoose.Types.ObjectId; type: 'heart' | 'haha' }
            count: number
          }>([
            { $match: { postId: { $in: postObjectIds } } },
            {
              $group: {
                _id: { postId: '$postId', type: '$type' },
                count: { $sum: 1 },
              },
            },
          ])
        : Promise.resolve([]),
      postObjectIds.length > 0
        ? Comment.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
            { $match: { postId: { $in: postObjectIds } } },
            { $group: { _id: '$postId', count: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
      postObjectIds.length > 0
        ? Reaction.find({
            postId: { $in: postObjectIds },
            userId: user.id,
          })
            .select('postId type')
            .lean()
        : Promise.resolve([]),
    ])

    const reactionCountMap = new Map<string, { heart: number; haha: number }>()
    for (const row of reactionAgg) {
      const postId = row._id.postId.toString()
      const counts = reactionCountMap.get(postId) || { heart: 0, haha: 0 }
      counts[row._id.type] = row.count
      reactionCountMap.set(postId, counts)
    }

    const userReactionMap = new Map<string, 'heart' | 'haha'>()
    for (const reaction of userReactions) {
      userReactionMap.set(reaction.postId.toString(), reaction.type)
    }

    const commentsCountMap = new Map<string, number>()
    for (const row of commentAgg) {
      commentsCountMap.set(row._id.toString(), row.count)
    }

    const formattedPosts = posts.map((postDoc) => {
      const author = postDoc.userId as unknown as {
        _id: { toString(): string }
        name: string
        email: string
        avatar?: string
      }
      const id = postDoc._id.toString()
      const familyIdStr = postDoc.familyId.toString()
      const userIdStr = author._id.toString()

      return {
        id,
        familyId: familyIdStr,
        userId: userIdStr,
        content: postDoc.content,
        type: postDoc.type,
        createdAt: postDoc.createdAt,
        // legacy aliases
        family_id: familyIdStr,
        user_id: userIdStr,
        created_at: postDoc.createdAt,
        reactions: reactionCountMap.get(id) || { heart: 0, haha: 0 },
        userReaction: userReactionMap.get(id) || null,
        commentsCount: commentsCountMap.get(id) || 0,
        users: {
          id: userIdStr,
          name: author.name,
          email: author.email,
          avatar: author.avatar ?? null,
        },
      }
    })

    return NextResponse.json({
      posts: formattedPosts,
      nextCursor,
      limit,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    if (error instanceof ValidationError) {
      const { error: message, status } = validationErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: 'Không thể lấy danh sách bài đăng' }, { status: 500 })
  }
}
