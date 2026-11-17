import { Injectable } from '@nestjs/common';
import { type DashboardOverview, type MetricValue, type SetupStep } from '@rea/shared-types';
import { Errors } from '../../common/errors/app.exception';
import { PrismaService } from '../../database/prisma.service';
import { MembershipStatus, TenantStatus } from '../../generated/prisma/enums';
import { type TenantContext } from '../auth/auth-context';

const notAvailable = (reason: string): MetricValue => ({ status: 'not_available', reason });
const available = (value: number): MetricValue => ({ status: 'available', value });

/**
 * Dashboard overview built only from real data. Metrics owned by modules that do not
 * exist yet (leads, conversations, calls, site visits) are reported as not available —
 * never as invented numbers.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(ctx: TenantContext): Promise<DashboardOverview> {
    const now = new Date();
    const [tenant, activeMembers, pendingInvitations, totalInvitations] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { id: true, name: true, slug: true, status: true },
      }),
      this.prisma.membership.count({ where: { tenantId: ctx.tenantId, status: MembershipStatus.ACTIVE } }),
      this.prisma.invitation.count({
        where: { tenantId: ctx.tenantId, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
      }),
      this.prisma.invitation.count({ where: { tenantId: ctx.tenantId } }),
    ]);
    if (!tenant) throw Errors.notFound('Business');

    const steps: SetupStep[] = [
      { key: 'account_created', label: 'Create your business account', completed: true, available: true },
      {
        key: 'business_profile',
        label: 'Complete your business profile',
        completed: tenant.status === TenantStatus.ACTIVE,
        available: true,
      },
      {
        key: 'team_invited',
        label: 'Invite your sales team',
        completed: activeMembers > 1 || totalInvitations > 0,
        available: true,
      },
      { key: 'properties', label: 'Add your property inventory', completed: false, available: false },
      { key: 'ai_employee', label: 'Configure your AI employee', completed: false, available: false },
    ];

    return {
      tenant,
      metrics: {
        totalLeads: notAvailable('Lead management is not yet available'),
        qualifiedLeads: notAvailable('Lead management is not yet available'),
        siteVisits: notAvailable('Site visit management is not yet available'),
        conversations: notAvailable('AI chat is not yet available'),
        aiCalls: notAvailable('AI voice is not yet available'),
        teamMembers: available(activeMembers),
        pendingInvitations: available(pendingInvitations),
      },
      aiEmployee: { status: 'not_configured' },
      setup: { steps, completed: steps.filter((s) => s.completed).length, total: steps.length },
    };
  }
}
