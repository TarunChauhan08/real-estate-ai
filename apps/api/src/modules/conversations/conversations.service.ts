import { Injectable, Logger } from '@nestjs/common';
import {
  type ConversationDto,
  type ConversationSummaryDto,
  type ConversationTurnDto,
  type MessageDto,
  WHATSAPP_REPLY_WINDOW_HOURS,
} from '@rea/shared-types';
import { Errors } from '../../common/errors/app.exception';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import {
  ConversationChannel,
  ConversationStatus,
  LeadSource,
  MessageDeliveryStatus,
  MessageRole,
  PropertyStatus,
  TenantStatus,
} from '../../generated/prisma/enums';
import { LLMError, type LLMMessage } from '../ai/llm/llm-provider';
import { type PromptProperty } from '../ai/sales-agent/prompt';
import { SalesAgentService } from '../ai/sales-agent/sales-agent.service';
import { AuditService } from '../audit/audit.service';
import { SiteVisitsService } from '../site-visits/site-visits.service';
import { AuditAction } from '../audit/audit-actions';
import { type TenantContext } from '../auth/auth-context';
import { isInsideReplyWindow, REPLY_WINDOW_MS } from '../whatsapp/reply-window';
import { WhatsAppDeliveryService } from '../whatsapp/whatsapp-delivery.service';
import { type ConversationQueryDto } from './dto/conversation-query.dto';
import { type SendMessageDto } from './dto/send-message.dto';
import { type StartConversationDto } from './dto/start-conversation.dto';
import { type UpdateConversationDto } from './dto/update-conversation.dto';
import { type LeadSnapshot, PLACEHOLDER_LEAD_NAME, planLeadUpdate } from './lead-update';

const MAX_MESSAGES_RETURNED = 200;
const MAX_CANDIDATE_PROPERTIES = 6;

const summaryInclude = {
  lead: { select: { id: true, name: true, phone: true, status: true, temperature: true } },
  messages: { orderBy: { createdAt: 'desc' }, take: 1 },
} satisfies Prisma.ConversationInclude;
type SummaryRow = Prisma.ConversationGetPayload<{ include: typeof summaryInclude }>;
type MessageRow = Prisma.MessageGetPayload<object>;
type LeadRow = Prisma.LeadGetPayload<object>;
type ConversationRow = Prisma.ConversationGetPayload<object>;

/** A buyer message that arrived on WhatsApp, already parsed from Meta's webhook. */
export interface InboundWhatsAppMessage {
  tenantId: string;
  from: string;
  profileName: string | null;
  externalId: string;
  content: string;
}

export interface InboundResult {
  conversationId: string;
  messageId: string;
  /** False when Meta re-sent a message we already stored. */
  isNew: boolean;
}

interface AiTurnResult {
  aiMessage: MessageRow | null;
  handoffRequested: boolean;
  aiError: string | null;
}

/**
 * Conversations between buyers and the business: the AI employee, plus humans when they step in.
 *
 * A buyer turn is processed in three steps so a slow or failing AI never loses data:
 *   1. save the buyer's message (own transaction),
 *   2. ask the AI (outside any transaction — it can take seconds),
 *   3. save the AI reply, lead updates and audit entries together (one transaction).
 */
