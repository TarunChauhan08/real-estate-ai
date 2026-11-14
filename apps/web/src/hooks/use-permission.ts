'use client';

import { hasPermission, type MembershipRole, type Permission } from '@rea/shared-types';
import { useAuth } from '@/features/auth/auth-provider';

/**
 * UI-only permission check, used to hide or disable controls the user cannot use.
 * The API enforces every permission independently; this is never a security boundary.
 */
export function usePermission(permission: Permission): boolean {
  const role = useAuth().session?.activeTenant?.role;
  return role ? hasPermission(role, permission) : false;
}

export function useRole(): MembershipRole | null {
  return useAuth().session?.activeTenant?.role ?? null;
}
