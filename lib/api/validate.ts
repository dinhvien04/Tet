/**
 * Lightweight runtime validation for API body/query (no extra deps).
 */

export class ValidationError extends Error {
  status = 400

  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
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

export function camelCaseKeys<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
    out[camel] = val
  }
  return out
}
