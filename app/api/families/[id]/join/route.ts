import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Family from '@/lib/models/Family'
import FamilyMember from '@/lib/models/FamilyMember'
import FamilyJoinRequest from '@/lib/models/FamilyJoinRequest'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  AuthError,
  authErrorResponse,
  requireUser,
} from '@/lib/authorization'
import mongoose from 'mongoose'

/**
 * POST /api/families/:id/join
 * :id can be family ObjectId OR invite code (legacy).
 * Body optional: { inviteCode?, message? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireUser()
    const body = await request.json().catch(() => ({}))
    const message =
      typeof body.message === 'string' ? body.message.trim().slice(0, 300) : undefined

    // Rate limit join attempts per user
    const rate = await checkRateLimit({
      key: `join:${user.id}`,
      limit: 10,
      windowMs: 60 * 60 * 1000,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Quá nhiều lần thử tham gia. Vui lòng thử lại sau.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      )
    }

    await connectDB()

    const inviteCode = (body.inviteCode || id || '').toString().toUpperCase()
    let family = null as Awaited<ReturnType<typeof Family.findById>> | null

    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      family = await Family.findById(id)
      if (family && body.inviteCode && family.inviteCode !== String(body.inviteCode).toUpperCase()) {
        return NextResponse.json({ error: 'Mã mời không khớp' }, { status: 400 })
      }
    }

    if (!family && inviteCode) {
      family = await Family.findOne({ inviteCode })
    }

    if (!family) {
      return NextResponse.json({ error: 'Mã mời không hợp lệ' }, { status: 404 })
    }

    const existingMember = await FamilyMember.findOne({
      familyId: family._id,
      userId: user.id,
    })
    if (existingMember) {
      return NextResponse.json(
        { error: 'Bạn đã là thành viên của nhà này' },
        { status: 400 }
      )
    }

    const pending = await FamilyJoinRequest.findOne({
      familyId: family._id,
      userId: user.id,
      status: 'pending',
    })
    if (pending) {
      return NextResponse.json({
        success: true,
        pending: true,
        message: 'Yêu cầu tham gia đang chờ admin duyệt',
        request: {
          id: pending._id.toString(),
          status: pending.status,
        },
        family: {
          id: family._id.toString(),
          name: family.name,
        },
      })
    }

    // Immediate join if approval not required
    if (!family.requireJoinApproval) {
      await FamilyMember.create({
        familyId: family._id,
        userId: user.id,
        role: 'member',
      })
      // Close any old rejected requests
      await FamilyJoinRequest.updateMany(
        { familyId: family._id, userId: user.id, status: { $ne: 'approved' } },
        { $set: { status: 'approved', reviewedAt: new Date() } }
      )

      return NextResponse.json({
        success: true,
        pending: false,
        family: {
          id: family._id.toString(),
          name: family.name,
        },
      })
    }

    const joinRequest = await FamilyJoinRequest.create({
      familyId: family._id,
      userId: user.id,
      status: 'pending',
      message,
    })

    return NextResponse.json(
      {
        success: true,
        pending: true,
        message: 'Đã gửi yêu cầu. Vui lòng chờ admin duyệt.',
        request: {
          id: joinRequest._id.toString(),
          status: joinRequest.status,
        },
        family: {
          id: family._id.toString(),
          name: family.name,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    // Duplicate pending key
    const err = error as { code?: number }
    if (err.code === 11000) {
      return NextResponse.json({
        success: true,
        pending: true,
        message: 'Yêu cầu tham gia đang chờ admin duyệt',
      })
    }
    console.error('Error joining family:', error)
    return NextResponse.json({ error: 'Không thể tham gia nhà' }, { status: 500 })
  }
}
