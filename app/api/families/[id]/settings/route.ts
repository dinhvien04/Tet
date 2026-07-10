import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Family from '@/lib/models/Family'
import {
  AuthError,
  authErrorResponse,
  requireFamilyAdmin,
} from '@/lib/authorization'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: familyId } = await params
    await requireFamilyAdmin(familyId)
    await connectDB()

    const family = await Family.findById(familyId).select(
      'name inviteCode requireJoinApproval inviteExpiresAt'
    )
    if (!family) {
      return NextResponse.json({ error: 'Không tìm thấy nhà' }, { status: 404 })
    }

    return NextResponse.json({
      settings: {
        name: family.name,
        inviteCode: family.inviteCode,
        requireJoinApproval: family.requireJoinApproval ?? false,
        inviteExpiresAt: family.inviteExpiresAt || null,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    return NextResponse.json({ error: 'Không thể tải cài đặt' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: familyId } = await params
    await requireFamilyAdmin(familyId)
    await connectDB()

    const body = await request.json()
    const family = await Family.findById(familyId)
    if (!family) {
      return NextResponse.json({ error: 'Không tìm thấy nhà' }, { status: 404 })
    }

    if (typeof body.requireJoinApproval === 'boolean') {
      family.requireJoinApproval = body.requireJoinApproval
    }
    if (typeof body.name === 'string' && body.name.trim()) {
      family.name = body.name.trim().slice(0, 100)
    }
    if ('inviteExpiresInDays' in body) {
      const { computeInviteExpiry } = await import('@/lib/invite')
      family.inviteExpiresAt =
        body.inviteExpiresInDays === null
          ? null
          : computeInviteExpiry(Number(body.inviteExpiresInDays))
    }

    await family.save()

    return NextResponse.json({
      success: true,
      settings: {
        name: family.name,
        inviteCode: family.inviteCode,
        requireJoinApproval: family.requireJoinApproval,
        inviteExpiresAt: family.inviteExpiresAt || null,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error updating family settings:', error)
    return NextResponse.json({ error: 'Không thể cập nhật cài đặt' }, { status: 500 })
  }
}