@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly agent: SalesAgentService,
    private readonly config: AppConfigService,
    private readonly whatsapp: WhatsAppDeliveryService,
    private readonly siteVisits: SiteVisitsService,
  ) {}

  async list(
    ctx: TenantContext,
    query: ConversationQueryDto,
  ): Promise<Paginated<ConversationSummaryDto>> {
    const where: Prisma.ConversationWhereInput = {
      tenantId: ctx.tenantId,
      leadId: query.leadId,
      status: query.status,
      channel: query.channel,
    };
    const [rows, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: summaryInclude,
        orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.conversation.count({ where }),
    ]);
    return Paginated.of(rows.map(toSummaryDto), total, query.page, query.pageSize);
  }

  async get(ctx: TenantContext, id: string): Promise<ConversationDto> {
    const row = await this.prisma.conversation.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: summaryInclude,
    });
    if (!row) throw Errors.notFound('Conversation');
    const messages = await this.prisma.message.findMany({
      where: { conversationId: row.id, tenantId: ctx.tenantId },
      orderBy: { createdAt: 'desc' },
      take: MAX_MESSAGES_RETURNED,
    });
    return { ...toSummaryDto(row), messages: messages.reverse().map(toMessageDto) };
  }

  async start(
    ctx: TenantContext,
    actorId: string,
    dto: StartConversationDto,
  ): Promise<ConversationDto> {
    const id = await this.prisma.$transaction(async (tx) => {
      let lead: { id: string } | null;
      if (dto.leadId) {
        lead = await tx.lead.findFirst({
          where: { id: dto.leadId, tenantId: ctx.tenantId },
          select: { id: true },
        });
        if (!lead) throw Errors.notFound('Lead');
      } else {
        const phone = dto.phone!;
        lead = await tx.lead.findUnique({
          where: { tenantId_phone: { tenantId: ctx.tenantId, phone } },
          select: { id: true },
        });
        if (!lead) {
          lead = await tx.lead.create({
            data: {
              tenantId: ctx.tenantId,
              createdById: actorId,
              name: dto.name ?? PLACEHOLDER_LEAD_NAME,
              phone,
              source: LeadSource.WEBSITE,
            },
            select: { id: true },
          });
          await this.audit.record(
            {
              tenantId: ctx.tenantId,
              actorId,
              action: AuditAction.LEAD_CREATED,
              entityType: 'lead',
              entityId: lead.id,
              metadata: { source: LeadSource.WEBSITE, via: 'test_chat' },
            },
            tx,
          );
        }
      }
      const conversation = await tx.conversation.create({
        data: {
          tenantId: ctx.tenantId,
          leadId: lead.id,
          channel: ConversationChannel.WEB_TEST,
          createdById: actorId,
        },
        select: { id: true },
      });
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: AuditAction.CONVERSATION_STARTED,
          entityType: 'conversation',
          entityId: conversation.id,
          metadata: { channel: ConversationChannel.WEB_TEST, leadId: lead.id },
        },
        tx,
      );
      return conversation.id;
    });
    return this.get(ctx, id);
  }

  async update(
    ctx: TenantContext,
    actorId: string,
    id: string,
    dto: UpdateConversationDto,
  ): Promise<ConversationDto> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.conversation.findFirst({ where: { id, tenantId: ctx.tenantId } });
      if (!existing) throw Errors.notFound('Conversation');
      const data: Prisma.ConversationUpdateInput = {};
      if (dto.aiEnabled !== undefined && dto.aiEnabled !== existing.aiEnabled)
        data.aiEnabled = dto.aiEnabled;
      if (dto.status !== undefined && dto.status !== existing.status) data.status = dto.status;
      if (Object.keys(data).length === 0) return;
      await tx.conversation.update({ where: { id: existing.id }, data });
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: AuditAction.CONVERSATION_UPDATED,
          entityType: 'conversation',
          entityId: existing.id,
          metadata: { ...data },
        },
        tx,
      );
    });
    return this.get(ctx, id);
  }

  async sendMessage(
    ctx: TenantContext,
    actorId: string,
    id: string,
    dto: SendMessageDto,
  ): Promise<ConversationTurnDto> {
    const role = dto.as === 'AGENT' ? MessageRole.AGENT : MessageRole.BUYER;

    // 1. Save the incoming message.
    const { conversation, message } = await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findFirst({
        where: { id, tenantId: ctx.tenantId },
      });
      if (!conversation) throw Errors.notFound('Conversation');
      if (conversation.status === ConversationStatus.CLOSED) {
        throw Errors.conflict(
          'CONVERSATION_CLOSED',
          'This conversation is closed. Re-open it to continue.',
        );
      }
      if (role === MessageRole.BUYER && conversation.channel !== ConversationChannel.WEB_TEST) {
        throw Errors.badRequest(
          'BUYER_MESSAGES_TEST_ONLY',
          'Buyer messages can only be simulated in test chats.',
        );
      }
      const onWhatsApp = conversation.channel === ConversationChannel.WHATSAPP;
      if (onWhatsApp && !isInsideReplyWindow(conversation.lastBuyerMessageAt)) {
        throw Errors.conflict(
          'WHATSAPP_WINDOW_CLOSED',
          `WhatsApp only allows free replies within ${WHATSAPP_REPLY_WINDOW_HOURS} hours of the buyer's last message. Wait for the buyer to write again.`,
        );
      }
      const message = await tx.message.create({
        data: {
          tenantId: ctx.tenantId,
          conversationId: conversation.id,
          role,
          content: dto.content,
          deliveryStatus: onWhatsApp ? MessageDeliveryStatus.PENDING : null,
        },
      });
      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: message.createdAt,
          lastBuyerMessageAt: role === MessageRole.BUYER ? message.createdAt : undefined,
        },
      });
      return { conversation, message };
    });

    // A team member's reply on WhatsApp goes straight to the buyer.
    if (conversation.channel === ConversationChannel.WHATSAPP) {
      const delivered = await this.whatsapp.deliver(ctx.tenantId, message.id);
      return {
        buyerMessage: toMessageDto(delivered),
        aiMessage: null,
        handoffRequested: false,
        aiError: null,
      };
    }

    const turn: ConversationTurnDto = {
      buyerMessage: toMessageDto(message),
      aiMessage: null,
      handoffRequested: false,
      aiError: null,
    };
    if (role !== MessageRole.BUYER || !conversation.aiEnabled) return turn;

    const result = await this.runAiTurn(ctx.tenantId, conversation);
    return {
      ...turn,
      aiMessage: result.aiMessage ? toMessageDto(result.aiMessage) : null,
      handoffRequested: result.handoffRequested,
      aiError: result.aiError,
    };
  }

  /**
   * Stores a buyer's WhatsApp message: finds or creates the lead (by phone) and their WhatsApp
   * conversation (re-opening it if it was closed). Returns null if the business is suspended.
   * Meta retries webhooks, so a message ID we already have is reported as `isNew: false`.
   */
  async receiveWhatsApp(input: InboundWhatsAppMessage): Promise<InboundResult | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: input.tenantId },
      select: { status: true },
    });
    if (!tenant || tenant.status === TenantStatus.SUSPENDED) return null;

    const duplicate = await this.prisma.message.findUnique({
      where: { tenantId_externalId: { tenantId: input.tenantId, externalId: input.externalId } },
      select: { id: true, conversationId: true },
    });
    if (duplicate)
      return { conversationId: duplicate.conversationId, messageId: duplicate.id, isNew: false };

    try {
      return await this.prisma.$transaction(async (tx) => {
        const lead = await this.findOrCreateWhatsAppLead(tx, input);
        const conversation = await this.findOrOpenWhatsAppConversation(tx, input.tenantId, lead.id);
        const message = await tx.message.create({
          data: {
            tenantId: input.tenantId,
            conversationId: conversation.id,
            role: MessageRole.BUYER,
            content: input.content,
            externalId: input.externalId,
            // Arrival time (ms precision) rather than WhatsApp's whole-second timestamp, so a
            // burst of messages keeps its order.
          },
        });
        await tx.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: message.createdAt, lastBuyerMessageAt: message.createdAt },
        });
        await tx.lead.update({
          where: { id: lead.id },
          data: { lastContactedAt: message.createdAt },
        });
        return { conversationId: conversation.id, messageId: message.id, isNew: true };
      });
    } catch (error) {
      // Two deliveries of the same webhook raced each other; the other one stored it.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.message.findUnique({
          where: {
            tenantId_externalId: { tenantId: input.tenantId, externalId: input.externalId },
          },
          select: { id: true, conversationId: true },
        });
        if (existing)
          return { conversationId: existing.conversationId, messageId: existing.id, isNew: false };
      }
      throw error;
    }
  }

  /**
   * Lets the AI answer a WhatsApp buyer and sends the reply. Skipped when the AI is paused, the
   * conversation is closed, or a newer buyer message arrived (that one will be answered instead,
   * with everything the buyer said in view).
   */
  async replyOnWhatsApp(
    tenantId: string,
    conversationId: string,
    buyerMessageId: string,
  ): Promise<{ replied: boolean; aiError: string | null }> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId, channel: ConversationChannel.WHATSAPP },
    });
    if (!conversation?.aiEnabled || conversation.status !== ConversationStatus.OPEN)
      return { replied: false, aiError: null };

    const latestBuyer = await this.prisma.message.findFirst({
      where: { conversationId, tenantId, role: MessageRole.BUYER },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });
    if (latestBuyer?.id !== buyerMessageId) return { replied: false, aiError: null };

    const result = await this.runAiTurn(tenantId, conversation, { pending: true });
    if (!result.aiMessage) return { replied: false, aiError: result.aiError };
    await this.whatsapp.deliver(tenantId, result.aiMessage.id);
    return { replied: true, aiError: null };
  }

  /**
   * One AI turn, in two steps so a slow or failing AI never loses data:
   *   1. ask the AI (outside any transaction — it can take seconds),
   *   2. save the AI reply, lead updates and audit entries together (one transaction).
   */
  private async runAiTurn(
    tenantId: string,
    conversation: ConversationRow,
    options: { pending?: boolean } = {},
  ): Promise<AiTurnResult> {
    const context = await this.loadAgentContext(tenantId, conversation.id, conversation.leadId);
    let result;
    try {
      result = await this.agent.respond(context.input);
    } catch (error) {
      const reason = error instanceof LLMError ? error.message : 'Unexpected AI error';
      this.logger.error(`AI turn failed for conversation ${conversation.id}: ${reason}`);
      return {
        aiMessage: null,
        handoffRequested: false,
        aiError: 'The AI could not reply just now. Your message was saved — try again shortly.',
      };
    }

    const aiMessage = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findFirst({
        where: { id: conversation.leadId, tenantId },
      });
      if (!lead) throw Errors.notFound('Lead');
      const patch = planLeadUpdate(toSnapshot(lead), result);
      const now = new Date();
      await tx.lead.update({
        where: { id: lead.id },
        data: { ...toPrismaPatch(patch), lastContactedAt: now },
      });

      const changedFields = Object.keys(patch).filter((key) => key !== 'status');
      if (changedFields.length > 0) {
        await this.audit.record(
          {
            tenantId,
            actorId: null,
            action: AuditAction.LEAD_UPDATED,
            entityType: 'lead',
            entityId: lead.id,
            metadata: { by: 'ai_employee', conversationId: conversation.id, fields: changedFields },
          },
          tx,
        );
      }
      if (patch.status) {
        await this.audit.record(
          {
            tenantId,
            actorId: null,
            action: AuditAction.LEAD_STATUS_CHANGED,
            entityType: 'lead',
            entityId: lead.id,
            metadata: { by: 'ai_employee', from: lead.status, to: patch.status },
          },
          tx,
        );
      }

      // The buyer asked to visit: put it in the team's queue to confirm a slot.
      const siteVisitId = result.siteVisitRequested
        ? await this.siteVisits.recordAiRequest(tx, {
            tenantId,
            leadId: lead.id,
            conversationId: conversation.id,
            preference: result.siteVisitPreference,
            propertyId: result.suggestedPropertyIds[0] ?? null,
          })
        : null;

      const ai = await tx.message.create({
        data: {
          tenantId,
          conversationId: conversation.id,
          role: MessageRole.AI,
          content: result.reply,
          deliveryStatus: options.pending ? MessageDeliveryStatus.PENDING : null,
          model: result.model.slice(0, 80),
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          latencyMs: result.latencyMs,
          metadata: {
            provider: result.provider,
            promptVersion: result.promptVersion,
            language: result.language,
            temperature: result.temperature,
            qualified: result.qualified,
            suggestedPropertyIds: result.suggestedPropertyIds,
            candidatePropertyIds: context.input.properties.map((p) => p.id),
            siteVisitRequested: result.siteVisitRequested,
            siteVisitPreference: result.siteVisitPreference,
            siteVisitId,
            handoff: result.handoff,
            leadFieldsUpdated: Object.keys(patch),
          },
        },
      });

      let lastMessageAt = ai.createdAt;
      if (result.handoff.requested) {
        const system = await tx.message.create({
          data: {
            tenantId,
            conversationId: conversation.id,
            role: MessageRole.SYSTEM,
            content: `AI paused and handed over to the team${result.handoff.reason ? `: ${result.handoff.reason}` : ''}.`,
          },
        });
        lastMessageAt = system.createdAt;
        await this.audit.record(
          {
            tenantId,
            actorId: null,
            action: AuditAction.CONVERSATION_HANDED_OFF,
            entityType: 'conversation',
            entityId: conversation.id,
            metadata: { reason: result.handoff.reason },
          },
          tx,
        );
      }
      await tx.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt, aiEnabled: result.handoff.requested ? false : undefined },
      });
      return ai;
    });

    return { aiMessage, handoffRequested: result.handoff.requested, aiError: null };
  }

  private async findOrCreateWhatsAppLead(
    tx: Prisma.TransactionClient,
    input: InboundWhatsAppMessage,
  ): Promise<{ id: string }> {
    const existing = await tx.lead.findUnique({
      where: { tenantId_phone: { tenantId: input.tenantId, phone: input.from } },
      select: { id: true, name: true },
    });
    if (existing) {
      if (existing.name === PLACEHOLDER_LEAD_NAME && input.profileName) {
        await tx.lead.update({ where: { id: existing.id }, data: { name: input.profileName } });
      }
      return existing;
    }
    const lead = await tx.lead.create({
      data: {
        tenantId: input.tenantId,
        name: input.profileName ?? PLACEHOLDER_LEAD_NAME,
        phone: input.from,
        source: LeadSource.WHATSAPP,
      },
      select: { id: true },
    });
    await this.audit.record(
      {
        tenantId: input.tenantId,
        actorId: null,
        action: AuditAction.LEAD_CREATED,
        entityType: 'lead',
        entityId: lead.id,
        metadata: { source: LeadSource.WHATSAPP, via: 'whatsapp_inbound' },
      },
      tx,
    );
    return lead;
  }

  private async findOrOpenWhatsAppConversation(
    tx: Prisma.TransactionClient,
    tenantId: string,
    leadId: string,
  ): Promise<{ id: string }> {
    // One WhatsApp thread per buyer, like the WhatsApp app itself.
    const existing = await tx.conversation.findFirst({
      where: { tenantId, leadId, channel: ConversationChannel.WHATSAPP },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true },
    });
    if (existing) {
      if (existing.status === ConversationStatus.CLOSED) {
        await tx.conversation.update({
          where: { id: existing.id },
          data: { status: ConversationStatus.OPEN },
        });
        await this.audit.record(
          {
            tenantId,
            actorId: null,
            action: AuditAction.CONVERSATION_UPDATED,
            entityType: 'conversation',
            entityId: existing.id,
            metadata: { status: ConversationStatus.OPEN, by: 'buyer_message' },
          },
          tx,
        );
      }
      return existing;
    }
    const conversation = await tx.conversation.create({
      data: { tenantId, leadId, channel: ConversationChannel.WHATSAPP },
      select: { id: true },
    });
    await this.audit.record(
      {
        tenantId,
        actorId: null,
        action: AuditAction.CONVERSATION_STARTED,
        entityType: 'conversation',
        entityId: conversation.id,
        metadata: { channel: ConversationChannel.WHATSAPP, leadId },
      },
      tx,
    );
    return conversation;
  }

  /** Everything the AI needs for one turn: business, lead profile, matching inventory and recent history. */
  private async loadAgentContext(tenantId: string, conversationId: string, leadId: string) {
    const [tenant, lead, recent] = await Promise.all([
      this.prisma.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: {
          name: true,
          businessProfile: { select: { businessType: true, city: true } },
          settings: { select: { preferredLanguage: true } },
        },
      }),
      this.prisma.lead.findFirstOrThrow({ where: { id: leadId, tenantId } }),
      this.prisma.message.findMany({
        where: { conversationId, tenantId, role: { not: MessageRole.SYSTEM } },
        orderBy: { createdAt: 'desc' },
        take: this.config.get('AI_HISTORY_MESSAGES'),
      }),
    ]);
    const properties = await this.findCandidateProperties(tenantId, lead);
    const history: LLMMessage[] = recent.reverse().map((m) => ({
      role: m.role === MessageRole.BUYER ? 'user' : 'assistant',
      content: m.role === MessageRole.AGENT ? `(Team member) ${m.content}` : m.content,
    }));
    return {
      input: {
        business: {
          name: tenant.name,
          businessType: tenant.businessProfile?.businessType ?? null,
          city: tenant.businessProfile?.city ?? null,
          defaultLanguage: tenant.settings?.preferredLanguage ?? 'en',
        },
        lead: toSnapshot(lead),
        properties,
        history,
      },
    };
  }

  /**
   * Picks a few listings worth showing the AI. Starts strict (city + BHK + budget) and relaxes
   * step by step, so early in a chat the AI still knows what the business sells.
   */
  private async findCandidateProperties(
    tenantId: string,
    lead: LeadRow,
  ): Promise<PromptProperty[]> {
    const base: Prisma.PropertyWhereInput = { tenantId, status: PropertyStatus.AVAILABLE };
    const city: Prisma.PropertyWhereInput = lead.preferredCity
      ? { city: { equals: lead.preferredCity, mode: 'insensitive' } }
      : {};
    const bedrooms: Prisma.PropertyWhereInput = lead.preferredBedrooms.length
      ? { bedrooms: { in: lead.preferredBedrooms } }
      : {};
    const price: Prisma.PropertyWhereInput =
      lead.budgetMax !== null || lead.budgetMin !== null
        ? {
            price: {
              // 10% stretch above budget is normal in Indian real estate; nothing far below.
              lte: lead.budgetMax !== null ? (lead.budgetMax * 11n) / 10n : undefined,
              gte: lead.budgetMin !== null ? (lead.budgetMin * 8n) / 10n : undefined,
            },
          }
        : {};
    const attempts: Prisma.PropertyWhereInput[] = [
      { AND: [base, city, bedrooms, price] },
      { AND: [base, city, price] },
      { AND: [base, city] },
      base,
    ];
    for (const where of attempts) {
      const rows = await this.prisma.property.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: MAX_CANDIDATE_PROPERTIES,
      });
      if (rows.length > 0) {
        return rows.map((p) => ({
          id: p.id,
          title: p.title,
          projectName: p.projectName,
          propertyType: p.propertyType,
          listingType: p.listingType,
          bedrooms: p.bedrooms,
          carpetAreaSqft: p.carpetAreaSqft,
          price: Number(p.price),
          locality: p.locality,
          city: p.city,
          possessionStatus: p.possessionStatus,
          possessionDate: p.possessionDate ? p.possessionDate.toISOString().slice(0, 10) : null,
          reraNumber: p.reraNumber,
          amenities: p.amenities,
        }));
      }
    }
    return [];
  }
}

