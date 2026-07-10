import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'
import { connectDB } from '@/lib/mongodb'
import Photo from '@/lib/models/Photo'
import FamilyMember from '@/lib/models/FamilyMember'
import cloudinary from '@/lib/cloudinary'
import {
  AuthError,
  authErrorResponse,
  parseObjectId,
  requireUser,
} from '@/lib/authorization'

async function destroyStorage(publicId: string) {
  if (!publicId) return

  if (publicId.startsWith('local:')) {
    const relative = publicId.slice('local:'.length)
    const absolute = path.join(process.cwd(), 'public', relative)
    try {
      await unlink(absolute)
    } catch {
      // file may already be gone
    }
    return
  }

  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (e) {
    console.error('Cloudinary destroy failed', e)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    parseObjectId(id, 'photoId')
    const user = await requireUser()
    await connectDB()

    const photo = await Photo.findById(id)
    if (!photo) {
      return NextResponse.json({ error: 'Không tìm thấy ảnh' }, { status: 404 })
    }

    const membership = await FamilyMember.findOne({
      familyId: photo.familyId,
      userId: user.id,
    })
    if (!membership) {
      return NextResponse.json(
        { error: 'Bạn không phải thành viên của nhà này' },
        { status: 403 }
      )
    }

    const isUploader = photo.userId.toString() === user.id
    const isAdmin = membership.role === 'admin'
    if (!isUploader && !isAdmin) {
      return NextResponse.json(
        { error: 'Chỉ người upload hoặc admin mới được xóa ảnh' },
        { status: 403 }
      )
    }

    const publicId = photo.publicId
    await Photo.deleteOne({ _id: photo._id })
    await destroyStorage(publicId)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error deleting photo:', error)
    return NextResponse.json({ error: 'Không thể xóa ảnh' }, { status: 500 })
  }
}
