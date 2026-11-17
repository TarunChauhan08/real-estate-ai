import { registerDecorator, type ValidationOptions } from 'class-validator';

/**
 * True for any IANA time-zone identifier the runtime understands, including aliases.
 * (ICU's canonical list names India `Asia/Calcutta`; `Asia/Kolkata` must also be accepted.)
 */
export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Accepts IANA time-zone identifiers, e.g. `Asia/Kolkata`. */
export function IsTimeZone(options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isTimeZone',
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: { message: 'Must be a valid IANA time zone, e.g. Asia/Kolkata', ...options },
      validator: { validate: isValidTimeZone },
    });
  };
}
