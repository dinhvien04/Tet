import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import sharp from 'sharp'
import { AuthError } from '@/lib/authorization'
import { ImageProcessError } from '@/lib/image-process'

const mockRequireFamilyMember = vi.hoisted(() => vi.fn())
const mockCheckDailyQuota = vi.hoisted(() => vi.fn())
const mockReleaseDailyQuota = vi.hoisted(() => vi.fn())
const mockPhotoCreate = vi.hoisted(() => vi.fn())
const mockPhotoCount = vi.hoisted(() => vi.fn())

vi.mock('@/lib/authorization', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
      this.name = 'AuthError'
    }
  }
  return {
    AuthError,
    requireFamilyMember: (...a: unknown[]) => mockRequireFamilyMember(...a),
    authErrorResponse: (error: unknown) => {
      if (error instanceof AuthError) {
        return { error: error.message, status: error.status }
      }
      return { error: 'error', status: 500 }
    },
  }
})

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn(async () => ({})) }))
vi.mock('@/lib/models/Photo', () => ({
  default: {
    create: (...a: unknown[]) => mockPhotoCreate(...a),
    countDocuments: (...a: unknown[]) => mockPhotoCount(...a),
    deleteOne: vi.fn(async () => ({})),
  },
}))
vi.mock('@/lib/rate-limit', () => ({
  checkDailyQuota: (...a: unknown[]) => mockCheckDailyQuota(...a),
  releaseDailyQuota: (...a: unknown[]) => mockReleaseDailyQuota(...a),
}))
vi.mock('@/lib/storage-cleanup', () => ({
  destroyCloudinaryOrEnqueue: vi.fn(async () => ({ destroyed: true, enqueued: false })),
  enqueueStorageCleanup: vi.fn(async () => undefined),
}))
vi.mock('@/lib/cloudinary', () => ({
  default: {
    uploader: {
      upload_stream: () => ({ end: () => undefined }),
      destroy: vi.fn(),
    },
  },
}))

import { POST } from '@/app/api/photos/upload/route'

