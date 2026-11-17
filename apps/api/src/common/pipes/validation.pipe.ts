import { ValidationPipe, type ValidationError } from '@nestjs/common';
import { Errors, type FieldError } from '../errors/app.exception';

/** Class-validator errors → `{ field, message }` list (nested fields joined with dots). */
export function flatten(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({ field, message }));
    return [...own, ...flatten(error.children ?? [], field)];
  });
}

/**
 * Global DTO validation: strips unknown properties, rejects requests that send them,
 * transforms payloads into DTO instances, and reports field errors in the standard envelope.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors) => Errors.validation(flatten(errors)),
  });
}
