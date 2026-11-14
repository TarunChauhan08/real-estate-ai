import { AuditService } from './audit.service';
import { AuditAction } from './audit-actions';

describe('AuditService', () => {
  it('strips secret-looking metadata keys before writing', async () => {
    const create = jest.fn().mockResolvedValue({});
    const service = new AuditService({ auditLog: { create } } as never);

    await service.record({
      tenantId: 't1',
      actorId: 'u1',
      action: AuditAction.AUTH_LOGIN,
      entityType: 'user',
      entityId: 'u1',
      metadata: {
        email: 'a@b.com',
        password: 'x',
        refreshToken: 'y',
        tokenHash: 'z',
        userAgent: 'ua',
      },
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ metadata: { email: 'a@b.com', userAgent: 'ua' } }),
    });
  });
});
