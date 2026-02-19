import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import Photo from '@/lib/models/Photo'
import FamilyMember from '@/lib/models/FamilyMember'
import cloudinary from '@/lib/cloudinary'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

function isCloudinaryConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return false
  }

  const placeholderValues = [cloudName, apiKey, apiSecret].map((value) =>
    value.toLowerCase().trim()
  )

  return !placeholderValues.some(
    (value) =>
      value.startsWith('your-') ||
      value.includes('placeholder') ||
      value === 'changeme'
  )
}

function getFileExtension(file: File): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/heic': 'heic',
    'image/webp': 'webp',
  }

  return mimeToExt[file.type] || 'jpg'
}

async function uploadToLocalStorage(file: File, familyId: string) {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const extension = getFileExtension(file)
  const safeFamilyId = familyId.replace(/[^a-zA-Z0-9_-]/g, '')
  const fileName = `${Date.now()}-${randomUUID()}.${extension}`
  const relativeDir = path.join('uploads', safeFamilyId)
  const absoluteDir = path.join(process.cwd(), 'public', relativeDir)
  const absolutePath = path.join(absoluteDir, fileName)

  await mkdir(absoluteDir, { recursive: true })
  await writeFile(absolutePath, buffer)

  const relativeUrlPath = path.join(relativeDir, fileName).replace(/\\/g, '/')

  return {
    secure_url: `/${relativeUrlPath}`,
    public_id: `local:${relativeUrlPath}`,
  }
}

async function uploadToCloudinary(file: File, familyId: string) {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  return new Promise<any>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `tet-connect/${familyId}`,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      .end(buffer)
  })
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const familyId = formData.get('familyId') as string

    // Validate input
    if (!file || !familyId) {
      return NextResponse.json(
        { error: 'Thiếu file hoặc familyId' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Định dạng file không hợp lệ. Chỉ chấp nhận JPG, PNG, HEIC, WEBP.' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File quá lớn. Kích thước tối đa 10MB.' },
        { status: 400 }
      )
    }

    await connectDB()

    // Check if user is a member of this family
    const membership = await FamilyMember.findOne({
      familyId,
      userId: session.user.id,
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Bạn không phải thành viên của nhà này' },
        { status: 403 }
      )
    }

    const uploadResult = isCloudinaryConfigured()
      ? await uploadToCloudinary(file, familyId)
      : await uploadToLocalStorage(file, familyId)

    // Save photo metadata to MongoDB
    const photo = await Photo.create({
      familyId,
      userId: session.user.id,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    })

    await photo.populate('userId', 'name email avatar')
    const user = photo.userId as unknown as {
      _id: { toString(): string }
      name: string
      email: string
      avatar?: string | null
    }

    return NextResponse.json({
      success: true,
      photo: {
        id: photo._id.toString(),
        family_id: photo.familyId.toString(),
        user_id: user._id.toString(),
        url: photo.url,
        uploaded_at: photo.uploadedAt,
        uploader: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar ?? null,
        },
      },
    })
  } catch (error) {
    console.error('Error uploading photo:', error)
    return NextResponse.json(
      { error: 'Không thể upload ảnh' },
      { status: 500 }
    )
  }
}
