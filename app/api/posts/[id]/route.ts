import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import Reaction from '@/lib/models/Reaction'
import Comment from '@/lib/models/Comment'
import FamilyMember from '@/lib/models/FamilyMember'
import {
  AuthError,
  authErrorResponse,
  parseObjectId,
  requireUser,
} from '@/lib/authorization'
import { requireString } from '@/lib/api/validate'
import { ValidationError } from '@/lib/api/validate'

async function loadPostWithAuth(postId: string, userId: string) {
  parseObjectId(postId, 'postId')
  await connectDB()

  const post = await Post.findById(postId)
  if (!post) {
    throw new AuthError('Không tìm thấy bài đăng', 404)
  }

  const membership = await FamilyMember.findOne({
    familyId: post.familyId,
    userId,
  })
  if (!membership) {
    throw new AuthError('Bạn không phải thành viên của nhà này', 403)
  }

  return { post, membership }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireUser()
    const { post, membership } = await loadPostWithAuth(id, user.id)

    const isAuthor = post.userId.toString() === user.id
    const isFamilyAdmin = membership.role === 'admin'
    if (!isAuthor && !isFamilyAdmin) {
      return NextResponse.json(
        { error: 'Chỉ tác giả hoặc admin gia đình mới được sửa bài' },
        { status: 403 }
      )
    }

    const body = await request.json()
    if (body.content !== undefined) {
      post.content = requireString(body.content, 'content', { min: 1, max: 5000 })
    }
    if (body.type !== undefined) {
      if (!['cau-doi', 'loi-chuc', 'thiep-tet'].includes(body.type)) {
        return NextResponse.json({ error: 'Loại bài không hợp lệ' }, { status: 400 })
      }
      post.type = body.type
    }

    await post.save()

    return NextResponse.json({
      success: true,
      post: {
        id: post._id.toString(),
        content: post.content,
        type: post.type,
        familyId: post.familyId.toString(),
        userId: post.userId.toString(),
        createdAt: post.createdAt,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error updating post:', error)
    return NextResponse.json({ error: 'Không thể cập nhật bài đăng' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireUser()
    const { post, membership } = await loadPostWithAuth(id, user.id)

    const isAuthor = post.userId.toString() === user.id
    const isFamilyAdmin = membership.role === 'admin'
    if (!isAuthor && !isFamilyAdmin) {
      return NextResponse.json(
        { error: 'Chỉ tác giả hoặc admin gia đình mới được xóa bài' },
        { status: 403 }
      )
    }

    await Promise.all([
      Reaction.deleteMany({ postId: post._id }),
      Comment.deleteMany({ postId: post._id }),
      Post.deleteOne({ _id: post._id }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error deleting post:', error)
    return NextResponse.json({ error: 'Không thể xóa bài đăng' }, { status: 500 })
  }
}
