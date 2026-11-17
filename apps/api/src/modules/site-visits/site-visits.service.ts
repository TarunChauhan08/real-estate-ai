import { Injectable, Logger } from '@nestjs/common';
import {
  type BuyerNotification,
  canTransitionSiteVisit,
  type SiteVisitDto,
  type SiteVisitResultDto,
} from '@rea/shared-types';
import { Errors } from '../../common/errors/app.exception';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor';
import { PrismaService } from '../../database/prisma.service';
import { type Prisma } from '../../generated/prisma/client';
import {
  ConversationChannel,
  LeadStatus,
  MembershipStatus,
  MessageDeliveryStatus,
  MessageRole,
  PropertyStatus,
  SiteVisitStatus,
} from '../../generated/prisma/enums';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-actions';
import { type TenantContext } from '../auth/auth-context';
import { isInsideReplyWindow } from '../whatsapp/reply-window';
import { WhatsAppDeliveryService } from '../whatsapp/whatsapp-delivery.service';
import {
  type CreateSiteVisitDto,
  type SiteVisitQueryDto,
  type UpdateSiteVisitDto,
} from './dto/site-visit.dto';
import { buildVisitMessage, type VisitMessageKind } from './visit-messages';

const visitInclude = {
  lead: { select: { id: true, name: true, phone: true, status: true } },
  property: { select: { id: true, title: true, locality: true, city: true } },
  assignedTo: { select: { id: true, user: { select: { name: true } } } },
} satisfies Prisma.SiteVisitInclude;
type VisitRow = Prisma.SiteVisitGetPayload<{ include: typeof visitInclude }>;

/** A confirmed visit stays "upcoming" until this long after its start time. */
const UPCOMING_GRACE_MS = 2 * 60 * 60 * 1000;
/** Slots may be booked a little in the past (clock drift, "starting now") but not further. */
const PAST_SLACK_MS = 5 * 60 * 1000;
const MAX_AHEAD_MS = 366 * 24 * 60 * 60 * 1000;
/** Lead stages a confirmed visit may move forward to SITE_VISIT_SCHEDULED. */
const EARLY_LEAD_STAGES: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
];

export interface AiVisitRequest {
  tenantId: string;
  leadId: string;
  conversationId: string;
  preference: string | null;
  propertyId: string | null;
}

/**
 * Site visits: the AI records requests, the team confirms exact slots, and the buyer hears about
 * every confirmation, change and cancellation on WhatsApp — when WhatsApp allows it.
 */
@Injectable()
export class SiteVisitsService {
  private readonly logger = new Logger(SiteVisitsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly whatsapp: WhatsAppDeliveryService,
  ) {}

  async list(ctx: TenantContext, query: SiteVisitQueryDto): Promise<Paginated<SiteVisitDto>> {
    const now = Date.now();
    const graceStart = new Date(now - UPCOMING_GRACE_MS);
    let where: Prisma.SiteVisitWhereInput = { tenantId: ctx.tenantId, leadId: query.leadId };
    let orderBy: Prisma.SiteVisitOrderByWithRelationInput[] = [
      { scheduledAt: { sort: 'desc', nulls: 'first' } },
      { createdAt: 'desc' },
    ];
    if (query.scope === 'requested') {
      where = { ...where, status: SiteVisitStatus.REQUESTED };
      orderBy = [{ createdAt: 'asc' }];
    } else if (query.scope === 'upcoming') {
      where = { ...where, status: SiteVisitStatus.CONFIRMED, scheduledAt: { gte: graceStart } };
      orderBy = [{ scheduledAt: 'asc' }];
    } else if (query.scope === 'past') {
      where = {
        ...where,
        OR: [
          {
            status: {
              in: [SiteVisitStatus.COMPLETED, SiteVisitStatus.NO_SHOW, SiteVisitStatus.CANCELLED],
            },
          },
          // Confirmed but the slot has passed: the team still needs to record the outcome.
          { status: SiteVisitStatus.CONFIRMED, scheduledAt: { lt: graceStart } },
        ],
      };
      orderBy = [{ scheduledAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }];
    }
    const [rows, total] = await Promise.all([
      this.prisma.siteVisit.findMany({
        where,
        include: visitInclude,
        orderBy,
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.siteVisit.count({ where }),
    ]);
    return Paginated.of(rows.map(toDto), total, query.page, query.pageSize);
  }

  async get(ctx: TenantContext, id: string): Promise<SiteVisitDto> {
    const row = await this.prisma.siteVisit.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: visitInclude,
    });
    if (!row) throw Errors.notFound('Site visit');
    return toDto(row);
  }

