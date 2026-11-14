import { Transform } from 'class-transformer';

/** Trims string input; leaves other types for the validators to reject. */
export const Trim = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** Trims and lower-cases email input. */
export const NormalizeEmail = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));

/** Turns empty strings into null so optional fields can be cleared. */
export const EmptyToNull = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });
