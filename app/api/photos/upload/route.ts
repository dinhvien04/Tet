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

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const familyId = formData.get('familyId') as string

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'Missing file' },
        { status: 400 }
      )
    }

    if (!familyId) {
      return NextResponse.json(
        { error: 'Missing familyId' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/heic']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Định dạng file không hợp lệ. Chỉ chấp nhận JPG, PNG, HEIC.' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File quá lớn. Kích thước tối đa 10MB.' },
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

    // Upload file to Supabase Storage
    const fileName = `${familyId}/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      
      // Handle specific storage errors
      if (uploadError.message.includes('quota')) {
        return NextResponse.json(
          { error: 'Dung lượng lưu trữ đã đầy. Vui lòng xóa ảnh cũ.' },
          { status: 507 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName)

    // Save metadata to database
    const { data: photo, error: dbError } = await supabase
      .from('photos')
      .insert({
        family_id: familyId,
        user_id: user.id,
        url: publicUrl
      })
      .select(`
        *,
        users (
          id,
          name,
          avatar,
          email
        )
      `)
      .single()

    if (dbError) {
      console.error('Error saving photo metadata:', dbError)
      
      // Try to clean up uploaded file
      await supabase.storage
        .from('photos')
        .remove([fileName])
      
      return NextResponse.json(
        { error: 'Failed to save photo metadata' },
        { status: 500 }
      )
    }

    return NextResponse.json(photo, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
