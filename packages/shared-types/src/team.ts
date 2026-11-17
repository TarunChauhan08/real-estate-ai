import { type MembershipRole, type MembershipStatus } from './enums';

export interface MemberDto {
  /** Membership ID — used in member management routes. */
  id: string;
  userId: string;
  name: string;
  email: string;
  role: MembershipRole;
  status: MembershipStatus;
  joinedAt: string;
  isCurrentUser: boolean;
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface InvitationDto {
  id: string;
  email: string;
  role: MembershipRole;
  status: InvitationStatus;
  invitedBy: { id: string; name: string } | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/**
 * How the invitation reached (or did not reach) the invitee. Phase 1 has no email provider,
 * so delivery is always `not_sent`. In non-production environments configured with
 * INVITATION_DELIVERY=dev_link, the accept link is returned once so it can be shared manually.
 */
export interface InvitationDelivery {
  /** `sent` = emailed to the invitee; `not_sent` = share the link yourself (reason says why). */
  status: 'sent' | 'not_sent';
  reason: string | null;
  devAcceptUrl?: string;
}

export interface CreateInvitationResponse {
  invitation: InvitationDto;
  delivery: InvitationDelivery;
}

export interface InvitationPreview {
  tenantName: string;
  email: string;
  role: MembershipRole;
  expiresAt: string;
  /** Whether the invitee already has an account (sign in) or needs to create one. */
  accountExists: boolean;
}
