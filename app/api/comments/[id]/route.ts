import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Comment from '@/lib/models/Comment'
import Post from '@/lib/models/Post'
import FamilyMember from '@/lib/models/FamilyMember'
import {
  AuthError,
  authErrorResponse,
  parseObjectId,
  requireUser,
} from '@/lib/authorization'
import { requireString, ValidationError } from '@/lib/api/validate'

async function loadCommentAccess(commentId: string, userId: string) {
  parseObjectId(commentId, 'commentId')
  await connectDB()

  const comment = await Comment.findById(commentId)
  if (!comment) {
    throw new AuthError('Không tìm thấy bình luận', 404)
  }

  const post = await Post.findById(comment.postId)
  if (!post) {
    throw new AuthError('Bài đăng không tồn tại', 404)
  }

  const membership = await FamilyMember.findOne({
    familyId: post.familyId,
    userId,
  })
  if (!membership) {
    throw new AuthError('Bạn không phải thành viên của nhà này', 403)
  }

  return { comment, post, membership }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireUser()
    const { comment, membership } = await loadCommentAccess(id, user.id)

    const isAuthor = comment.userId.toString() === user.id
    const isAdmin = membership.role === 'admin'
    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'Chỉ tác giả hoặc admin mới được sửa bình luận' },
        { status: 403 }
      )
    }

    const body = await request.json()
    comment.content = requireString(body.content, 'content', { min: 1, max: 1000 })
    await comment.save()

    return NextResponse.json({
      success: true,
      comment: {
        id: comment._id.toString(),
        content: comment.content,
        postId: comment.postId.toString(),
        userId: comment.userId.toString(),
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
    console.error('Error updating comment:', error)
    return NextResponse.json({ error: 'Không thể cập nhật bình luận' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireUser()
    const { comment, membership } = await loadCommentAccess(id, user.id)

    const isAuthor = comment.userId.toString() === user.id
    const isAdmin = membership.role === 'admin'
    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'Chỉ tác giả hoặc admin mới được xóa bình luận' },
        { status: 403 }
      )
    }

    await Comment.deleteOne({ _id: comment._id })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error deleting comment:', error)
    return NextResponse.json({ error: 'Không thể xóa bình luận' }, { status: 500 })
  }
}
