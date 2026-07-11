import { connectDB } from '@/lib/mongodb'
import AuditEvent from '@/lib/models/AuditEvent'

const BLOCKED_META_KEYS = new Set([
  'password',
  'inviteCode',
  'invite_code',
  'token',
  'secret',
  'authorization',
  'apiKey',
  'api_key',
  'prompt',
  'traits',
  'content',
  'publicId', // may be ok but avoid accidental secret paths
])

function sanitizeMetadata(
  meta?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!meta) return undefined
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(meta)) {
    if (BLOCKED_META_KEYS.has(k)) continue
    if (typeof v === 'string' && v.length > 500) {
      out[k] = v.slice(0, 500) + '…'
    } else if (v !== undefined) {
      out[k] = v
    }
  }
  return Object.keys(out).length ? out : undefined
}

/**
 * Persist a structured audit event. Never throws to callers — logging must not
 * break the primary request path.
 */
export async function writeAuditEvent(options: {
  actorId?: string | null
  familyId?: string | null
  action: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
  requestId?: string | null
}): Promise<void> {
  try {
    await connectDB()
    await AuditEvent.create({
      actorId: options.actorId || null,
      familyId: options.familyId || null,
      action: options.action,
      targetType: options.targetType || null,
      targetId: options.targetId || null,
      metadata: sanitizeMetadata(options.metadata),
      requestId: options.requestId || null,
      createdAt: new Date(),
    })
  } catch (e) {
    console.error('[audit] write failed', options.action, e)
  }

  // Structured console line for log drains
  console.log(
    JSON.stringify({
      level: 'audit',
      action: options.action,
      actorId: options.actorId || undefined,
      familyId: options.familyId || undefined,
      targetType: options.targetType,
      targetId: options.targetId,
      requestId: options.requestId || undefined,
      at: new Date().toISOString(),
    })
  )
}