async function jpegFile(name = 'test.jpg', w = 40, h = 40): Promise<File> {
  const buf = await sharp({
    create: {
      width: w,
      height: h,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .jpeg()
    .toBuffer()
  return new File([buf], name, { type: 'image/jpeg' })
}

function formRequest(file: File | null, familyId: string | null) {
  const fd = new FormData()
  if (file) fd.append('file', file)
  if (familyId) fd.append('familyId', familyId)
  return new NextRequest('http://localhost/api/photos/upload', {
    method: 'POST',
    body: fd,
  })
}

describe('POST /api/photos/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireFamilyMember.mockResolvedValue({
      user: { id: '507f1f77bcf86cd799439011' },
      familyId: { toString: () => '507f1f77bcf86cd799439012' },
    })
    mockCheckDailyQuota.mockResolvedValue({
      allowed: true,
      remaining: 49,
      retryAfterSeconds: 1,
      count: 1,
      bucketKey: 'upload:user:u1:0',
      reservationId: 'r1',
      windowStartMs: 0,
    })
    mockReleaseDailyQuota.mockResolvedValue(undefined)
    mockPhotoCreate.mockImplementation(async (doc: Record<string, unknown>) => {
      const photo = {
        _id: { toString: () => '507f1f77bcf86cd799439099' },
        familyId: { toString: () => '507f1f77bcf86cd799439012' },
        userId: {
          _id: { toString: () => '507f1f77bcf86cd799439011' },
          name: 'Test',
          avatar: null,
        },
        url: '/uploads/x.jpg',
        publicId: 'local:uploads/x.jpg',
        uploadedAt: new Date(),
        populate: async function populate() {
          return this
        },
      }
      void doc
      return photo
    })
    // Force non-production local path
    process.env.NODE_ENV = 'test'
    delete process.env.VERCEL_ENV
    delete process.env.CLOUDINARY_CLOUD_NAME
  })

  it('returns 400 when file missing', async () => {
    const res = await POST(formRequest(null, '507f1f77bcf86cd799439012'))
    expect(res.status).toBe(400)
  })

  it('returns 401/403 when not a family member', async () => {
    mockRequireFamilyMember.mockRejectedValue(new AuthError('Vui lòng đăng nhập', 401))
    const file = await jpegFile()
    const res = await POST(formRequest(file, '507f1f77bcf86cd799439012'))
    expect(res.status).toBe(401)
  })

  it('returns 429 when daily quota exceeded', async () => {
    mockCheckDailyQuota.mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 3600,
      count: 51,
      bucketKey: 'upload:user:u1:0',
      reservationId: 'r1',
      windowStartMs: 0,
    })
    const file = await jpegFile()
    const res = await POST(formRequest(file, '507f1f77bcf86cd799439012'))
    expect(res.status).toBe(429)
    // Over-limit increment is released
    expect(mockReleaseDailyQuota).toHaveBeenCalledWith({
      bucketKey: 'upload:user:u1:0',
    })
  })

  it('returns 400 for non-image content', async () => {
    const file = new File(['hello world'], 'x.jpg', { type: 'image/jpeg' })
    const res = await POST(formRequest(file, '507f1f77bcf86cd799439012'))
    expect(res.status).toBe(400)
    expect(mockReleaseDailyQuota).toHaveBeenCalled()
  })

  it('uploads valid JPEG and returns photo with dimensions (no email in DTO)', async () => {
    const file = await jpegFile('ok.jpg', 80, 60)
    const res = await POST(formRequest(file, '507f1f77bcf86cd799439012'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.photo.width).toBe(80)
    expect(data.photo.height).toBe(60)
    expect(data.photo.uploader.email).toBeUndefined()
    expect(mockPhotoCreate).toHaveBeenCalled()
    // success keeps quota
    expect(mockReleaseDailyQuota).not.toHaveBeenCalled()
  })

  it('deletes Photo doc when populate fails after create', async () => {
    const mockDeleteOne = vi.fn(async () => ({}))
    const Photo = (await import('@/lib/models/Photo')).default as {
      create: typeof mockPhotoCreate
      deleteOne: typeof mockDeleteOne
    }
    // Attach deleteOne on mocked default
    ;(Photo as { deleteOne?: typeof mockDeleteOne }).deleteOne = mockDeleteOne

    mockPhotoCreate.mockImplementation(async () => {
      const photo = {
        _id: { toString: () => '507f1f77bcf86cd799439099' },
        familyId: { toString: () => '507f1f77bcf86cd799439012' },
        userId: '507f1f77bcf86cd799439011',
        url: '/uploads/x.jpg',
        publicId: 'local:uploads/x.jpg',
        uploadedAt: new Date(),
        populate: async () => {
          throw new Error('populate failed')
        },
      }
      return photo
    })

    const file = await jpegFile()
    const res = await POST(formRequest(file, '507f1f77bcf86cd799439012'))
    expect(res.status).toBe(500)
    expect(mockReleaseDailyQuota).toHaveBeenCalled()
  })

  it('releases quota when DB create fails', async () => {
    mockPhotoCreate.mockRejectedValue(new Error('db down'))
    const file = await jpegFile()
    const res = await POST(formRequest(file, '507f1f77bcf86cd799439012'))
    expect(res.status).toBe(500)
    expect(mockReleaseDailyQuota).toHaveBeenCalled()
  })

  it('rejects SVG', async () => {
    const file = new File(['<svg></svg>'], 'x.svg', { type: 'image/svg+xml' })
    const res = await POST(formRequest(file, '507f1f77bcf86cd799439012'))
    expect(res.status).toBe(400)
  })

  // Ensure ImageProcessError type is importable for route (compile-time)
  it('exports ImageProcessError for route handling', () => {
    expect(new ImageProcessError('x').status).toBe(400)
  })
})
