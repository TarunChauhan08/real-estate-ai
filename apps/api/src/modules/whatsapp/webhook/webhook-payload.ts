import { createHmac, timingSafeEqual } from 'node:crypto';
import { normalizePhone } from '../../../common/utils/phone';

/**
 * Meta webhook payloads → small, typed events. Pure functions: no I/O, fully unit-tested.
 *
 * Meta sends one POST per batch: `entry[].changes[].value` holds incoming `messages` and/or
 * delivery `statuses` for one business phone number (`metadata.phone_number_id`).
 */

export interface InboundMessageEvent {
  kind: 'message';
  phoneNumberId: string;
  /** Buyer's number, E.164. */
  from: string;
  /** Buyer's WhatsApp profile name, if shared. */
  profileName: string | null;
  /** `wamid` — used to ignore Meta's retries of the same webhook. */
  externalId: string;
  receivedAt: Date;
  /** WhatsApp message type (`text`, `image`, `audio`…). */
  type: string;
  /** Text the AI reads. Non-text messages become a short bracketed description. */
  content: string;
}

export type DeliveryState = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface StatusEvent {
  kind: 'status';
  phoneNumberId: string;
  externalId: string;
  status: DeliveryState;
  at: Date;
  /** Meta's error code and title for failed messages. */
  error: string | null;
}

export type WhatsAppEvent = InboundMessageEvent | StatusEvent;

/** Incoming text longer than this is cut (WhatsApp itself caps text at 4096). */
const MAX_INBOUND_CHARS = 4000;

type Json = Record<string, unknown>;
const obj = (value: unknown): Json =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {};
const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

function toDate(seconds: unknown): Date {
  const n = Number(seconds);
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000) : new Date();
}

/** What the AI should "see" for a message. Returns null for messages that need no reply. */
export function describeMessage(message: Json): string | null {
  const type = str(message.type) ?? 'unknown';
  const caption = (key: string) => str(obj(message[key]).caption);
  switch (type) {
    case 'text':
      return str(obj(message.text).body);
    case 'button':
      return str(obj(message.button).text);
    case 'interactive': {
      const interactive = obj(message.interactive);
      const reply = obj(interactive.button_reply ?? interactive.list_reply);
      return str(reply.title) ?? '[Tapped a button]';
    }
    case 'location': {
      const location = obj(message.location);
      const place = [str(location.name), str(location.address)].filter(Boolean).join(', ');
      const coords =
        typeof location.latitude === 'number' && typeof location.longitude === 'number'
          ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
          : null;
      return `[Shared a location${place ? `: ${place}` : ''}${coords ? ` (${coords})` : ''}]`;
    }
    case 'image':
    case 'video':
    case 'document': {
      const label = { image: 'a photo', video: 'a video', document: 'a document' }[type];
      const text = caption(type);
      return `[Sent ${label}]${text ? ` ${text}` : ''}`;
    }
    case 'audio':
      return '[Sent a voice note — the AI cannot listen to voice notes yet]';
    case 'sticker':
      return '[Sent a sticker]';
    case 'contacts':
      return '[Shared a contact card]';
    case 'reaction':
      // Emoji reactions to earlier messages do not need a reply.
      return null;
    default:
      return '[Sent a message type the AI cannot read yet]';
  }
}

const STATUS_MAP: Record<string, DeliveryState> = {
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'FAILED',
};

/** Flattens a webhook body into events. Unknown or malformed parts are skipped, never thrown. */
export function parseWebhook(body: unknown): WhatsAppEvent[] {
  const root = obj(body);
  if (root.object !== 'whatsapp_business_account') return [];
  const events: WhatsAppEvent[] = [];

  for (const entry of arr(root.entry)) {
    for (const change of arr(obj(entry).changes)) {
      const c = obj(change);
      if (c.field !== 'messages') continue;
      const value = obj(c.value);
      const phoneNumberId = str(obj(value.metadata).phone_number_id);
      if (!phoneNumberId) continue;

      const names = new Map<string, string>();
      for (const contact of arr(value.contacts)) {
        const waId = str(obj(contact).wa_id);
        const name = str(obj(obj(contact).profile).name);
        if (waId && name) names.set(waId, name.slice(0, 120));
      }

      for (const raw of arr(value.messages)) {
        const message = obj(raw);
        const from = str(message.from);
        const externalId = str(message.id);
        const phone = from ? normalizePhone(`+${from.replace(/^\+/, '')}`) : null;
        const content = describeMessage(message);
        if (!phone || !externalId || !content) continue;
        events.push({
          kind: 'message',
          phoneNumberId,
          from: phone,
          profileName: names.get(from!) ?? null,
          externalId: externalId.slice(0, 128),
          receivedAt: toDate(message.timestamp),
          type: str(message.type) ?? 'unknown',
          content: content.slice(0, MAX_INBOUND_CHARS),
        });
      }

      for (const raw of arr(value.statuses)) {
        const status = obj(raw);
        const externalId = str(status.id);
        const state = STATUS_MAP[str(status.status) ?? ''];
        if (!externalId || !state) continue;
        const firstError = obj(arr(status.errors)[0]);
        const code = typeof firstError.code === 'number' ? firstError.code : null;
        const title = str(firstError.title);
        events.push({
          kind: 'status',
          phoneNumberId,
          externalId: externalId.slice(0, 128),
          status: state,
          at: toDate(status.timestamp),
          error:
            state === 'FAILED'
              ? [code !== null ? `Error ${code}` : null, title]
                  .filter(Boolean)
                  .join(': ')
                  .slice(0, 300) || 'Delivery failed'
              : null,
        });
      }
    }
  }
  return events;
}

/**
 * Verifies Meta's `X-Hub-Signature-256: sha256=<hex>` header: an HMAC of the exact raw request
 * bytes with the app secret. Constant-time comparison.
 */
export function isValidSignature(
  rawBody: Buffer | undefined,
  header: string | undefined,
  appSecret: string,
): boolean {
  if (!rawBody || !header?.startsWith('sha256=')) return false;
  const received = Buffer.from(header.slice('sha256='.length), 'hex');
  const expected = createHmac('sha256', appSecret).update(rawBody).digest();
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Delivery states only move forward (a late "delivered" must not overwrite "read"). */
const RANK: Record<DeliveryState | 'PENDING', number> = {
  PENDING: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: 4,
};

export function shouldApplyStatus(current: string | null, next: DeliveryState): boolean {
  if (current === 'FAILED') return false;
  if (next === 'FAILED') return true;
  return RANK[next] > (current ? (RANK[current as DeliveryState] ?? 0) : 0);
}
