/**
 * Lightweight runtime validation for API body/query (no extra deps).
 */

import mongoose from 'mongoose'

export class ValidationError extends Error {
  status = 400

  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function validationErrorResponse(error: unknown): {
  error: string
  status: number
} {
  if (error instanceof ValidationError) {
    return { error: error.message, status: error.status }
  }
  if (error instanceof SyntaxError) {
    return { error: 'JSON không hợp lệ', status: 400 }
  }
  return { error: 'Dữ liệu không hợp lệ', status: 400 }
}

export function requireString(
  value: unknown,
  field: string,
  options?: { min?: number; max?: number; trim?: boolean }
): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} phải là chuỗi`)
  }

  const text = options?.trim === false ? value : value.trim()
  const min = options?.min ?? 1
  const max = options?.max ?? 10_000

  if (text.length < min) {
    throw new ValidationError(`${field} phải có ít nhất ${min} ký tự`)
  }
  if (text.length > max) {
    throw new ValidationError(`${field} tối đa ${max} ký tự`)
  }

  return text
}

export function requireEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[]
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new ValidationError(`${field} không hợp lệ. Cho phép: ${allowed.join(', ')}`)
  }
  return value as T
}

export function optionalString(
  value: unknown,
  field: string,
  options?: { max?: number }
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return requireString(value, field, { min: 0, max: options?.max ?? 500 })
}

/**
 * Parse ISO / date-string; invalid → 400.
 */
export function requireDate(value: unknown, field: string): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new ValidationError(`${field} không phải ngày hợp lệ`)
    }
    return value
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new ValidationError(`${field} phải là chuỗi ngày hoặc timestamp`)
  }

  if (typeof value === 'string' && value.trim() === '') {
    throw new ValidationError(`${field} không được để trống`)
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${field} không phải ngày hợp lệ`)
  }
  return date
}

/**
 * Mongo ObjectId string validation (400, not 500).
 */
export function requireObjectIdString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !mongoose.Types.ObjectId.isValid(value)) {
    throw new ValidationError(`${field} không hợp lệ`)
  }
  // Reject 12-char strings that pass isValid but are not hex ObjectIds of length 24
  if (!/^[a-fA-F0-9]{24}$/.test(value)) {
    throw new ValidationError(`${field} không hợp lệ`)
  }
  return value
}

/**
 * Accept camelCase or legacy snake_case for family id fields.
 */
export function pickFamilyId(body: Record<string, unknown>): string {
  const raw = body.familyId ?? body.family_id
  return requireObjectIdString(raw, 'familyId')
}

export function camelCaseKeys<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
    out[camel] = val
  }
  return out
}

/**
 * Parse JSON body; malformed JSON → ValidationError 400.
 */
export async function parseJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new ValidationError('Body phải là object JSON')
    }
    return body as Record<string, unknown>
  } catch (err) {
    if (err instanceof ValidationError) throw err
    throw new ValidationError('JSON không hợp lệ')
  }
}
