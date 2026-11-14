import { type MembershipRole } from '../../generated/prisma/enums';

/** Claims carried by a signed access token. */
export interface AccessTokenClaims {
  /** User ID. */
  sub: string;
  /** Refresh-session family the token was issued from. */
  fam: string;
  /** Active tenant ID, or null when the user has no active membership. */
  tid: string | null;
  /** Active membership ID, or null. */
  mid: string | null;
}

/** Tenant context derived on every request from the user's *current* membership row. */
export interface TenantContext {
  tenantId: string;
  membershipId: string;
  role: MembershipRole;
}

/**
 * The authenticated principal attached to `req.auth` by JwtAuthGuard.
 * `tenant` is resolved from the database (never from client input) and is null
 * when the user currently has no active membership.
 */
export interface AuthContext {
  userId: string;
  familyId: string;
  tenant: TenantContext | null;
}
