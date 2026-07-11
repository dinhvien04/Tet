import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Photo from '@/lib/models/Photo'
import {
  AuthError,
  authErrorResponse,
  requireFamilyMember,
} from '@/lib/authorization'
import {
  parseLimit,
  decodeCursor,
  cursorFilter,
  buildNextCursor,
  InvalidCursorError,
} from '@/lib/api/pagination'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const familyId = searchParams.get('familyId')
    if (!familyId) {
      return NextResponse.json({ error: 'Thiếu familyId' }, { status: 400 })
    }

    await requireFamilyMember(familyId)
    await connectDB()

    const limit = parseLimit(searchParams.get('limit') || searchParams.get('to'))
    const cursor = decodeCursor(searchParams.get('cursor'))
    const from = Math.max(0, parseInt(searchParams.get('from') || '0', 10) || 0)

    const filter = {
      familyId,
      ...cursorFilter(cursor, 'uploadedAt'),
    }

    // uploadedAt is the photo date field — use createdAt-style cursor on uploadedAt
    let query = Photo.find(filter)
      .populate('userId', 'name avatar')
      .sort({ uploadedAt: -1, _id: -1 })
      .limit(limit)

    if (!cursor && from > 0) {
      query = query.skip(Math.min(from, 500))
    }

    const photos = await query.lean()
    const nextCursor = buildNextCursor(
      photos as Array<{ uploadedAt: Date; _id: { toString(): string } }>,
      limit,
      'uploadedAt'
    )

    const formattedPhotos = photos.map((photo) => {
      const user = photo.userId as unknown as {
        _id: { toString(): string }
        name: string
        avatar?: string | null
      }

      return {
        id: photo._id.toString(),
        url: photo.url,
        familyId: photo.familyId.toString(),
        userId: user._id.toString(),
        uploadedAt: photo.uploadedAt,
        users: {
          id: user._id.toString(),
          name: user.name,
          avatar: user.avatar ?? null,
        },
      }
    })

    return NextResponse.json({
      photos: formattedPhotos,
      nextCursor,
      limit,
    })
  } catch (error) {
    if (error instanceof InvalidCursorError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error listing photos:', error)
    return NextResponse.json({ error: 'Không thể tải ảnh' }, { status: 500 })
  }
}
