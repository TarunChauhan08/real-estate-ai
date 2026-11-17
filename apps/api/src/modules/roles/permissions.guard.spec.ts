import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type MembershipRole, Permission } from '@rea/shared-types';
import { type AuthContext } from '../auth/auth-context';
import { PermissionsGuard } from './permissions.guard';

function contextFor(auth: AuthContext | undefined, required?: Permission[]): ExecutionContext {
  const handler = () => undefined;
  if (required) Reflect.defineMetadata('requiredPermissions', required, handler);
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ auth }) }),
  } as unknown as ExecutionContext;
}

const asRole = (role: MembershipRole): AuthContext => ({ userId: 'u', familyId: 'f', tenant: { tenantId: 't', membershipId: 'm', role } });

describe('PermissionsGuard', () => {
  const guard = new PermissionsGuard(new Reflector());

  it('allows routes without permission metadata', () => {
    expect(guard.canActivate(contextFor(asRole('VIEWER')))).toBe(true);
  });

  it('rejects users without an active tenant', () => {
    const auth: AuthContext = { userId: 'u', familyId: 'f', tenant: null };
    expect(() => guard.canActivate(contextFor(auth, [Permission.TENANT_READ]))).toThrow(/No active business/);
  });

  it.each([
    ['OWNER', Permission.TENANT_UPDATE, true],
    ['ADMIN', Permission.MEMBERS_MANAGE, true],
    ['MANAGER', Permission.SETTINGS_UPDATE, true],
    ['MANAGER', Permission.TENANT_UPDATE, false],
    ['MANAGER', Permission.AUDIT_READ, false],
    ['SALES_AGENT', Permission.MEMBERS_INVITE, false],
    ['SALES_AGENT', Permission.DASHBOARD_READ, true],
    ['VIEWER', Permission.SETTINGS_UPDATE, false],
    ['VIEWER', Permission.TENANT_READ, true],
  ] as const)('%s → %s = %s', (role, permission, allowed) => {
    const ctx = contextFor(asRole(role), [permission]);
    if (allowed) expect(guard.canActivate(ctx)).toBe(true);
    else expect(() => guard.canActivate(ctx)).toThrow(/permission/);
  });
});
