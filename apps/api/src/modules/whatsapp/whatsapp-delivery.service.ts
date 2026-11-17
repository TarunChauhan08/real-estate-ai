import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { type Prisma } from '../../generated/prisma/client';
import { MessageDeliveryStatus } from '../../generated/prisma/enums';
import {
  splitForWhatsApp,
  WHATSAPP_CLIENT,
  type WhatsAppClient,
  WhatsAppError,
} from './client/whatsapp-client';
import { type DeliveryState, shouldApplyStatus } from './webhook/webhook-payload';
import { WhatsAppAccountsService } from './whatsapp-accounts.service';

type MessageRow = Prisma.MessageGetPayload<object>;

/**
 * Sends stored messages (AI and team replies) to the buyer on WhatsApp and keeps their
 * delivery status up to date from Meta's status webhooks.
 *
 * The message is always saved first and sent second, so a WhatsApp outage never loses a reply:
 * it is marked FAILED with a plain-language reason the team can see in the inbox.
 */
@Injectable()
export class WhatsAppDeliveryService {
  private readonly logger = new Logger(WhatsAppDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: WhatsAppAccountsService,
    @Inject(WHATSAPP_CLIENT) private readonly client: WhatsAppClient,
  ) {}

  async deliver(
    tenantId: string,
    messageId: string,
    options: { replyToExternalId?: string } = {},
  ): Promise<MessageRow> {
    const message = await this.prisma.message.findFirstOrThrow({
      where: { id: messageId, tenantId },
      include: { conversation: { include: { lead: { select: { phone: true } } } } },
    });
    const account = await this.accounts.resolveByTenant(tenantId);
    if (!account?.credentials) {
      return this.markFailed(
        message.id,
        account
          ? 'WhatsApp needs to be reconnected (the saved token can no longer be read).'
          : 'WhatsApp is not connected for this business.',
      );
    }

    try {
      const parts = splitForWhatsApp(message.content);
      let firstId: string | null = null;
      for (const [index, body] of parts.entries()) {
        const { externalId } = await this.client.sendText(account.credentials, {
          to: message.conversation.lead.phone,
          body,
          replyToExternalId: index === 0 ? options.replyToExternalId : undefined,
        });
        firstId ??= externalId;
      }
      // Status webhooks refer to this ID; the first part stands for the whole reply.
      return await this.prisma.message.update({
        where: { id: message.id },
        data: {
          externalId: firstId,
          deliveryStatus: MessageDeliveryStatus.SENT,
          deliveryError: null,
        },
      });
    } catch (error) {
      const reason =
        error instanceof WhatsAppError ? error.message : 'Unexpected error while sending.';
      this.logger.warn(`WhatsApp delivery failed for message ${message.id}: ${reason}`);
      return this.markFailed(message.id, reason);
    }
  }

  /** Blue ticks for the buyer. Never throws. */
  async markRead(tenantId: string, externalId: string): Promise<void> {
    try {
      const account = await this.accounts.resolveByTenant(tenantId);
      if (account?.credentials) await this.client.markRead(account.credentials, externalId);
    } catch (error) {
      this.logger.debug(`markRead failed: ${(error as Error).message}`);
    }
  }

  /** Applies a delivery-status webhook. Statuses only move forward; unknown IDs are ignored. */
  async applyStatus(
    tenantId: string,
    externalId: string,
    status: DeliveryState,
    error: string | null,
  ): Promise<boolean> {
    const message = await this.prisma.message.findUnique({
      where: { tenantId_externalId: { tenantId, externalId } },
      select: { id: true, deliveryStatus: true },
    });
    if (!message || !shouldApplyStatus(message.deliveryStatus, status)) return false;
    await this.prisma.message.update({
      where: { id: message.id },
      data: { deliveryStatus: status, deliveryError: status === 'FAILED' ? error : null },
    });
    return true;
  }

  private markFailed(id: string, reason: string): Promise<MessageRow> {
    return this.prisma.message.update({
      where: { id },
      data: { deliveryStatus: MessageDeliveryStatus.FAILED, deliveryError: reason.slice(0, 300) },
    });
  }
}
