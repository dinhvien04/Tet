import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Family from '@/lib/models/Family'
import { generateUniqueInviteCode } from '@/lib/invite-code'
import { computeInviteExpiry } from '@/lib/invite'
import {
  AuthError,
  authErrorResponse,
  requireFamilyAdmin,
} from '@/lib/authorization'

/**
 * POST — regenerate invite code (family admin only). Old code becomes invalid.
 * Body optional: { expiresInDays?: number | null } — null = never expires
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: familyId } = await params
    await requireFamilyAdmin(familyId)
    await connectDB()

    const body = await request.json().catch(() => ({}))
    const inviteCode = await generateUniqueInviteCode()

    const update: Record<string, unknown> = { inviteCode }
    if ('expiresInDays' in body) {
      update.inviteExpiresAt =
        body.expiresInDays === null
          ? null
          : computeInviteExpiry(Number(body.expiresInDays))
    } else {
      // Default: 30 days from regenerate
      update.inviteExpiresAt = computeInviteExpiry(30)
    }

    const family = await Family.findByIdAndUpdate(
      familyId,
      { $set: update },
      { new: true }
    )

    if (!family) {
      return NextResponse.json({ error: 'Không tìm thấy nhà' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      family: {
        id: family._id.toString(),
        name: family.name,
        inviteCode: family.inviteCode,
        inviteExpiresAt: family.inviteExpiresAt || null,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error regenerating invite:', error)
    return NextResponse.json({ error: 'Không thể tạo mã mời mới' }, { status: 500 })
  }
}
