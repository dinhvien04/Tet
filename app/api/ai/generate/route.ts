import { NextRequest, NextResponse } from 'next/server'
import { AuthError, authErrorResponse, requireUser } from '@/lib/authorization'
import { checkDailyQuota, checkRateLimit } from '@/lib/rate-limit'

const VALID_TYPES = ['cau-doi', 'loi-chuc', 'thiep-tet'] as const
type ContentType = (typeof VALID_TYPES)[number]

const AI_TIMEOUT_MS = 25_000
const MAX_RECIPIENT = 100
const MAX_TRAITS = 500
const RATE_LIMIT_PER_MIN = 10
const DAILY_QUOTA = 50

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function validatePayload(body: unknown): {
  type: ContentType
  recipientName: string
  traits: string
} {
  if (!body || typeof body !== 'object') {
    throw new AuthError('Payload không hợp lệ', 400)
  }

  const { type, recipientName, traits } = body as Record<string, unknown>

  if (typeof type !== 'string' || !VALID_TYPES.includes(type as ContentType)) {
    throw new AuthError('Loại nội dung không hợp lệ. Phải là: cau-doi, loi-chuc, thiep-tet', 400)
  }

  if (typeof recipientName !== 'string') {
    throw new AuthError('Tên người nhận không hợp lệ', 400)
  }
  if (typeof traits !== 'string') {
    throw new AuthError('Đặc điểm không hợp lệ', 400)
  }

  const normalizedName = recipientName.trim()
  const normalizedTraits = traits.trim()

  if (normalizedName.length < 1 || normalizedName.length > MAX_RECIPIENT) {
    throw new AuthError(`Tên người nhận phải từ 1–${MAX_RECIPIENT} ký tự`, 400)
  }
  if (normalizedTraits.length < 1 || normalizedTraits.length > MAX_TRAITS) {
    throw new AuthError(`Đặc điểm phải từ 1–${MAX_TRAITS} ký tự`, 400)
  }

  return {
    type: type as ContentType,
    recipientName: normalizedName,
    traits: normalizedTraits,
  }
}

function buildPrompt(type: ContentType, recipientName: string, traits: string): string {
  const prompts: Record<ContentType, string> = {
    'cau-doi': `Hãy tạo MỘT câu đối Tết ngắn gọn cho ${recipientName}. Đặc điểm: ${traits}. Chỉ viết 2 câu đối xứng, mỗi câu 7-8 chữ.`,
    'loi-chuc': `Hãy viết lời chúc Tết ngắn gọn cho ${recipientName}. Đặc điểm: ${traits}. Chỉ 2-3 câu ngắn.`,
    'thiep-tet': `Hãy tạo nội dung thiệp Tết ngắn gọn cho ${recipientName}. Đặc điểm: ${traits}. Tối đa 4-5 câu.`,
  }
  return prompts[type]
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const { type, recipientName, traits } = validatePayload(body)

    const ip = getClientIp(request)

    const userRate = await checkRateLimit({
      key: `ai:user:${user.id}`,
      limit: RATE_LIMIT_PER_MIN,
      windowMs: 60_000,
    })
    if (!userRate.allowed) {
      return NextResponse.json(
        { error: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.' },
        {
          status: 429,
          headers: { 'Retry-After': String(userRate.retryAfterSeconds) },
        }
      )
    }

    const ipRate = await checkRateLimit({
      key: `ai:ip:${ip}`,
      limit: RATE_LIMIT_PER_MIN * 2,
      windowMs: 60_000,
    })
    if (!ipRate.allowed) {
      return NextResponse.json(
        { error: 'Quá nhiều yêu cầu từ địa chỉ này. Vui lòng thử lại sau.' },
        {
          status: 429,
          headers: { 'Retry-After': String(ipRate.retryAfterSeconds) },
        }
      )
    }

    // Peek successful usage (do not increment until provider succeeds)
    const { default: RateLimit } = await import('@/lib/models/RateLimit')
    const { connectDB } = await import('@/lib/mongodb')
    await connectDB()
    const dayMs = 24 * 60 * 60 * 1000
    const windowStartMs = Date.now() - (Date.now() % dayMs)
    const successKey = `ai:success:${user.id}:${windowStartMs}`
    const successRecord = await RateLimit.findOne({ key: successKey }).lean()
    if (successRecord && successRecord.count >= DAILY_QUOTA) {
      return NextResponse.json(
        { error: 'Bạn đã hết hạn mức AI trong ngày. Vui lòng quay lại vào ngày mai.' },
        { status: 429 }
      )
    }

    const apiKey = process.env.MEGALLM_API_KEY
    const model = process.env.MEGALLM_MODEL
    if (!apiKey || !model) {
      return NextResponse.json({ error: 'Dịch vụ AI chưa được cấu hình.' }, { status: 503 })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

    try {
      const response = await fetch('https://ai.megallm.io/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'Bạn là chuyên gia văn hóa Tết Việt Nam. Viết ngắn gọn, súc tích, dễ hiểu.',
            },
            {
              role: 'user',
              content: buildPrompt(type, recipientName, traits),
            },
          ],
          temperature: 0.7,
          max_tokens: 150,
        }),
        signal: controller.signal,
      })

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Dịch vụ AI tạm thời gặp sự cố cấu hình.' },
          { status: 502 }
        )
      }

      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Nhà cung cấp AI đang quá tải. Vui lòng thử lại sau.' },
          { status: 429 }
        )
      }

      if (!response.ok) {
        console.error('[ai] upstream status', response.status)
        return NextResponse.json(
          { error: 'Dịch vụ AI tạm thời gặp sự cố. Vui lòng thử lại.' },
          { status: 502 }
        )
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
        usage?: { total_tokens?: number }
      }

      const content = (data.choices?.[0]?.message?.content || '').trim()
      if (!content || content.length > 4000) {
        return NextResponse.json(
          { error: 'Dịch vụ AI trả về nội dung không hợp lệ.' },
          { status: 502 }
        )
      }

      // Increment successful usage only after valid content
      const daily = await checkDailyQuota({
        key: `ai:success:${user.id}`,
        limit: DAILY_QUOTA,
      })

      console.log('[ai] usage', {
        userId: user.id,
        type,
        totalTokens: data.usage?.total_tokens ?? null,
      })

      return NextResponse.json({
        content,
        usage: {
          remainingToday: daily.remaining,
        },
      })
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }

    const err = error as { name?: string; message?: string }

    if (err.name === 'AbortError' || err.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'Yêu cầu quá lâu. Vui lòng thử lại.' },
        { status: 504 }
      )
    }

    console.error('[ai] error', { name: err.name })
    return NextResponse.json(
      { error: 'Dịch vụ AI tạm thời gặp sự cố. Vui lòng thử lại.' },
      { status: 500 }
    )
  }
}
