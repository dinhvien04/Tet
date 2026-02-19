import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import FamilyMember from '@/lib/models/FamilyMember'
import Photo from '@/lib/models/Photo'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // Parse request body
    const body = await request.json()
    const { familyId, photoUrls, videoBlob } = body

    if (!familyId || !photoUrls || !videoBlob) {
      return NextResponse.json(
        { error: 'Missing required fields: familyId, photoUrls, videoBlob' },
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

    // Validate photo URLs belong to the family
    const photos = await Photo.find({
      familyId,
      url: { $in: photoUrls },
    }).select('_id url')

    if (!photos || photos.length !== photoUrls.length) {
      return NextResponse.json(
        { error: 'Invalid photo URLs provided' },
        { status: 400 }
      )
    }

    // Upload video to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(videoBlob, {
      resource_type: 'video',
      folder: `tet-connect/videos/${familyId}`,
      format: 'webm',
    })

    return NextResponse.json({
      success: true,
      videoUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    }, { status: 200 })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
