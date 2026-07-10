import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Photo from '@/lib/models/Photo'
import cloudinary from '@/lib/cloudinary'
import { mkdir, writeFile, unlink } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import {
  AuthError,
  authErrorResponse,
  requireFamilyMember,
} from '@/lib/authorization'

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
const MAX_SIZE = 10 * 1024 * 1024
const MAX_PIXELS = 40_000_000
const DAILY_UPLOAD_LIMIT = 50

function isProduction() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
}

function isCloudinaryConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) return false

  const values = [cloudName, apiKey, apiSecret].map((v) => v.toLowerCase().trim())
  return !values.some(
    (v) => v.startsWith('your-') || v.includes('placeholder') || v === 'changeme'
  )
}

function detectMimeFromMagic(buffer: Buffer): string | null {
  if (buffer.length < 12) return null

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png'
  }
  // WEBP: RIFF....WEBP
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }
  // HEIC/HEIF ftyp
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12)
    if (['heic', 'heif', 'mif1', 'msf1'].some((b) => brand.includes(b) || brand.startsWith(b.slice(0, 3)))) {
      return 'image/heic'
    }
  }

  return null
}

function getExtension(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
  }
  return map[mime] || 'bin'
}

async function uploadToLocalStorage(buffer: Buffer, familyId: string, mime: string) {
  const extension = getExtension(mime)
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
    localPath: absolutePath,
  }
}

async function uploadToCloudinary(buffer: Buffer, familyId: string) {
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `tet-connect/${familyId}`,
          resource_type: 'image',
          // Strip metadata / re-encode
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) reject(error || new Error('Upload failed'))
          else
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
            })
        }
      )
      .end(buffer)
  })
}

async function destroyCloudinary(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (e) {
    console.error('Failed to cleanup Cloudinary asset', e)
  }
}

export async function POST(request: NextRequest) {
  let uploadedPublicId: string | null = null
  let localPath: string | null = null

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const familyIdRaw = formData.get('familyId') as string | null

    if (!file || !familyIdRaw) {
      return NextResponse.json({ error: 'Thiếu file hoặc familyId' }, { status: 400 })
    }

    // Reject SVG / executable claims early
    if (
      file.type === 'image/svg+xml' ||
      file.name.toLowerCase().endsWith('.svg') ||
      file.name.toLowerCase().endsWith('.html') ||
      file.name.toLowerCase().endsWith('.js')
    ) {
      return NextResponse.json({ error: 'Định dạng file không được phép' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File quá lớn. Kích thước tối đa 10MB.' },
        { status: 400 }
      )
    }

    const { user, familyId } = await requireFamilyMember(familyIdRaw)
    await connectDB()

    // Simple daily quota via photo count
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const todayCount = await Photo.countDocuments({
      userId: user.id,
      uploadedAt: { $gte: startOfDay },
    })
    if (todayCount >= DAILY_UPLOAD_LIMIT) {
      return NextResponse.json(
        { error: 'Bạn đã đạt giới hạn upload trong ngày' },
        { status: 429 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const magicMime = detectMimeFromMagic(buffer)
    if (!magicMime || !ALLOWED_MIMES.has(magicMime)) {
      return NextResponse.json(
        { error: 'Nội dung file không phải ảnh hợp lệ (JPG/PNG/WEBP/HEIC).' },
        { status: 400 }
      )
    }

    // Client MIME must not contradict magic (except HEIC which browsers often mislabel)
    if (
      file.type &&
      ALLOWED_MIMES.has(file.type) &&
      file.type !== magicMime &&
      !(magicMime === 'image/heic')
    ) {
      return NextResponse.json(
        { error: 'MIME type không khớp nội dung file' },
        { status: 400 }
      )
    }

    // Rough pixel limit via file size heuristic when dimensions unavailable
    if (buffer.length > MAX_PIXELS) {
      return NextResponse.json({ error: 'Ảnh vượt giới hạn kích thước' }, { status: 400 })
    }

    let uploadResult: { secure_url: string; public_id: string }

    if (isCloudinaryConfigured()) {
      uploadResult = await uploadToCloudinary(buffer, familyId.toString())
      uploadedPublicId = uploadResult.public_id
    } else if (isProduction()) {
      return NextResponse.json(
        { error: 'Cloudinary bắt buộc trong môi trường production' },
        { status: 503 }
      )
    } else {
      // Local dev fallback only
      const local = await uploadToLocalStorage(buffer, familyId.toString(), magicMime)
      uploadResult = { secure_url: local.secure_url, public_id: local.public_id }
      localPath = local.localPath
    }

    try {
      const photo = await Photo.create({
        familyId,
        userId: user.id,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      })

      await photo.populate('userId', 'name email avatar')
      const populatedUser = photo.userId as unknown as {
        _id: { toString(): string }
        name: string
        email: string
        avatar?: string | null
      }

      return NextResponse.json({
        success: true,
        photo: {
          id: photo._id.toString(),
          familyId: photo.familyId.toString(),
          userId: populatedUser._id.toString(),
          url: photo.url,
          uploadedAt: photo.uploadedAt,
          uploader: {
            id: populatedUser._id.toString(),
            name: populatedUser.name,
            email: populatedUser.email,
            avatar: populatedUser.avatar ?? null,
          },
        },
      })
    } catch (dbError) {
      // Rollback storage if DB save fails
      if (uploadedPublicId && !uploadedPublicId.startsWith('local:')) {
        await destroyCloudinary(uploadedPublicId)
      }
      if (localPath) {
        try {
          await unlink(localPath)
        } catch {
          /* ignore */
        }
      }
      throw dbError
    }
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error uploading photo:', error)
    return NextResponse.json({ error: 'Không thể upload ảnh' }, { status: 500 })
  }
}
