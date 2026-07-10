import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Family from '@/lib/models/Family'
import { generateUniqueInviteCode } from '@/lib/invite-code'
import {
  AuthError,
  authErrorResponse,
  requireFamilyAdmin,
} from '@/lib/authorization'

/**
 * POST — regenerate invite code (family admin only). Old code becomes invalid.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: familyId } = await params
    await requireFamilyAdmin(familyId)
    await connectDB()

    const inviteCode = await generateUniqueInviteCode()
    const family = await Family.findByIdAndUpdate(
      familyId,
      { $set: { inviteCode } },
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
