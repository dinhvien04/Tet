import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import Family from '@/lib/models/Family'
import FamilyMember from '@/lib/models/FamilyMember'
import { generateUniqueInviteCode } from '@/lib/invite-code'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập' },
        { status: 401 }
      )
    }

    const { name } = await request.json()

    // Validate input
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Tên nhà không hợp lệ' },
        { status: 400 }
      )
    }

    await connectDB()

    let inviteCode: string
    try {
      inviteCode = await generateUniqueInviteCode()
    } catch {
      return NextResponse.json(
        { error: 'Không thể tạo mã mời duy nhất. Vui lòng thử lại.' },
        { status: 500 }
      )
    }

    // Create family + admin membership + bootstrap state docs
    const {
      withMongoTransaction,
      TransactionNotSupportedError,
    } = await import('@/lib/mongo-transaction')
    const BauCuaFamilyState = (await import('@/lib/models/BauCuaFamilyState')).default
    const FamilyAdminState = (await import('@/lib/models/FamilyAdminState')).default

    const creatorId = session.user.id
    let family
    try {
      family = await withMongoTransaction(
        async (mongoSession) => {
          const [fam] = await Family.create(
            [
              {
                name: name.trim(),
                inviteCode,
                createdBy: creatorId,
              },
            ],
            mongoSession ? { session: mongoSession } : undefined
          )
          await FamilyMember.create(
            [
              {
                familyId: fam._id,
                userId: creatorId,
                role: 'admin',
              },
            ],
            mongoSession ? { session: mongoSession } : undefined
          )
          await BauCuaFamilyState.create(
            [
              {
                familyId: fam._id,
                activeRoundId: null,
                status: 'idle',
                version: 0,
                betRevision: 0,
                updatedAt: new Date(),
              },
            ],
            mongoSession ? { session: mongoSession } : undefined
          )
          await FamilyAdminState.create(
            [
              {
                familyId: fam._id,
                adminCount: 1,
                version: 0,
                updatedAt: new Date(),
              },
            ],
            mongoSession ? { session: mongoSession } : undefined
          )
          return fam
        },
        { requireReplicaSet: false }
      )
    } catch (e) {
      if (e instanceof TransactionNotSupportedError) {
        // Dev fallback without RS: sequential create with best-effort bootstrap
        family = await Family.create({
          name: name.trim(),
          inviteCode,
          createdBy: creatorId,
        })
        await FamilyMember.create({
          familyId: family._id,
          userId: creatorId,
          role: 'admin',
        })
        try {
          await BauCuaFamilyState.create({
            familyId: family._id,
            activeRoundId: null,
            status: 'idle',
            version: 0,
            betRevision: 0,
          })
        } catch {
          /* ignore bootstrap race */
        }
        try {
          await FamilyAdminState.create({
            familyId: family._id,
            adminCount: 1,
            version: 0,
          })
        } catch {
          /* ignore */
        }
      } else {
        console.error('Error creating family:', e)
        return NextResponse.json(
          { error: 'Không thể tạo nhà' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      family: {
        id: family._id.toString(),
        name: family.name,
        inviteCode: family.inviteCode,
        createdAt: family.createdAt,
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}

// GET all families for current user OR get family by invite code
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const inviteCode = searchParams.get('inviteCode')

    // If invite code is provided, allow public access (no auth required)
    if (inviteCode) {
      await connectDB()

      const family = await Family.findOne({ inviteCode }).lean()

      if (!family) {
        return NextResponse.json(
          { error: 'Mã mời không hợp lệ' },
          { status: 404 }
        )
      }

      const { isInviteValid } = await import('@/lib/invite')
      const validity = isInviteValid(family)
      if (!validity.valid) {
        return NextResponse.json({ error: validity.reason }, { status: 410 })
      }

      return NextResponse.json({
        families: [{
          id: family._id.toString(),
          name: family.name,
          invite_code: family.inviteCode,
          created_at: family.createdAt,
          invite_expires_at: family.inviteExpiresAt || null,
          require_join_approval: family.requireJoinApproval ?? false,
        }]
      })
    }

    // Otherwise, require authentication to get user's families
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập' },
        { status: 401 }
      )
    }

    await connectDB()

    // Get all family memberships for user
    const memberships = await FamilyMember.find({ userId: session.user.id })
      .populate('familyId')
      .lean()

    const families = memberships.map((membership: any) => ({
      id: membership.familyId._id.toString(),
      name: membership.familyId.name,
      invite_code: membership.familyId.inviteCode,
      role: membership.role,
      joined_at: membership.joinedAt,
      created_at: membership.familyId.createdAt,
    }))

    return NextResponse.json({ families })
  } catch (error) {
    console.error('Error fetching families:', error)
    return NextResponse.json(
      { error: 'Không thể lấy danh sách nhà' },
      { status: 500 }
    )
  }
}
