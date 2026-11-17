import { type MembershipRole, type TenantStatus } from './enums';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  /** False until the user follows the link in the verification email. */
  emailVerified: boolean;
}

export interface SendVerificationResponse {
  alreadyVerified: boolean;
}

export interface ActiveTenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  membershipId: string;
  role: MembershipRole;
}

/** Returned by register, login, refresh, switch-tenant and invitation acceptance. */
export interface SessionResponse {
  /** Short-lived JWT. Send as `Authorization: Bearer <token>`; keep in memory only. */
  accessToken: string;
  /** Lifetime of the access token in seconds. */
  expiresIn: number;
  user: UserSummary;
  activeTenant: ActiveTenant | null;
}

export interface MembershipSummary {
  membershipId: string;
  role: MembershipRole;
  tenant: { id: string; name: string; slug: string; status: TenantStatus };
}

export interface MeResponse {
  user: UserSummary;
  activeTenant: ActiveTenant | null;
  memberships: MembershipSummary[];
}
