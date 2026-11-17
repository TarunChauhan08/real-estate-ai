import {
  type ListingType,
  type PossessionStatus,
  type PropertyStatus,
  type PropertyType,
} from './enums';

/** A listing in the business's inventory. Money is whole rupees. */
export interface PropertyDto {
  id: string;
  title: string;
  projectName: string | null;
  propertyType: PropertyType;
  listingType: ListingType;
  status: PropertyStatus;
  bedrooms: number | null;
  bathrooms: number | null;
  carpetAreaSqft: number | null;
  /** Whole rupees: sale price, or monthly rent for RENT listings. */
  price: number;
  locality: string | null;
  city: string;
  state: string | null;
  pincode: string | null;
  possessionStatus: PossessionStatus | null;
  /** ISO calendar date (YYYY-MM-DD). */
  possessionDate: string | null;
  reraNumber: string | null;
  amenities: string[];
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Largest price the API accepts (₹10,000 crore) — keeps values safely inside JS number range. */
export const MAX_PRICE_RUPEES = 100_000_000_000;

/**
 * Indian-style short price: ₹45,000 · ₹85 lakh · ₹1.25 crore.
 * Used by both the web app and the AI prompt so buyers always see the same wording.
 */
export function formatInr(rupees: number): string {
  const trim = (n: number) => n.toFixed(2).replace(/\.?0+$/, '');
  if (rupees >= 10_000_000) return `₹${trim(rupees / 10_000_000)} crore`;
  if (rupees >= 100_000) return `₹${trim(rupees / 100_000)} lakh`;
  return `₹${rupees.toLocaleString('en-IN')}`;
}
