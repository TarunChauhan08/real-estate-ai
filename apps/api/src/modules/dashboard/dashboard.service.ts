import { Injectable } from '@nestjs/common';
import { type DashboardOverview, type MetricValue, type SetupStep } from '@rea/shared-types';
import { Errors } from '../../common/errors/app.exception';
import { PrismaService } from '../../database/prisma.service';
import {
  LeadStatus,
  LeadTemperature,
  MembershipStatus,
  PropertyStatus,
  SiteVisitStatus,
  TenantStatus,
} from '../../generated/prisma/enums';
import { type TenantContext } from '../auth/auth-context';

const notAvailable = (reason: string): MetricValue => ({ status: 'not_available', reason });
const available = (value: number): MetricValue => ({ status: 'available', value });

/**
 * Dashboard overview built only from real data. Metrics owned by modules that do not
 * exist yet (calls) are reported as not available — never as invented numbers.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(ctx: TenantContext): Promise<DashboardOverview> {
    const now = new Date();
    const tenantId = ctx.tenantId;
    const [
      tenant,
      activeMembers,
      pendingInvitations,
      totalInvitations,
      totalLeads,
      qualifiedLeads,
      activeProperties,
      conversations,
      aiReplies,
      upcomingVisits,
      whatsappConnected,
    ] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { id: true, name: true, slug: true, status: true },
      }),
      this.prisma.membership.count({
        where: { tenantId: ctx.tenantId, status: MembershipStatus.ACTIVE },
      }),
      this.prisma.invitation.count({
        where: {
          tenantId: ctx.tenantId,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
      }),
      this.prisma.invitation.count({ where: { tenantId: ctx.tenantId } }),
      this.prisma.lead.count({ where: { tenantId } }),
      this.prisma.lead.count({
        where: {
          tenantId,
          OR: [
            {
              status: {
                in: [
                  LeadStatus.QUALIFIED,
                  LeadStatus.SITE_VISIT_SCHEDULED,
                  LeadStatus.NEGOTIATION,
                  LeadStatus.WON,
                ],
              },
            },
            { temperature: LeadTemperature.HOT },
          ],
        },
      }),
      this.prisma.property.count({ where: { tenantId, status: { not: PropertyStatus.ARCHIVED } } }),
      this.prisma.conversation.count({ where: { tenantId } }),
      this.prisma.message.count({ where: { tenantId, role: 'AI' } }),
      // Open requests plus confirmed visits that have not happened yet.
      this.prisma.siteVisit.count({
        where: {
          tenantId,
          OR: [
            { status: SiteVisitStatus.REQUESTED },
            { status: SiteVisitStatus.CONFIRMED, scheduledAt: { gte: now } },
          ],
        },
      }),
      this.prisma.whatsAppAccount.count({ where: { tenantId } }).then((n) => n > 0),
    ]);
    if (!tenant) throw Errors.notFound('Business');

    const steps: SetupStep[] = [
      {
        key: 'account_created',
        label: 'Create your business account',
        completed: true,
        available: true,
      },
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
      {
        key: 'properties',
        label: 'Add your property inventory',
        completed: activeProperties > 0,
        available: true,
      },
      {
        key: 'ai_employee',
        label: 'Test your AI employee in a chat',
        completed: aiReplies > 0,
        available: true,
      },
      {
        key: 'whatsapp',
        label: 'Connect your WhatsApp Business number',
        completed: whatsappConnected,
        available: true,
      },
    ];

    return {
      tenant,
      metrics: {
        totalLeads: available(totalLeads),
        qualifiedLeads: available(qualifiedLeads),
        siteVisits: available(upcomingVisits),
        conversations: available(conversations),
        aiCalls: notAvailable('AI voice is not yet available'),
        teamMembers: available(activeMembers),
        pendingInvitations: available(pendingInvitations),
      },
      aiEmployee: { status: 'not_configured' },
      setup: { steps, completed: steps.filter((s) => s.completed).length, total: steps.length },
    };
  }
}
