/**
 * Domain enums shared by the API and the web app.
 * These mirror the PostgreSQL enums in prisma/schema.prisma; an API unit test fails if they drift.
 */
export const TenantStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  PENDING: 'PENDING',
} as const;
export type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus];

export const UserStatus = { ACTIVE: 'ACTIVE', INVITED: 'INVITED', DISABLED: 'DISABLED' } as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const BusinessType = {
  BROKERAGE: 'BROKERAGE',
  REAL_ESTATE_AGENCY: 'REAL_ESTATE_AGENCY',
  BUILDER: 'BUILDER',
  DEVELOPER: 'DEVELOPER',
} as const;
export type BusinessType = (typeof BusinessType)[keyof typeof BusinessType];

export const MembershipRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SALES_AGENT: 'SALES_AGENT',
  VIEWER: 'VIEWER',
} as const;
export type MembershipRole = (typeof MembershipRole)[keyof typeof MembershipRole];

export const MembershipStatus = {
  ACTIVE: 'ACTIVE',
  INVITED: 'INVITED',
  SUSPENDED: 'SUSPENDED',
} as const;
export type MembershipStatus = (typeof MembershipStatus)[keyof typeof MembershipStatus];

/** Conversation languages supported by the (future) AI employee. */
export const PreferredLanguage = { EN: 'en', HI: 'hi', HINGLISH: 'hinglish' } as const;
export type PreferredLanguage = (typeof PreferredLanguage)[keyof typeof PreferredLanguage];

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  BROKERAGE: 'Brokerage',
  REAL_ESTATE_AGENCY: 'Real estate agency',
  BUILDER: 'Builder',
  DEVELOPER: 'Property developer',
};

export const ROLE_LABELS: Record<MembershipRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SALES_AGENT: 'Sales agent',
  VIEWER: 'Viewer',
};

export const LANGUAGE_LABELS: Record<PreferredLanguage, string> = {
  en: 'English',
  hi: 'Hindi',
  hinglish: 'Hinglish',
};

// ---------------------------------------------------------------------------
// Phase 2A — inventory and leads (mirror the PostgreSQL enums)
// ---------------------------------------------------------------------------
export const PropertyType = {
  APARTMENT: 'APARTMENT',
  INDEPENDENT_HOUSE: 'INDEPENDENT_HOUSE',
  VILLA: 'VILLA',
  BUILDER_FLOOR: 'BUILDER_FLOOR',
  PLOT: 'PLOT',
  COMMERCIAL_OFFICE: 'COMMERCIAL_OFFICE',
  COMMERCIAL_SHOP: 'COMMERCIAL_SHOP',
  OTHER: 'OTHER',
} as const;
export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType];

export const ListingType = { SALE: 'SALE', RENT: 'RENT' } as const;
export type ListingType = (typeof ListingType)[keyof typeof ListingType];

export const PropertyStatus = {
  AVAILABLE: 'AVAILABLE',
  ON_HOLD: 'ON_HOLD',
  SOLD: 'SOLD',
  RENTED: 'RENTED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type PropertyStatus = (typeof PropertyStatus)[keyof typeof PropertyStatus];

export const PossessionStatus = {
  READY_TO_MOVE: 'READY_TO_MOVE',
  UNDER_CONSTRUCTION: 'UNDER_CONSTRUCTION',
} as const;
export type PossessionStatus = (typeof PossessionStatus)[keyof typeof PossessionStatus];

export const LeadSource = {
  WHATSAPP: 'WHATSAPP',
  WEBSITE: 'WEBSITE',
  PHONE_CALL: 'PHONE_CALL',
  PORTAL: 'PORTAL',
  SOCIAL_MEDIA: 'SOCIAL_MEDIA',
  REFERRAL: 'REFERRAL',
  WALK_IN: 'WALK_IN',
  MANUAL: 'MANUAL',
  OTHER: 'OTHER',
} as const;
export type LeadSource = (typeof LeadSource)[keyof typeof LeadSource];

export const LeadStatus = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  SITE_VISIT_SCHEDULED: 'SITE_VISIT_SCHEDULED',
  NEGOTIATION: 'NEGOTIATION',
  WON: 'WON',
  LOST: 'LOST',
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const LeadTemperature = {
  UNSCORED: 'UNSCORED',
  COLD: 'COLD',
  WARM: 'WARM',
  HOT: 'HOT',
} as const;
export type LeadTemperature = (typeof LeadTemperature)[keyof typeof LeadTemperature];

export const LeadPurpose = { SELF_USE: 'SELF_USE', INVESTMENT: 'INVESTMENT' } as const;
export type LeadPurpose = (typeof LeadPurpose)[keyof typeof LeadPurpose];

export const PurchaseTimeline = {
  IMMEDIATE: 'IMMEDIATE',
  ONE_TO_THREE_MONTHS: 'ONE_TO_THREE_MONTHS',
  THREE_TO_SIX_MONTHS: 'THREE_TO_SIX_MONTHS',
  SIX_PLUS_MONTHS: 'SIX_PLUS_MONTHS',
  JUST_BROWSING: 'JUST_BROWSING',
} as const;
export type PurchaseTimeline = (typeof PurchaseTimeline)[keyof typeof PurchaseTimeline];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: 'Apartment',
  INDEPENDENT_HOUSE: 'Independent house',
  VILLA: 'Villa',
  BUILDER_FLOOR: 'Builder floor',
  PLOT: 'Plot',
  COMMERCIAL_OFFICE: 'Commercial office',
  COMMERCIAL_SHOP: 'Commercial shop',
  OTHER: 'Other',
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  SITE_VISIT_SCHEDULED: 'Site visit scheduled',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
};

export const LEAD_TEMPERATURE_LABELS: Record<LeadTemperature, string> = {
  UNSCORED: 'Not scored',
  COLD: 'Cold',
  WARM: 'Warm',
  HOT: 'Hot',
};

export const ConversationChannel = {
  WEB_TEST: 'WEB_TEST',
  WHATSAPP: 'WHATSAPP',
  VOICE: 'VOICE',
} as const;
export type ConversationChannel = (typeof ConversationChannel)[keyof typeof ConversationChannel];

export const ConversationStatus = { OPEN: 'OPEN', CLOSED: 'CLOSED' } as const;
export type ConversationStatus = (typeof ConversationStatus)[keyof typeof ConversationStatus];

export const MessageRole = { BUYER: 'BUYER', AI: 'AI', AGENT: 'AGENT', SYSTEM: 'SYSTEM' } as const;
export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  AVAILABLE: 'Available',
  ON_HOLD: 'On hold',
  SOLD: 'Sold',
  RENTED: 'Rented',
  ARCHIVED: 'Archived',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  WHATSAPP: 'WhatsApp',
  WEBSITE: 'Website',
  PHONE_CALL: 'Phone call',
  PORTAL: 'Property portal',
  SOCIAL_MEDIA: 'Social media',
  REFERRAL: 'Referral',
  WALK_IN: 'Walk-in',
  MANUAL: 'Added manually',
  OTHER: 'Other',
};

export const PURCHASE_TIMELINE_LABELS: Record<PurchaseTimeline, string> = {
  IMMEDIATE: 'Immediately',
  ONE_TO_THREE_MONTHS: '1–3 months',
  THREE_TO_SIX_MONTHS: '3–6 months',
  SIX_PLUS_MONTHS: '6+ months',
  JUST_BROWSING: 'Just browsing',
};

export const CONVERSATION_CHANNEL_LABELS: Record<ConversationChannel, string> = {
  WEB_TEST: 'Test chat',
  WHATSAPP: 'WhatsApp',
  VOICE: 'Voice call',
};
