/**
 * Shared application error types for consistent API classification.
 * Prefer throwing these over broad catch{} / bare Error.
 */

export class AppError extends Error {
  status: number
  code: string

  constructor(message: string, status = 500, code = 'INTERNAL') {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
    this.name = 'ConflictError'
  }
}

export class InvariantViolationError extends AppError {
  constructor(message: string) {
    super(message, 409, 'INVARIANT_VIOLATION')
    this.name = 'InvariantViolationError'
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, status = 502) {
    super(message, status, 'EXTERNAL_SERVICE')
    this.name = 'ExternalServiceError'
  }
}

export class CleanupPendingError extends AppError {
  constructor(message = 'Cleanup still pending') {
    super(message, 202, 'CLEANUP_PENDING')
    this.name = 'CleanupPendingError'
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
