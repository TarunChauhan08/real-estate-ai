import { type BusinessType, type PreferredLanguage, type TenantStatus } from './enums';

export interface TenantDto {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessProfileDto {
  businessType: BusinessType;
  phone: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  country: string;
  updatedAt: string;
}

export interface TenantSettingsDto {
  timezone: string;
  locale: string;
  currency: string;
  preferredLanguage: PreferredLanguage;
  updatedAt: string;
}

export const SUPPORTED_LOCALES = ['en-IN', 'hi-IN'] as const;
export const SUPPORTED_CURRENCIES = ['INR'] as const;

/** A metric whose source module is not built yet is reported as unavailable, never as a made-up number. */
export type MetricValue =
  { status: 'available'; value: number } | { status: 'not_available'; reason: string };

export interface SetupStep {
  key:
    | 'account_created'
    | 'business_profile'
    | 'team_invited'
    | 'ai_employee'
    | 'properties'
    | 'whatsapp';
  label: string;
  completed: boolean;
  /** False for steps that belong to modules not yet released. */
  available: boolean;
}

export interface DashboardOverview {
  tenant: Pick<TenantDto, 'id' | 'name' | 'slug' | 'status'>;
  metrics: {
    totalLeads: MetricValue;
    qualifiedLeads: MetricValue;
    siteVisits: MetricValue;
    conversations: MetricValue;
    aiCalls: MetricValue;
    teamMembers: MetricValue;
    pendingInvitations: MetricValue;
  };
  aiEmployee: { status: 'not_configured' };
  setup: { steps: SetupStep[]; completed: number; total: number };
}

export interface AuditLogDto {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  actor: { id: string; name: string; email: string } | null;
  createdAt: string;
}

/** One day of AI activity (dates are in India Standard Time). */
export interface AiUsageDay {
  /** YYYY-MM-DD */
  date: string;
  replies: number;
  inputTokens: number;
  outputTokens: number;
}

/** How much the AI employee worked over a period, for the business and for capacity planning. */
export interface AiUsageSummary {
  days: number;
  /** ISO timestamp of the start of the period. */
  from: string;
  replies: number;
  failedReplies: number;
  inputTokens: number;
  outputTokens: number;
  /** Average model response time; null when there were no replies. */
  averageLatencyMs: number | null;
  handoffs: number;
  siteVisitRequests: number;
  /** Replies by the language the AI answered in, e.g. { hinglish: 40, en: 12 }. */
  languages: Record<string, number>;
  /** One entry per day in the period, oldest first, including days with no activity. */
  daily: AiUsageDay[];
}
