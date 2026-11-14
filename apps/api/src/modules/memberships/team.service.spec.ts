import { AppException } from '../../common/errors/app.exception';
import { TeamService } from './team.service';

/**
 * The last-owner rule is defence in depth: through the API an owner can only act on *other*
 * owners, so another active owner normally exists. This test exercises the guard directly.
 */
describe('TeamService last-owner protection', () => {
  function serviceWith(target: { role: string; status: string }, otherActiveOwners: number) {
    const row = {
      id: 'target',
      userId: 'target-user',
      role: target.role,
      status: target.status,
      createdAt: new Date(),
      user: { name: 'T', email: 't@example.com' },
    };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      membership: {
        findFirst: jest.fn().mockResolvedValue(row),
        count: jest.fn().mockResolvedValue(otherActiveOwners),
        update: jest.fn().mockResolvedValue({ ...row, role: 'ADMIN', status: 'SUSPENDED' }),
      },
    };
    const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
    const audit = { record: jest.fn() };
    return { service: new TeamService(prisma as never, audit as never), tx };
  }

  const ctx = { tenantId: 't', membershipId: 'actor-m', role: 'OWNER' as const };

  it('refuses to demote the last active owner', async () => {
    const { service, tx } = serviceWith({ role: 'OWNER', status: 'ACTIVE' }, 0);
    await expect(service.changeRole(ctx, 'actor', 'target', 'ADMIN')).rejects.toMatchObject({
      code: 'LAST_OWNER',
    });
    expect(tx.membership.update).not.toHaveBeenCalled();
  });

  it('refuses to suspend the last active owner', async () => {
    const { service } = serviceWith({ role: 'OWNER', status: 'ACTIVE' }, 0);
    const error = await service
      .changeStatus(ctx, 'actor', 'target', 'SUSPENDED')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).getStatus()).toBe(409);
  });

  it('allows demoting an owner when another active owner remains', async () => {
    const { service, tx } = serviceWith({ role: 'OWNER', status: 'ACTIVE' }, 1);
    await service.changeRole(ctx, 'actor', 'target', 'ADMIN');
    expect(tx.membership.update).toHaveBeenCalled();
  });
});
