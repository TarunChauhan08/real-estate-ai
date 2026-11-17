import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { setTimeout as sleep } from 'node:timers/promises';
import { AppConfigService } from '../../config/app-config.service';
import { ConversationsService } from '../conversations/conversations.service';
import {
  type InboundMessageEvent,
  type StatusEvent,
  type WhatsAppEvent,
} from '../whatsapp/webhook/webhook-payload';
import { WhatsAppAccountsService } from '../whatsapp/whatsapp-accounts.service';
import { WhatsAppDeliveryService } from '../whatsapp/whatsapp-delivery.service';

/**
 * Turns Meta webhook events into stored messages and AI replies.
 *
 * Meta expects a 200 within a few seconds and retries otherwise, but an AI reply can take longer.
 * So the webhook only acknowledges, and the work continues here in the background:
 *
 * - Messages from the same buyer are stored one at a time, in order (a per-buyer queue), which
 *   also prevents two first messages from creating the same lead twice.
 * - The AI waits a moment (WHATSAPP_REPLY_DEBOUNCE_MS) before answering and only answers the
 *   buyer's latest message, so "hi" / "3 BHK chahiye" / "Noida" sent in quick succession get one
 *   coherent reply instead of three overlapping ones.
 * - Retried webhooks are harmless: messages are de-duplicated on WhatsApp's message ID.
 *
 * This queue lives in memory, which is right for a single API instance. Running several
 * instances needs a shared queue (e.g. BullMQ on Redis) — see docs/decisions/0003.
 */
@Injectable()
export class WhatsAppInboundService implements OnApplicationShutdown {
  private readonly logger = new Logger(WhatsAppInboundService.name);
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly inFlight = new Set<Promise<void>>();

  constructor(
    private readonly accounts: WhatsAppAccountsService,
    private readonly conversations: ConversationsService,
    private readonly delivery: WhatsAppDeliveryService,
    private readonly config: AppConfigService,
  ) {}

  /** Schedules processing and returns immediately. */
  accept(events: WhatsAppEvent[]): void {
    if (events.length === 0) return;
    const task = this.process(events).then(
      () => undefined,
      (error: unknown) =>
        this.logger.error(`WhatsApp webhook processing failed: ${(error as Error).message}`),
    );
    this.inFlight.add(task);
    void task.finally(() => this.inFlight.delete(task));
  }

  /**
   * Processes events and waits for every resulting AI reply. `debounce: false` answers at once
   * (the demo simulator sends one message at a time, so there is no burst to wait for).
   */
  async process(
    events: WhatsAppEvent[],
    options: { debounce?: boolean } = {},
  ): Promise<Array<{ conversationId: string } | null>> {
    const results: Array<{ conversationId: string } | null> = [];
    for (const event of events) {
      results.push(
        event.kind === 'message'
          ? await this.onMessage(event, options.debounce ?? true)
          : await this.onStatus(event),
      );
    }
    return results;
  }

  /** Resolves when all background work has finished. */
  async whenIdle(): Promise<void> {
    while (this.inFlight.size > 0 || this.queues.size > 0) {
      await Promise.allSettled([...this.inFlight, ...this.queues.values()]);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.whenIdle();
  }

  private async onMessage(
    event: InboundMessageEvent,
    debounce: boolean,
  ): Promise<{ conversationId: string } | null> {
    const account = await this.accounts.resolveByPhoneNumberId(event.phoneNumberId);
    if (!account) {
      this.logger.warn(`WhatsApp message for unknown phone number ID ${event.phoneNumberId}`);
      return null;
    }
    const { tenantId } = account;
    const buyerKey = `${tenantId}:${event.from}`;

    const stored = await this.serialised(`store:${buyerKey}`, () =>
      this.conversations.receiveWhatsApp({
        tenantId,
        from: event.from,
        profileName: event.profileName,
        externalId: event.externalId,
        content: event.content,
      }),
    );
    if (!stored) return null;
    if (!stored.isNew) return { conversationId: stored.conversationId };

    await this.accounts.touchInbound(tenantId, event.receivedAt);
    await this.delivery.markRead(tenantId, event.externalId);

    await this.serialised(`reply:${buyerKey}`, async () => {
      const delay = debounce ? this.config.get('WHATSAPP_REPLY_DEBOUNCE_MS') : 0;
      if (delay > 0) await sleep(delay);
      const reply = await this.conversations.replyOnWhatsApp(
        tenantId,
        stored.conversationId,
        stored.messageId,
      );
      if (reply.aiError) {
        this.logger.warn(`No AI reply for conversation ${stored.conversationId}: ${reply.aiError}`);
      }
    });
    return { conversationId: stored.conversationId };
  }

  private async onStatus(event: StatusEvent): Promise<null> {
    const account = await this.accounts.resolveByPhoneNumberId(event.phoneNumberId);
    if (account) {
      await this.delivery.applyStatus(
        account.tenantId,
        event.externalId,
        event.status,
        event.error,
      );
    }
    return null;
  }

  /** Runs `work` after any earlier work for the same key has finished. */
  private serialised<T>(key: string, work: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(key) ?? Promise.resolve();
    const next = previous.then(work);
    const tracked = next.catch(() => undefined);
    this.queues.set(key, tracked);
    void tracked.then(() => {
      if (this.queues.get(key) === tracked) this.queues.delete(key);
    });
    return next;
  }
}
