import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import Photo from '@/lib/models/Photo'
import FamilyMember from '@/lib/models/FamilyMember'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // Get familyId from query params
    const searchParams = request.nextUrl.searchParams
    const familyId = searchParams.get('familyId')
    const from = parseInt(searchParams.get('from') || '0')
    const limit = parseInt(searchParams.get('to') || '19') - from + 1

    if (!familyId) {
      return NextResponse.json(
        { error: 'Missing familyId parameter' },
        { status: 400 }
      )
    }

    // Verify user is member of the family
    const membership = await FamilyMember.findOne({
      familyId,
      userId: session.user.id,
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this family' },
        { status: 403 }
      )
    }

    // Get photos with user info, ordered by upload time (newest first) with pagination
    const photos = await Photo.find({ familyId })
      .populate('userId', 'name email avatar')
      .sort({ uploadedAt: -1 })
      .skip(from)
      .limit(limit)
      .lean()

    const formattedPhotos = photos.map((photo) => {
      const user = photo.userId as unknown as {
        _id: { toString(): string }
        name: string
        email: string
        avatar?: string | null
      }

      return {
        id: photo._id.toString(),
        url: photo.url,
        family_id: photo.familyId.toString(),
        user_id: user._id.toString(),
        uploaded_at: photo.uploadedAt,
        cloudinary_public_id: photo.publicId,
        // Backward-compatible camelCase keys
        familyId: photo.familyId.toString(),
        userId: user._id.toString(),
        uploadedAt: photo.uploadedAt,
        users: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar ?? null,
        },
      }
    })

    return NextResponse.json(formattedPhotos, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
