import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    const { data: membership } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', familyId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this family' },
        { status: 403 }
      )
    }

    // Validate photo URLs belong to the family
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('id, url')
      .eq('family_id', familyId)
      .in('url', photoUrls)

    if (photosError || !photos || photos.length !== photoUrls.length) {
      return NextResponse.json(
        { error: 'Invalid photo URLs provided' },
        { status: 400 }
      )
    }

    // Convert base64 video blob to buffer
    const base64Data = videoBlob.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    // Upload video to Supabase Storage
    const fileName = `${familyId}/recap-${Date.now()}.webm`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, buffer, {
        contentType: 'video/webm',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading video:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload video' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      videoUrl: publicUrl,
      path: uploadData.path
    }, { status: 200 })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