  /** The team books a visit directly at an exact time (CONFIRMED). */
  async create(
    ctx: TenantContext,
    actorId: string,
    dto: CreateSiteVisitDto,
  ): Promise<SiteVisitResultDto> {
    const scheduledAt = parseSlot(dto.scheduledAt);
    const id = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findFirst({
        where: { id: dto.leadId, tenantId: ctx.tenantId },
        select: { id: true, status: true },
      });
      if (!lead)
        throw Errors.validation([{ field: 'leadId', message: 'Choose one of your leads' }]);
      await this.assertProperty(tx, ctx.tenantId, dto.propertyId ?? null);
      await this.assertMember(tx, ctx.tenantId, dto.assignedToId ?? null);

      const visit = await tx.siteVisit.create({
        data: {
          tenantId: ctx.tenantId,
          leadId: lead.id,
          propertyId: dto.propertyId ?? null,
          assignedToId: dto.assignedToId ?? null,
          notes: dto.notes || null,
          status: SiteVisitStatus.CONFIRMED,
          scheduledAt,
          createdById: actorId,
        },
      });
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: AuditAction.SITE_VISIT_BOOKED,
          entityType: 'site_visit',
          entityId: visit.id,
          metadata: { leadId: lead.id, scheduledAt: scheduledAt.toISOString() },
        },
        tx,
      );
      await this.advanceLead(tx, ctx.tenantId, actorId, lead);
      return visit.id;
    });

    const notification =
      dto.notifyBuyer === false
        ? null
        : await this.notifyBuyer(ctx.tenantId, actorId, id, 'confirmed');
    return { visit: await this.get(ctx, id), notification };
  }

  /** Confirm, reschedule, change details, cancel, or record the outcome. */
  async update(
    ctx: TenantContext,
    actorId: string,
    id: string,
    dto: UpdateSiteVisitDto,
  ): Promise<SiteVisitResultDto> {
    const event = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.siteVisit.findFirst({
        where: { id, tenantId: ctx.tenantId },
        include: { lead: { select: { id: true, status: true } } },
      });
      if (!existing) throw Errors.notFound('Site visit');

      const nextStatus = dto.status ?? existing.status;
      if (nextStatus !== existing.status && !canTransitionSiteVisit(existing.status, nextStatus)) {
        throw Errors.conflict(
          'INVALID_SITE_VISIT_TRANSITION',
          `A ${existing.status.toLowerCase().replace('_', '-')} visit cannot become ${nextStatus.toLowerCase().replace('_', '-')}.`,
        );
      }
      const newSlot = dto.scheduledAt !== undefined ? parseSlot(dto.scheduledAt) : undefined;
      const scheduledAt = newSlot ?? existing.scheduledAt;
      if (nextStatus === SiteVisitStatus.CONFIRMED && !scheduledAt) {
        throw Errors.validation([
          { field: 'scheduledAt', message: 'Pick a date and time to confirm' },
        ]);
      }
      const closed: SiteVisitStatus[] = [
        SiteVisitStatus.CANCELLED,
        SiteVisitStatus.COMPLETED,
        SiteVisitStatus.NO_SHOW,
      ];
      if (newSlot && closed.includes(nextStatus)) {
        throw Errors.conflict(
          'SITE_VISIT_CLOSED',
          'This visit is closed. Book a new visit instead.',
        );
      }
      if (dto.propertyId !== undefined) await this.assertProperty(tx, ctx.tenantId, dto.propertyId);
      if (dto.assignedToId !== undefined)
        await this.assertMember(tx, ctx.tenantId, dto.assignedToId);

      const slotChanged =
        newSlot !== undefined && existing.scheduledAt?.getTime() !== newSlot.getTime();
      const data: Prisma.SiteVisitUncheckedUpdateInput = {};
      if (nextStatus !== existing.status) data.status = nextStatus;
      if (slotChanged) {
        data.scheduledAt = newSlot;
        data.reminderSentAt = null; // a new time deserves a new reminder
      }
      if (dto.propertyId !== undefined && dto.propertyId !== existing.propertyId)
        data.propertyId = dto.propertyId;
      if (dto.assignedToId !== undefined && dto.assignedToId !== existing.assignedToId)
        data.assignedToId = dto.assignedToId;
      if (dto.notes !== undefined && (dto.notes || null) !== existing.notes)
        data.notes = dto.notes || null;
      if (Object.keys(data).length === 0) return null;

      await tx.siteVisit.update({ where: { id: existing.id }, data });
      const statusChanged = data.status !== undefined;
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: statusChanged
            ? AuditAction.SITE_VISIT_STATUS_CHANGED
            : AuditAction.SITE_VISIT_UPDATED,
          entityType: 'site_visit',
          entityId: existing.id,
          metadata: {
            ...(statusChanged ? { from: existing.status, to: nextStatus } : {}),
            fields: Object.keys(data).filter((key) => key !== 'reminderSentAt'),
          },
        },
        tx,
      );
      if (nextStatus === SiteVisitStatus.CONFIRMED) {
        await this.advanceLead(tx, ctx.tenantId, actorId, existing.lead);
      }

      // Which buyer message (if any) this change calls for.
      let kind: VisitMessageKind | null = null;
      if (existing.status === SiteVisitStatus.REQUESTED && nextStatus === SiteVisitStatus.CONFIRMED)
        kind = 'confirmed';
      else if (nextStatus === SiteVisitStatus.CONFIRMED && slotChanged) kind = 'rescheduled';
      else if (
        nextStatus === SiteVisitStatus.CANCELLED &&
        existing.status === SiteVisitStatus.CONFIRMED
      )
        kind = 'cancelled';
      return kind;
    });

    const notification =
      event && dto.notifyBuyer !== false
        ? await this.notifyBuyer(ctx.tenantId, actorId, id, event)
        : null;
    return { visit: await this.get(ctx, id), notification };
  }

  /**
   * Called inside the AI turn's transaction when the buyer asks to visit. Creates one REQUESTED
   * visit per lead (or updates its preferred slot); never touches a visit the team already confirmed.
   */
  async recordAiRequest(
    tx: Prisma.TransactionClient,
    input: AiVisitRequest,
  ): Promise<string | null> {
    const open = await tx.siteVisit.findFirst({
      where: {
        tenantId: input.tenantId,
        leadId: input.leadId,
        OR: [
          { status: SiteVisitStatus.REQUESTED },
          { status: SiteVisitStatus.CONFIRMED, scheduledAt: { gte: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (open) {
      if (open.status !== SiteVisitStatus.REQUESTED) return open.id;
      const data: Prisma.SiteVisitUncheckedUpdateInput = {};
      if (input.preference && input.preference !== open.requestedSlot)
        data.requestedSlot = input.preference;
      if (!open.propertyId && input.propertyId) data.propertyId = input.propertyId;
      if (Object.keys(data).length > 0) await tx.siteVisit.update({ where: { id: open.id }, data });
      return open.id;
    }
    const visit = await tx.siteVisit.create({
      data: {
        tenantId: input.tenantId,
        leadId: input.leadId,
        conversationId: input.conversationId,
        propertyId: input.propertyId,
        requestedSlot: input.preference,
        status: SiteVisitStatus.REQUESTED,
      },
    });
    await this.audit.record(
      {
        tenantId: input.tenantId,
        actorId: null,
        action: AuditAction.SITE_VISIT_REQUESTED,
        entityType: 'site_visit',
        entityId: visit.id,
        metadata: { by: 'ai_employee', leadId: input.leadId, conversationId: input.conversationId },
      },
      tx,
    );
    return visit.id;
  }

  /**
   * Tells the buyer on WhatsApp. Returns why not when it cannot: no WhatsApp chat with this buyer,
   * WhatsApp's 24-hour window has closed, or delivery failed. Never throws.
   */
  async notifyBuyer(
    tenantId: string,
    actorId: string | null,
    visitId: string,
    kind: VisitMessageKind,
  ): Promise<BuyerNotification> {
    try {
      const visit = await this.prisma.siteVisit.findFirstOrThrow({
        where: { id: visitId, tenantId },
        include: {
          lead: { select: { id: true, preferredLanguage: true } },
          property: { select: { title: true, locality: true, city: true } },
          assignedTo: { select: { user: { select: { name: true } } } },
          tenant: {
            select: {
              name: true,
              settings: { select: { timezone: true, preferredLanguage: true } },
            },
          },
        },
      });
      const conversation = await this.prisma.conversation.findFirst({
        where: { tenantId, leadId: visit.leadId, channel: ConversationChannel.WHATSAPP },
        orderBy: { lastBuyerMessageAt: { sort: 'desc', nulls: 'last' } },
      });
      if (!conversation) {
        return {
          sent: false,
          reason: 'This buyer has not messaged you on WhatsApp, so call them to let them know.',
        };
      }
      if (!isInsideReplyWindow(conversation.lastBuyerMessageAt)) {
        return {
          sent: false,
          reason:
            'More than 24 hours since the buyer last wrote on WhatsApp, so WhatsApp does not allow a free message. Call them to let them know.',
        };
      }

      const content = buildVisitMessage({
        kind,
        language: visit.lead.preferredLanguage ?? visit.tenant.settings?.preferredLanguage ?? 'en',
        scheduledAt: visit.scheduledAt,
        timeZone: visit.tenant.settings?.timezone ?? 'Asia/Kolkata',
        businessName: visit.tenant.name,
        propertyTitle: visit.property?.title ?? null,
        place: visit.property
          ? [visit.property.locality, visit.property.city].filter(Boolean).join(', ')
          : null,
        agentName: visit.assignedTo?.user.name ?? null,
      });
      const message = await this.prisma.$transaction(async (tx) => {
        const created = await tx.message.create({
          data: {
            tenantId,
            conversationId: conversation.id,
            // Sent on behalf of the AI employee, so the AI knows about it in later turns.
            role: MessageRole.AI,
            content,
            deliveryStatus: MessageDeliveryStatus.PENDING,
            metadata: { kind: 'site_visit', event: kind, siteVisitId: visit.id },
          },
        });
        await tx.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: created.createdAt },
        });
        return created;
      });
      const delivered = await this.whatsapp.deliver(tenantId, message.id);
      await this.audit.recordSafely({
        tenantId,
        actorId,
        action: AuditAction.SITE_VISIT_BUYER_NOTIFIED,
        entityType: 'site_visit',
        entityId: visit.id,
        metadata: {
          event: kind,
          delivered: delivered.deliveryStatus !== MessageDeliveryStatus.FAILED,
        },
      });
      return delivered.deliveryStatus === MessageDeliveryStatus.FAILED
        ? {
            sent: false,
            reason: delivered.deliveryError ?? 'WhatsApp could not deliver the message.',
          }
        : { sent: true, reason: null };
    } catch (error) {
      this.logger.error(
        `Could not notify the buyer about visit ${visitId}: ${(error as Error).message}`,
      );
      return { sent: false, reason: 'Something went wrong while messaging the buyer.' };
    }
  }

  private async advanceLead(
    tx: Prisma.TransactionClient,
    tenantId: string,
    actorId: string | null,
    lead: { id: string; status: LeadStatus },
  ): Promise<void> {
    if (!EARLY_LEAD_STAGES.includes(lead.status)) return;
    await tx.lead.update({
      where: { id: lead.id },
      data: { status: LeadStatus.SITE_VISIT_SCHEDULED },
    });
    await this.audit.record(
      {
        tenantId,
        actorId,
        action: AuditAction.LEAD_STATUS_CHANGED,
        entityType: 'lead',
        entityId: lead.id,
        metadata: { by: 'site_visit', from: lead.status, to: LeadStatus.SITE_VISIT_SCHEDULED },
      },
      tx,
    );
  }

  private async assertProperty(
    tx: Prisma.TransactionClient,
    tenantId: string,
    propertyId: string | null,
  ): Promise<void> {
    if (!propertyId) return;
    const property = await tx.property.findFirst({
      where: { id: propertyId, tenantId, status: { not: PropertyStatus.ARCHIVED } },
      select: { id: true },
    });
    if (!property)
      throw Errors.validation([
        { field: 'propertyId', message: 'Choose one of your active listings' },
      ]);
  }

  private async assertMember(
    tx: Prisma.TransactionClient,
    tenantId: string,
    membershipId: string | null,
  ): Promise<void> {
    if (!membershipId) return;
    const member = await tx.membership.findFirst({
      where: { id: membershipId, tenantId, status: MembershipStatus.ACTIVE },
      select: { id: true },
    });
    if (!member)
      throw Errors.validation([
        { field: 'assignedToId', message: 'Choose an active member of your team' },
      ]);
  }
}

function parseSlot(value: string): Date {
  const date = new Date(value);
  const now = Date.now();
  if (Number.isNaN(date.getTime()) || date.getTime() < now - PAST_SLACK_MS) {
    throw Errors.validation([{ field: 'scheduledAt', message: 'Pick a time in the future' }]);
  }
  if (date.getTime() > now + MAX_AHEAD_MS) {
    throw Errors.validation([
      { field: 'scheduledAt', message: 'Pick a time within the next year' },
    ]);
  }
  return date;
}

function toDto(row: VisitRow): SiteVisitDto {
  return {
    id: row.id,
    status: row.status,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    requestedSlot: row.requestedSlot,
    notes: row.notes,
    lead: row.lead,
    property: row.property,
    assignedTo: row.assignedTo ? { id: row.assignedTo.id, name: row.assignedTo.user.name } : null,
    conversationId: row.conversationId,
    reminderSentAt: row.reminderSentAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
