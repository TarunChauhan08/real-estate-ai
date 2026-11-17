import { canTransitionLeadStatus, LeadStatus, type LeadTemperature } from '@rea/shared-types';
import { type AgentDecision } from '../ai/sales-agent/response';

/** Name used for leads created from a phone number alone. The AI may replace it with the buyer's real name. */
export const PLACEHOLDER_LEAD_NAME = 'New buyer';

export interface LeadSnapshot {
  name: string;
  email: string | null;
  status: LeadStatus;
  temperature: LeadTemperature;
  budgetMin: number | null;
  budgetMax: number | null;
  preferredCity: string | null;
  preferredLocalities: string[];
  preferredBedrooms: number[];
  purpose: string | null;
  timeline: string | null;
  needsHomeLoan: boolean | null;
  preferredLanguage: string | null;
}

export interface LeadPatch {
  name?: string;
  email?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  preferredCity?: string;
  preferredLocalities?: string[];
  preferredBedrooms?: number[];
  purpose?: 'SELF_USE' | 'INVESTMENT';
  timeline?: AgentDecision['leadUpdates']['timeline'];
  needsHomeLoan?: boolean;
  preferredLanguage?: string;
  temperature?: LeadTemperature;
  status?: LeadStatus;
}

/**
 * Decides what the AI is allowed to change on a lead after one turn. Pure, so it is easy to test.
 *
 * - Fills in or corrects facts the buyer stated (budget, city, BHK…).
 * - Never overwrites a real name or email a human entered.
 * - Localities accumulate rather than replace.
 * - Moves the pipeline forward only: NEW → CONTACTED → QUALIFIED. It never closes, wins or loses a lead.
 * - Never downgrades a temperature a human may have set, except from UNSCORED.
 * - Keeps budgetMin ≤ budgetMax against values already stored.
 */
export function planLeadUpdate(lead: LeadSnapshot, decision: AgentDecision): LeadPatch {
  const u = decision.leadUpdates;
  const patch: LeadPatch = {};
  const set = <K extends keyof LeadPatch>(key: K, value: LeadPatch[K], current: unknown) => {
    if (value !== undefined && JSON.stringify(value) !== JSON.stringify(current))
      patch[key] = value;
  };

  if (u.name && lead.name === PLACEHOLDER_LEAD_NAME) set('name', u.name, lead.name);
  if (u.email && !lead.email) set('email', u.email, lead.email);

  let budgetMin = u.budgetMin ?? lead.budgetMin;
  let budgetMax = u.budgetMax ?? lead.budgetMax;
  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
    // A new bound contradicts a stored one: trust what the buyer just said and drop the stale bound.
    if (u.budgetMin === undefined) budgetMin = null;
    else if (u.budgetMax === undefined) budgetMax = null;
  }
  if (budgetMin !== lead.budgetMin) patch.budgetMin = budgetMin;
  if (budgetMax !== lead.budgetMax) patch.budgetMax = budgetMax;

  set('preferredCity', u.preferredCity, lead.preferredCity);
  if (u.preferredLocalities?.length) {
    const seen = new Set(lead.preferredLocalities.map((l) => l.toLowerCase()));
    const merged = [...lead.preferredLocalities];
    for (const locality of u.preferredLocalities) {
      if (!seen.has(locality.toLowerCase())) {
        seen.add(locality.toLowerCase());
        merged.push(locality);
      }
    }
    set('preferredLocalities', merged.slice(0, 20), lead.preferredLocalities);
  }
  if (u.preferredBedrooms?.length)
    set('preferredBedrooms', u.preferredBedrooms, lead.preferredBedrooms);
  set('purpose', u.purpose, lead.purpose);
  set('timeline', u.timeline, lead.timeline);
  set('needsHomeLoan', u.needsHomeLoan, lead.needsHomeLoan);
  set('preferredLanguage', decision.language, lead.preferredLanguage);

  if (decision.temperature !== 'UNSCORED')
    set('temperature', decision.temperature, lead.temperature);

  const target: LeadStatus =
    decision.qualified && (lead.status === LeadStatus.NEW || lead.status === LeadStatus.CONTACTED)
      ? LeadStatus.QUALIFIED
      : lead.status === LeadStatus.NEW
        ? LeadStatus.CONTACTED
        : lead.status;
  if (target !== lead.status && canTransitionLeadStatus(lead.status, target)) patch.status = target;

  return patch;
}
