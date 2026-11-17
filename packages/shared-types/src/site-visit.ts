import { type LeadStatus } from './enums';

/**
 * REQUESTED → CONFIRMED → COMPLETED | NO_SHOW, or CANCELLED from any open state.
 * The AI can only create REQUESTED visits; people confirm exact slots.
 */
export const SiteVisitStatus = {
  REQUESTED: 'REQUESTED',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type SiteVisitStatus = (typeof SiteVisitStatus)[keyof typeof SiteVisitStatus];

export const SITE_VISIT_STATUS_LABELS: Record<SiteVisitStatus, string> = {
  REQUESTED: 'Needs confirmation',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
};

/** Open visits still need action from the team. */
export const OPEN_SITE_VISIT_STATUSES: readonly SiteVisitStatus[] = [
  SiteVisitStatus.REQUESTED,
  SiteVisitStatus.CONFIRMED,
];

const ALLOWED: Record<SiteVisitStatus, readonly SiteVisitStatus[]> = {
  REQUESTED: [SiteVisitStatus.CONFIRMED, SiteVisitStatus.CANCELLED],
  // CONFIRMED → CONFIRMED is a reschedule.
  CONFIRMED: [
    SiteVisitStatus.CONFIRMED,
    SiteVisitStatus.COMPLETED,
    SiteVisitStatus.NO_SHOW,
    SiteVisitStatus.CANCELLED,
  ],
  // Outcomes can be corrected (marked no-show by mistake), but not re-opened.
  COMPLETED: [SiteVisitStatus.NO_SHOW],
  NO_SHOW: [SiteVisitStatus.COMPLETED],
  CANCELLED: [],
};

export function canTransitionSiteVisit(from: SiteVisitStatus, to: SiteVisitStatus): boolean {
  return ALLOWED[from].includes(to);
}

export type SiteVisitScope = 'requested' | 'upcoming' | 'past';

export interface SiteVisitDto {
  id: string;
  status: SiteVisitStatus;
  /** Exact slot (ISO). Null while a request has no confirmed time. */
  scheduledAt: string | null;
  /** The buyer's own words, e.g. "Saturday morning". */
  requestedSlot: string | null;
  notes: string | null;
  lead: { id: string; name: string; phone: string; status: LeadStatus };
  property: { id: string; title: string; locality: string | null; city: string } | null;
  /** Membership of the team member showing the property. */
  assignedTo: { id: string; name: string } | null;
  conversationId: string | null;
  reminderSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSiteVisitRequest {
  leadId: string;
  scheduledAt: string;
  propertyId?: string;
  assignedToId?: string;
  notes?: string;
  /** Tell the buyer on WhatsApp (default true; only possible inside WhatsApp's 24-hour window). */
  notifyBuyer?: boolean;
}

export interface UpdateSiteVisitRequest {
  status?: SiteVisitStatus;
  scheduledAt?: string;
  propertyId?: string | null;
  assignedToId?: string | null;
  notes?: string | null;
  notifyBuyer?: boolean;
}

/** What happened when we tried to tell the buyer about a change. */
export interface BuyerNotification {
  sent: boolean;
  /** Why it was not sent, in plain words. */
  reason: string | null;
}

export interface SiteVisitResultDto {
  visit: SiteVisitDto;
  /** Null when no message was needed (e.g. marking a visit completed). */
  notification: BuyerNotification | null;
}
