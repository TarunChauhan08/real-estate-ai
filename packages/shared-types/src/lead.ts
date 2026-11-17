import {
  LeadStatus,
  type LeadPurpose,
  type LeadSource,
  type LeadTemperature,
  type PurchaseTimeline,
} from './enums';

export interface LeadDto {
  id: string;
  name: string;
  /** E.164, e.g. +919876543210. */
  phone: string;
  email: string | null;
  source: LeadSource;
  status: LeadStatus;
  temperature: LeadTemperature;
  /** Whole rupees. */
  budgetMin: number | null;
  budgetMax: number | null;
  preferredCity: string | null;
  preferredLocalities: string[];
  preferredBedrooms: number[];
  purpose: LeadPurpose | null;
  timeline: PurchaseTimeline | null;
  needsHomeLoan: boolean | null;
  /** en | hi | hinglish */
  preferredLanguage: string | null;
  notes: string | null;
  /** Membership ID and display name of the assigned team member. */
  assignedTo: { id: string; name: string } | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lead pipeline rules. WON is terminal. A LOST lead can only be re-opened as NEW.
 * Every other move is allowed — real sales conversations are not strictly linear, and a rigid
 * state machine would only make people work around it.
 */
export function canTransitionLeadStatus(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return true;
  if (from === LeadStatus.WON) return false;
  if (from === LeadStatus.LOST) return to === LeadStatus.NEW;
  return true;
}