function toSnapshot(lead: LeadRow): LeadSnapshot {
  return {
    name: lead.name,
    email: lead.email,
    status: lead.status,
    temperature: lead.temperature,
    budgetMin: lead.budgetMin === null ? null : Number(lead.budgetMin),
    budgetMax: lead.budgetMax === null ? null : Number(lead.budgetMax),
    preferredCity: lead.preferredCity,
    preferredLocalities: lead.preferredLocalities,
    preferredBedrooms: lead.preferredBedrooms,
    purpose: lead.purpose,
    timeline: lead.timeline,
    needsHomeLoan: lead.needsHomeLoan,
    preferredLanguage: lead.preferredLanguage,
  };
}

function toPrismaPatch(patch: ReturnType<typeof planLeadUpdate>): Prisma.LeadUncheckedUpdateInput {
  const { budgetMin, budgetMax, ...rest } = patch;
  return {
    ...rest,
    budgetMin: budgetMin === undefined ? undefined : budgetMin === null ? null : BigInt(budgetMin),
    budgetMax: budgetMax === undefined ? undefined : budgetMax === null ? null : BigInt(budgetMax),
  };
}

function toMessageDto(row: MessageRow): MessageDto {
  const metadata = (row.metadata ?? {}) as { suggestedPropertyIds?: unknown };
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    suggestedPropertyIds: Array.isArray(metadata.suggestedPropertyIds)
      ? metadata.suggestedPropertyIds.filter((v): v is string => typeof v === 'string')
      : [],
    deliveryStatus: row.deliveryStatus,
    deliveryError: row.deliveryError,
    createdAt: row.createdAt.toISOString(),
  };
}

function toSummaryDto(row: SummaryRow): ConversationSummaryDto {
  const last = row.messages[0];
  return {
    id: row.id,
    channel: row.channel,
    status: row.status,
    aiEnabled: row.aiEnabled,
    lead: row.lead,
    lastMessage: last
      ? {
          role: last.role,
          content: last.content.slice(0, 160),
          createdAt: last.createdAt.toISOString(),
        }
      : null,
    lastMessageAt: row.lastMessageAt ? row.lastMessageAt.toISOString() : null,
    replyWindowEndsAt:
      row.channel === ConversationChannel.WHATSAPP && row.lastBuyerMessageAt
        ? new Date(row.lastBuyerMessageAt.getTime() + REPLY_WINDOW_MS).toISOString()
        : null,
    createdAt: row.createdAt.toISOString(),
  };
}
