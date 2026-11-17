import { formatInr } from '@rea/shared-types';

export function formatBudget(min: number | null, max: number | null): string | null {
  if (min && max) return min === max ? formatInr(min) : `${formatInr(min)} – ${formatInr(max)}`;
  if (max) return `up to ${formatInr(max)}`;
  if (min) return `from ${formatInr(min)}`;
  return null;
}

/** Converts "85 lakh" / "1.2 cr" / "8500000" typed in a form into whole rupees. */
export function parseRupees(input: string): number | null {
  const text = input
    .trim()
    .toLowerCase()
    .replace(/[₹,\s]/g, '');
  if (!text) return null;
  const match = /^(\d+(?:\.\d+)?)(cr|crore|crores|l|lac|lakh|lakhs|k)?$/.exec(text);
  if (!match) return Number.NaN;
  const value = Number(match[1]);
  const unit = match[2];
  const multiplier = !unit ? 1 : unit.startsWith('c') ? 10_000_000 : unit === 'k' ? 1_000 : 100_000;
  return Math.round(value * multiplier);
}
