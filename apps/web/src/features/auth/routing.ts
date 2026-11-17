import { hasPermission, Permission, type SessionResponse, TenantStatus } from '@rea/shared-types';

/** Where to send a user after signing in. */
export function homeFor(session: SessionResponse): string {
  const tenant = session.activeTenant;
  if (tenant?.status === TenantStatus.PENDING && hasPermission(tenant.role, Permission.TENANT_UPDATE)) {
    return '/onboarding';
  }
  return '/dashboard';
}

/** Accepts only same-site relative paths, preventing open redirects via `?next=`. */
export function safeNext(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return null;
  return next;
}
