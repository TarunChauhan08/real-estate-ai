import { Injectable, Logger } from '@nestjs/common';
import { type BusinessDataExport, type TenantDto } from '@rea/shared-types';
import { Errors } from '../../common/errors/app.exception';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../database/prisma.service';
import { MembershipRole } from '../../generated/prisma/enums';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-actions';
import { type TenantContext } from '../auth/auth-context';
import { PasswordService } from '../auth/password.service';

const DAY_MS = 24 * 60 * 60 * 1000;
/** The export includes the most recent audit entries; older ones stay available on request. */
const EXPORT_AUDIT_LIMIT = 5000;

/** JSON-safe copy: BigInt prices become numbers, dates become ISO strings. */
function plain<T>(value: T): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(value, (_key, v: unknown) => (typeof v === 'bigint' ? Number(v) : v)),
  ) as Record<string, unknown>;
}

/**
 * A business's rights over its own data (the Terms and Privacy Policy promise both):
 *
 * - **Export**: everything the business stored, as one JSON document, by the owner.
 * - **Deletion**: the owner schedules it (password + typed business name). WhatsApp is
 *   disconnected at once so the AI stops replying to buyers; after the grace period
 *   (TENANT_DELETION_GRACE_DAYS) the purge job removes every row for the business, and the
 *   accounts of members who belong to no other business. The owner can cancel until then.
 */
@Injectable()
export class BusinessDataService {
  private readonly logger = new Logger(BusinessDataService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly passwords: PasswordService,
    private readonly config: AppConfigService,
  ) {}

  private requireOwner(ctx: TenantContext): void {
    if (ctx.role !== MembershipRole.OWNER)
      throw Errors.forbidden('Only an owner can export or delete the business’s data.');
  }

