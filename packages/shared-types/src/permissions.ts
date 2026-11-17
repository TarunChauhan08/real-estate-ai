import { MembershipRole } from './enums';

/**
 * Permission catalogue. Permissions are `resource:action` strings so future modules
 * (properties, leads, conversations, calls, appointments…) can register their own
 * without touching existing ones.
 */
export const Permission = {
  TENANT_READ: 'tenant:read',
  TENANT_UPDATE: 'tenant:update',
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
  MEMBERS_READ: 'members:read',
  MEMBERS_INVITE: 'members:invite',
  MEMBERS_MANAGE: 'members:manage',
  AUDIT_READ: 'audit:read',
  DASHBOARD_READ: 'dashboard:read',
  PROPERTIES_READ: 'properties:read',
  PROPERTIES_WRITE: 'properties:write',
  LEADS_READ: 'leads:read',
  LEADS_WRITE: 'leads:write',
  /** Assign a lead to a team member (or take it off them). */
  LEADS_ASSIGN: 'leads:assign',
  CONVERSATIONS_READ: 'conversations:read',
  /** Start test chats, send messages, switch the AI on or off for a conversation. */
  CONVERSATIONS_WRITE: 'conversations:write',
  /** Connect or disconnect messaging channels (WhatsApp). Owners and admins only. */
  CHANNELS_MANAGE: 'channels:manage',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

const ALL = Object.values(Permission);

/**
 * Role → permission matrix. This is the single source of truth used by the API guards
 * and (for display only) by the web app. The backend always enforces it.
 */
export const ROLE_PERMISSIONS: Record<MembershipRole, readonly Permission[]> = {
  OWNER: ALL,
  ADMIN: ALL,
  MANAGER: [
    Permission.TENANT_READ,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_UPDATE,
    Permission.MEMBERS_READ,
    Permission.MEMBERS_INVITE,
    Permission.MEMBERS_MANAGE,
    Permission.DASHBOARD_READ,
    Permission.PROPERTIES_READ,
    Permission.PROPERTIES_WRITE,
    Permission.LEADS_READ,
    Permission.LEADS_WRITE,
    Permission.LEADS_ASSIGN,
    Permission.CONVERSATIONS_READ,
    Permission.CONVERSATIONS_WRITE,
  ],
  SALES_AGENT: [
    Permission.TENANT_READ,
    Permission.SETTINGS_READ,
    Permission.MEMBERS_READ,
    Permission.DASHBOARD_READ,
    Permission.PROPERTIES_READ,
    Permission.LEADS_READ,
    Permission.LEADS_WRITE,
    Permission.CONVERSATIONS_READ,
    Permission.CONVERSATIONS_WRITE,
  ],
  VIEWER: [
    Permission.TENANT_READ,
    Permission.SETTINGS_READ,
    Permission.MEMBERS_READ,
    Permission.DASHBOARD_READ,
    Permission.PROPERTIES_READ,
    Permission.LEADS_READ,
    Permission.CONVERSATIONS_READ,
  ],
};

/**
 * Seniority used for team-management rules. A member may only act on members ranked
 * strictly below them and may only grant roles ranked strictly below their own —
 * except OWNER, who may manage other owners and grant OWNER (subject to the
 * last-owner protection enforced by the API).
 */
export const ROLE_RANK: Record<MembershipRole, number> = {
  OWNER: 50,
  ADMIN: 40,
  MANAGER: 30,
  SALES_AGENT: 20,
  VIEWER: 10,
};

export function hasPermission(role: MembershipRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Can `actor` change the role/status of a member who currently holds `target`? */
export function canManageRole(actor: MembershipRole, target: MembershipRole): boolean {
  if (actor === MembershipRole.OWNER) return true;
  return ROLE_RANK[actor] > ROLE_RANK[target];
}

/** Can `actor` grant `role` (via invitation or role change)? */
export function canAssignRole(actor: MembershipRole, role: MembershipRole): boolean {
  if (actor === MembershipRole.OWNER) return true;
  return ROLE_RANK[actor] > ROLE_RANK[role];
}

/** Roles `actor` may hand out when inviting. Ownership is never granted through an invitation. */
export function invitableRoles(actor: MembershipRole): MembershipRole[] {
  return (Object.keys(ROLE_RANK) as MembershipRole[]).filter(
    (role) => role !== MembershipRole.OWNER && canAssignRole(actor, role),
  );
}
