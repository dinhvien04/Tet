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
import {
  detectMimeFromMagic,
  ImageProcessError,
  MAX_UPLOAD_BYTES,
  processUploadImage,
  type SafeImageMime,
} from '@/lib/image-process'
import { checkDailyQuota, releaseDailyQuota } from '@/lib/rate-limit'
import { destroyCloudinaryOrEnqueue, enqueueStorageCleanup } from '@/lib/storage-cleanup'

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
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

function getExtension(mime: SafeImageMime): string {
  const map: Record<SafeImageMime, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  return map[mime] || 'jpg'
}

async function uploadToLocalStorage(
  buffer: Buffer,
  familyId: string,
  mime: SafeImageMime
) {
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
          // Already stripped/re-encoded by sharp; keep auto quality on CDN
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

export async function POST(request: NextRequest) {
  let uploadedPublicId: string | null = null
  let localPath: string | null = null
  let photoIdCreated: string | null = null
  let quotaBucketKey: string | null = null
  let quotaReserved = false

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

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'File quá lớn. Kích thước tối đa 10MB.' },
        { status: 400 }
      )
    }

    const { user, familyId } = await requireFamilyMember(familyIdRaw)
    await connectDB()

    // Atomic daily quota reservation (release on failure below)
    const quota = await checkDailyQuota({
      key: `upload:user:${user.id}`,
      limit: DAILY_UPLOAD_LIMIT,
    })
    if (!quota.allowed) {
      await releaseDailyQuota({ bucketKey: quota.bucketKey })
      return NextResponse.json(
        {
          error: 'Bạn đã đạt giới hạn upload trong ngày',
          retryAfterSeconds: quota.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(quota.retryAfterSeconds) },
        }
      )
    }
    quotaBucketKey = quota.bucketKey
    quotaReserved = true

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    if (buffer.length > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'File quá lớn. Kích thước tối đa 10MB.' },
        { status: 400 }
      )
    }

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
      magicMime !== 'image/heic'
    ) {
      return NextResponse.json(
        { error: 'MIME type không khớp nội dung file' },
        { status: 400 }
      )
    }

    // Real pixel check + strip EXIF via re-encode + output size limit
    const processed = await processUploadImage(buffer, magicMime)

    let uploadResult: { secure_url: string; public_id: string }

    if (isCloudinaryConfigured()) {
      uploadResult = await uploadToCloudinary(processed.buffer, familyId.toString())
      uploadedPublicId = uploadResult.public_id
    } else if (isProduction()) {
      return NextResponse.json(
        { error: 'Cloudinary bắt buộc trong môi trường production' },
        { status: 503 }
      )
    } else {
      const local = await uploadToLocalStorage(
        processed.buffer,
        familyId.toString(),
        processed.mime
      )
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
      photoIdCreated = photo._id.toString()

      await photo.populate('userId', 'name avatar')
      const populatedUser = photo.userId as unknown as {
        _id: { toString(): string }
        name: string
        avatar?: string | null
      }

      // Success — keep quota reservation
      quotaReserved = false

      return NextResponse.json({
        success: true,
        photo: {
          id: photo._id.toString(),
          familyId: photo.familyId.toString(),
          userId: populatedUser._id.toString(),
          url: photo.url,
          uploadedAt: photo.uploadedAt,
          width: processed.width,
          height: processed.height,
          uploader: {
            id: populatedUser._id.toString(),
            name: populatedUser.name,
            avatar: populatedUser.avatar ?? null,
          },
        },
      })
    } catch (postCreateError) {
      // Rollback both DB metadata and storage on any post-create failure
      if (photoIdCreated) {
        try {
          await Photo.deleteOne({ _id: photoIdCreated })
        } catch (e) {
          console.error('[upload] failed to delete orphan Photo doc', e)
        }
        photoIdCreated = null
      }
      if (uploadedPublicId && !uploadedPublicId.startsWith('local:')) {
        await destroyCloudinaryOrEnqueue(uploadedPublicId, { userId: user.id })
      }
      if (localPath) {
        try {
          await unlink(localPath)
        } catch {
          if (uploadedPublicId) {
            await enqueueStorageCleanup({
              type: 'local',
              publicId: uploadedPublicId,
              userId: user.id,
            })
          }
        }
      }
      throw postCreateError
    }
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    if (error instanceof ImageProcessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error uploading photo:', error)
    return NextResponse.json({ error: 'Không thể upload ảnh' }, { status: 500 })
  } finally {
    if (quotaReserved && quotaBucketKey) {
      try {
        await releaseDailyQuota({ bucketKey: quotaBucketKey })
      } catch (e) {
        console.error('Failed to release upload quota', e)
      }
    }
  }
}