  async export(ctx: TenantContext, actorId: string): Promise<BusinessDataExport> {
    this.requireOwner(ctx);
    const where = { tenantId: ctx.tenantId };
    const [tenant, members, properties, leads, conversations, siteVisits, auditLog] =
      await Promise.all([
        this.prisma.tenant.findUniqueOrThrow({
          where: { id: ctx.tenantId },
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            createdAt: true,
            businessProfile: true,
            settings: true,
            whatsAppAccount: {
              // The access token is a credential, never exported.
              select: { displayPhoneNumber: true, phoneNumberId: true, createdAt: true },
            },
          },
        }),
        this.prisma.membership.findMany({
          where,
          select: {
            role: true,
            status: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.property.findMany({ where, orderBy: { createdAt: 'asc' } }),
        this.prisma.lead.findMany({ where, orderBy: { createdAt: 'asc' } }),
        this.prisma.conversation.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                role: true,
                content: true,
                deliveryStatus: true,
                createdAt: true,
              },
            },
          },
        }),
        this.prisma.siteVisit.findMany({ where, orderBy: { createdAt: 'asc' } }),
        this.prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: EXPORT_AUDIT_LIMIT,
          select: {
            action: true,
            entityType: true,
            entityId: true,
            metadata: true,
            createdAt: true,
            actor: { select: { email: true } },
          },
        }),
      ]);

    await this.audit.record({
      tenantId: ctx.tenantId,
      actorId,
      action: AuditAction.TENANT_DATA_EXPORTED,
      entityType: 'tenant',
      entityId: ctx.tenantId,
      metadata: {
        properties: properties.length,
        leads: leads.length,
        conversations: conversations.length,
      },
    });

    return {
      format: 'rea-business-export/1',
      exportedAt: new Date().toISOString(),
      business: plain(tenant),
      members: members.map((m) =>
        plain({ ...m.user, role: m.role, status: m.status, joinedAt: m.createdAt }),
      ),
      properties: properties.map(plain),
      leads: leads.map(plain),
      conversations: conversations.map(plain),
      siteVisits: siteVisits.map(plain),
      auditLog: auditLog.map(plain),
    };
  }

  async requestDeletion(
    ctx: TenantContext,
    userId: string,
    password: string,
    confirmBusinessName: string,
    now = new Date(),
  ): Promise<Pick<TenantDto, 'deletionScheduledFor'>> {
    this.requireOwner(ctx);
    const [user, tenant] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } }),
      this.prisma.tenant.findUniqueOrThrow({
        where: { id: ctx.tenantId },
        select: { name: true, deletionScheduledAt: true },
      }),
    ]);
    if (!(await this.passwords.verify(user.passwordHash, password)))
      throw Errors.validation([{ field: 'password', message: 'Password is incorrect' }]);
    if (confirmBusinessName.trim() !== tenant.name)
      throw Errors.validation([
        { field: 'confirmBusinessName', message: `Type the business name exactly: ${tenant.name}` },
      ]);
    if (tenant.deletionScheduledAt)
      throw Errors.conflict('DELETION_ALREADY_SCHEDULED', 'Deletion is already scheduled.');

    const scheduledAt = new Date(
      now.getTime() + this.config.get('TENANT_DELETION_GRACE_DAYS') * DAY_MS,
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: ctx.tenantId },
        data: { deletionScheduledAt: scheduledAt, deletionRequestedById: userId },
      });
      // Stop the AI answering buyers right away; reconnecting is possible after cancelling.
      const disconnected = await tx.whatsAppAccount.deleteMany({
        where: { tenantId: ctx.tenantId },
      });
      await tx.invitation.deleteMany({ where: { tenantId: ctx.tenantId, acceptedAt: null } });
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId: userId,
          action: AuditAction.TENANT_DELETION_REQUESTED,
          entityType: 'tenant',
          entityId: ctx.tenantId,
          metadata: {
            scheduledFor: scheduledAt.toISOString(),
            whatsappDisconnected: disconnected.count > 0,
          },
        },
        tx,
      );
    });
    return { deletionScheduledFor: scheduledAt.toISOString() };
  }

  async cancelDeletion(ctx: TenantContext, userId: string): Promise<void> {
    this.requireOwner(ctx);
    const updated = await this.prisma.tenant.updateMany({
      where: { id: ctx.tenantId, deletionScheduledAt: { not: null } },
      data: { deletionScheduledAt: null, deletionRequestedById: null },
    });
    if (updated.count === 0)
      throw Errors.conflict('DELETION_NOT_SCHEDULED', 'Deletion is not scheduled.');
    await this.audit.record({
      tenantId: ctx.tenantId,
      actorId: userId,
      action: AuditAction.TENANT_DELETION_CANCELLED,
      entityType: 'tenant',
      entityId: ctx.tenantId,
    });
  }

  /** Permanently deletes every business whose deletion date has passed. Returns how many. */
  async purgeDue(now = new Date()): Promise<number> {
    const due = await this.prisma.tenant.findMany({
      where: { deletionScheduledAt: { lte: now } },
      select: { id: true },
      take: 20,
    });
    let purged = 0;
    for (const { id } of due) {
      try {
        if (await this.purge(id, now)) purged += 1;
      } catch (error) {
        this.logger.error(`Purge of business ${id} failed: ${(error as Error).message}`);
      }
    }
    return purged;
  }

  /**
   * Removes the business and everything that belongs to it, child tables first (foreign keys
   * are RESTRICT on purpose, so nothing disappears by accident). Members' user accounts are
   * removed too, unless they still belong to another business.
   */
  private async purge(tenantId: string, now: Date): Promise<boolean> {
    return this.prisma.$transaction(
      async (tx) => {
        // Re-check inside the transaction: the owner may have cancelled a moment ago.
        const tenant = await tx.tenant.findFirst({
          where: { id: tenantId, deletionScheduledAt: { lte: now } },
          select: { id: true },
        });
        if (!tenant) return false;
        const memberUserIds = (
          await tx.membership.findMany({ where: { tenantId }, select: { userId: true } })
        ).map((m) => m.userId);
        const where = { tenantId };

        await tx.siteVisit.deleteMany({ where });
        await tx.message.deleteMany({ where });
        await tx.conversation.deleteMany({ where });
        await tx.lead.deleteMany({ where });
        await tx.property.deleteMany({ where });
        await tx.whatsAppAccount.deleteMany({ where });
        await tx.invitation.deleteMany({ where });
        await tx.refreshSession.deleteMany({ where });
        await tx.auditLog.deleteMany({ where });
        await tx.tenantSettings.deleteMany({ where });
        await tx.businessProfile.deleteMany({ where });
        await tx.membership.deleteMany({ where });
        await tx.tenant.delete({ where: { id: tenantId } });

        const orphans = (
          await tx.user.findMany({
            where: { id: { in: memberUserIds }, memberships: { none: {} } },
            select: { id: true },
          })
        ).map((u) => u.id);
        if (orphans.length > 0) {
          await tx.refreshSession.deleteMany({ where: { userId: { in: orphans } } });
          await tx.user.deleteMany({ where: { id: { in: orphans } } });
        }
        // No business data in the log line: the point is that it is gone.
        this.logger.log(`Purged business ${tenantId} and ${orphans.length} user account(s)`);
        return true;
      },
      { timeout: 60_000 },
    );
  }
}
