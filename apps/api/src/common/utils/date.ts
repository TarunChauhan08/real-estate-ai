/**
 * Parses a calendar date `YYYY-MM-DD` into a UTC-midnight Date for a PostgreSQL DATE column.
 * Returns `null` for impossible dates such as 2026-02-31 (which `new Date()` would silently
 * roll over to March).
 */
export function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? date : null;
}

/** Formats a DATE column value back to `YYYY-MM-DD`. */
export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
