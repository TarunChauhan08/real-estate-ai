/**
 * Provider-neutral contract for sending WhatsApp messages.
 *
 * `cloud` talks to Meta's WhatsApp Cloud API. `fake` records messages in memory so the whole
 * flow (webhook → AI → reply) works in tests and demos without a Meta account. A BSP such as
 * Gupshup or Twilio would be one more implementation of this interface.
 */
export const WHATSAPP_CLIENT = Symbol('WHATSAPP_CLIENT');

/** WhatsApp caps a text body at 4096 characters. */
export const WHATSAPP_TEXT_LIMIT = 4096;

export interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
}

export interface SendTextRequest {
  /** Recipient in E.164 (`+919876543210`). */
  to: string;
  body: string;
  /** Show the reply as a quote of this incoming message (`wamid`). */
  replyToExternalId?: string;
}

export interface WhatsAppClient {
  readonly name: 'cloud' | 'fake';
  /** Returns the provider message ID (`wamid`), used to match delivery-status webhooks. */
  sendText(
    credentials: WhatsAppCredentials,
    request: SendTextRequest,
  ): Promise<{ externalId: string }>;
  /** Confirms the phone number ID and token work. Throws WhatsAppError if they do not. */
  verify(credentials: WhatsAppCredentials): Promise<void>;
  /** Shows blue ticks to the buyer. Best effort — callers ignore failures. */
  markRead(credentials: WhatsAppCredentials, externalId: string): Promise<void>;
}

/** Any provider failure. `message` is safe to store and show to staff (no tokens, no buyer data). */
export class WhatsAppError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
    /** Meta error code, e.g. 131047 = more than 24 hours since the buyer last wrote. */
    readonly code?: number,
  ) {
    super(message);
    this.name = 'WhatsAppError';
  }
}

/**
 * Splits a long reply into WhatsApp-sized parts, preferring paragraph, then line, then
 * sentence, then word boundaries so no part ends mid-word.
 */
export function splitForWhatsApp(text: string, limit = WHATSAPP_TEXT_LIMIT): string[] {
  const parts: string[] = [];
  let rest = text.trim();
  while (rest.length > limit) {
    const window = rest.slice(0, limit);
    const cut = Math.max(
      ...['\n\n', '\n', '. ', '। ', ' '].map((separator) => {
        const index = window.lastIndexOf(separator);
        return index >= limit / 2 ? index + separator.length : -1;
      }),
    );
    const end = cut > 0 ? cut : limit;
    parts.push(rest.slice(0, end).trim());
    rest = rest.slice(end).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}
