import { HttpException, HttpStatus } from '@nestjs/common';

export interface FieldError {
  field: string;
  message: string;
}

/**
 * Application exception carrying a stable, machine-readable error code.
 * Services throw these; the global filter renders them into the standard error envelope.
 */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: string,
    message: string,
    readonly details?: FieldError[],
  ) {
    super({ code, message, details }, status);
  }
}

export const Errors = {
  validation: (details: FieldError[]) =>
    new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_FAILED', 'Request validation failed', details),
  unauthenticated: (message = 'Authentication required') =>
    new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', message),
  invalidCredentials: () =>
    new AppException(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Invalid email or password'),
  forbidden: (message = 'You do not have permission to perform this action') =>
    new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN', message),
  notFound: (entity = 'Resource') =>
    new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', `${entity} not found`),
  conflict: (code: string, message: string) => new AppException(HttpStatus.CONFLICT, code, message),
  badRequest: (code: string, message: string) =>
    new AppException(HttpStatus.BAD_REQUEST, code, message),
} as const;
