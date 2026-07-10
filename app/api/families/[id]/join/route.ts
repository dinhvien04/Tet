import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Family from '@/lib/models/Family'
import FamilyMember from '@/lib/models/FamilyMember'
import FamilyJoinRequest from '@/lib/models/FamilyJoinRequest'
import { checkRateLimit } from '@/lib/rate-limit'
import { isInviteValid } from '@/lib/invite'
import {
  AuthError,
  authErrorResponse,
  requireUser,
} from '@/lib/authorization'
import { jsonPrivate } from '@/lib/http-cache'

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * POST — join family ONLY with inviteCode (never family ObjectId alone).
 * Body: { inviteCode: string, message?: string }
 * :id path param is ignored for authorization (legacy path kept for URL shape).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // consume params to satisfy Next (id must not be used as secret)
    await params

    const user = await requireUser()
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return jsonPrivate({ error: 'JSON body không hợp lệ' }, { status: 400 })
    }

    const inviteCodeRaw = (body as { inviteCode?: unknown }).inviteCode
    if (typeof inviteCodeRaw !== 'string' || !inviteCodeRaw.trim()) {
      return jsonPrivate(
        { error: 'Bắt buộc inviteCode. Không thể join chỉ bằng family id.' },
        { status: 400 }
      )
    }

    const inviteCode = inviteCodeRaw.trim().toUpperCase()
    // Never log invite codes
    const message =
      typeof (body as { message?: unknown }).message === 'string'
        ? (body as { message: string }).message.trim().slice(0, 300)
        : undefined

    const ip = clientIp(request)
    const [userRate, ipRate, codeRate] = await Promise.all([
      checkRateLimit({ key: `join:user:${user.id}`, limit: 10, windowMs: 3_600_000 }),
      checkRateLimit({ key: `join:ip:${ip}`, limit: 30, windowMs: 3_600_000 }),
      checkRateLimit({ key: `join:code:${inviteCode}`, limit: 40, windowMs: 3_600_000 }),
    ])

    if (!userRate.allowed || !ipRate.allowed || !codeRate.allowed) {
      const retry = Math.max(
        userRate.retryAfterSeconds,
        ipRate.retryAfterSeconds,
        codeRate.retryAfterSeconds
      )
      return jsonPrivate(
        { error: 'Quá nhiều lần thử tham gia. Vui lòng thử lại sau.' },
        { status: 429 }
      )
    }

    await connectDB()

    const family = await Family.findOne({ inviteCode })
    if (!family) {
      return jsonPrivate({ error: 'Mã mời không hợp lệ' }, { status: 404 })
    }

    const validity = isInviteValid(family)
    if (!validity.valid) {
      return jsonPrivate({ error: validity.reason }, { status: 410 })
    }

    const existingMember = await FamilyMember.findOne({
      familyId: family._id,
      userId: user.id,
    })
    if (existingMember) {
      return jsonPrivate(
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
      return jsonPrivate({
        success: true,
        pending: true,
        message: 'Yêu cầu tham gia đang chờ admin duyệt',
        request: { id: pending._id.toString(), status: pending.status },
        family: { id: family._id.toString(), name: family.name },
      })
    }

    if (!family.requireJoinApproval) {
      try {
        await FamilyMember.create({
          familyId: family._id,
          userId: user.id,
          role: 'member',
        })
      } catch (err: unknown) {
        const e = err as { code?: number }
        if (e.code === 11000) {
          return jsonPrivate({
            success: true,
            pending: false,
            family: { id: family._id.toString(), name: family.name },
          })
        }
        throw err
      }

      return jsonPrivate({
        success: true,
        pending: false,
        family: { id: family._id.toString(), name: family.name },
      })
    }

    try {
      const joinRequest = await FamilyJoinRequest.create({
        familyId: family._id,
        userId: user.id,
        status: 'pending',
        message,
      })
      return jsonPrivate(
        {
          success: true,
          pending: true,
          message: 'Đã gửi yêu cầu. Vui lòng chờ admin duyệt.',
          request: {
            id: joinRequest._id.toString(),
            status: joinRequest.status,
          },
          family: { id: family._id.toString(), name: family.name },
        },
        { status: 201 }
      )
    } catch (err: unknown) {
      const e = err as { code?: number }
      if (e.code === 11000) {
        return jsonPrivate({
          success: true,
          pending: true,
          message: 'Yêu cầu tham gia đang chờ admin duyệt',
        })
      }
      throw err
    }
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return jsonPrivate({ error: message }, { status })
    }
    console.error('Error joining family')
    return jsonPrivate({ error: 'Không thể tham gia nhà' }, { status: 500 })
  }
}
