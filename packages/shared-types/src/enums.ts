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
