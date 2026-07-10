import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import FamilyJoinRequest from '@/lib/models/FamilyJoinRequest'
import FamilyMember from '@/lib/models/FamilyMember'
import {
  AuthError,
  authErrorResponse,
  parseObjectId,
  requireFamilyAdmin,
  requireUser,
} from '@/lib/authorization'

/** GET pending (and optional all) join requests — family admin */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: familyId } = await params
    await requireFamilyAdmin(familyId)
    await connectDB()

    const status = request.nextUrl.searchParams.get('status') || 'pending'
    const filter: Record<string, unknown> = { familyId }
    if (status !== 'all') {
      filter.status = status
    }

    const requests = await FamilyJoinRequest.find(filter)
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return NextResponse.json({
      requests: requests.map((r) => {
        const u = r.userId as unknown as {
          _id: { toString(): string }
          name: string
          email: string
          avatar?: string
        }
        return {
          id: r._id.toString(),
          status: r.status,
          message: r.message || null,
          createdAt: r.createdAt,
          user: {
            id: u._id.toString(),
            name: u.name,
            email: u.email,
            avatar: u.avatar ?? null,
          },
        }
      }),
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error listing join requests:', error)
    return NextResponse.json({ error: 'Không thể tải yêu cầu' }, { status: 500 })
  }
}

/**
 * PATCH body: { requestId, action: 'approve' | 'reject' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: familyId } = await params
    const admin = await requireFamilyAdmin(familyId)
    await connectDB()

    const body = await request.json()
    const requestId = body.requestId
    const action = body.action

    if (!requestId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Cần requestId và action approve|reject' },
        { status: 400 }
      )
    }
    parseObjectId(String(requestId), 'requestId')

    const joinRequest = await FamilyJoinRequest.findOne({
      _id: requestId,
      familyId,
      status: 'pending',
    })
    if (!joinRequest) {
      return NextResponse.json(
        { error: 'Không tìm thấy yêu cầu đang chờ' },
        { status: 404 }
      )
    }

    if (action === 'approve') {
      const existing = await FamilyMember.findOne({
        familyId,
        userId: joinRequest.userId,
      })
      if (!existing) {
        await FamilyMember.create({
          familyId,
          userId: joinRequest.userId,
          role: 'member',
        })
      }
      joinRequest.status = 'approved'
    } else {
      joinRequest.status = 'rejected'
    }

    joinRequest.reviewedBy = admin.user.id as unknown as typeof joinRequest.reviewedBy
    joinRequest.reviewedAt = new Date()
    await joinRequest.save()

    console.log('[audit] join_request.' + action, {
      familyId,
      requestId,
      actorId: admin.user.id,
      targetUserId: joinRequest.userId.toString(),
    })

    return NextResponse.json({
      success: true,
      request: {
        id: joinRequest._id.toString(),
        status: joinRequest.status,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error reviewing join request:', error)
    return NextResponse.json({ error: 'Không thể xử lý yêu cầu' }, { status: 500 })
  }
}
