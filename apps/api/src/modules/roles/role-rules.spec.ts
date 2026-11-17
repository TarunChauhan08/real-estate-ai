import { canAssignRole, canManageRole, invitableRoles } from '@rea/shared-types';

describe('role hierarchy rules', () => {
  it('owners can manage and assign every role', () => {
    expect(canManageRole('OWNER', 'OWNER')).toBe(true);
    expect(canAssignRole('OWNER', 'OWNER')).toBe(true);
  });

  it('admins cannot touch owners or other admins, nor grant admin', () => {
    expect(canManageRole('ADMIN', 'OWNER')).toBe(false);
    expect(canManageRole('ADMIN', 'ADMIN')).toBe(false);
    expect(canAssignRole('ADMIN', 'ADMIN')).toBe(false);
    expect(canAssignRole('ADMIN', 'MANAGER')).toBe(true);
  });

  it('managers can only manage sales agents and viewers', () => {
    expect(canManageRole('MANAGER', 'MANAGER')).toBe(false);
    expect(canManageRole('MANAGER', 'SALES_AGENT')).toBe(true);
    expect(invitableRoles('MANAGER')).toEqual(['SALES_AGENT', 'VIEWER']);
  });

  it('nobody can invite a new owner', () => {
    expect(invitableRoles('OWNER')).not.toContain('OWNER');
    expect(invitableRoles('OWNER')).toEqual(['ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER']);
  });
});
