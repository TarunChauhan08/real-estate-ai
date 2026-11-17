import { Logger } from '@nestjs/common';
import {
  type SendTextRequest,
  type WhatsAppClient,
  type WhatsAppCredentials,
  WhatsAppError,
} from './whatsapp-client';

export interface CloudApiOptions {
  baseUrl: string;
  apiVersion: string;
  timeoutMs: number;
}

interface GraphErrorBody {
  error?: { message?: string; code?: number; error_subcode?: number };
}

/** Meta error codes that mean "try again later" rather than "this will never work". */
const RETRYABLE_CODES = new Set([1, 2, 4, 80007, 130429, 131000, 131016, 131056]);

/** Plain-language reasons for the failures a business is most likely to hit. */
const FRIENDLY_ERRORS: Record<number, string> = {
  190: 'WhatsApp access token is invalid or expired. Reconnect WhatsApp in Integrations.',
  10: 'The access token is missing the whatsapp_business_messaging permission.',
  131026: 'This number cannot receive WhatsApp messages.',
  131047:
    'More than 24 hours since the buyer last wrote. WhatsApp only allows template messages now.',
  131051: 'WhatsApp does not support this message type.',
  130429: 'WhatsApp rate limit reached. The message will need to be resent.',
  131056: 'Too many messages to this buyer in a short time.',
  133010: 'This WhatsApp number is not registered with the Cloud API yet.',
};

/** Meta WhatsApp Cloud API (graph.facebook.com/{version}/{phone-number-id}/messages). */
export class CloudApiWhatsAppClient implements WhatsAppClient {
  readonly name = 'cloud' as const;
  private readonly logger = new Logger(CloudApiWhatsAppClient.name);

  constructor(private readonly options: CloudApiOptions) {}

  async sendText(
    credentials: WhatsAppCredentials,
    request: SendTextRequest,
  ): Promise<{ externalId: string }> {
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: request.to.replace(/^\+/, ''),
      type: 'text',
      text: { preview_url: false, body: request.body },
    };
    if (request.replyToExternalId) payload.context = { message_id: request.replyToExternalId };

    for (let attempt = 1; ; attempt += 1) {
      try {
        const data = (await this.post(credentials, payload)) as {
          messages?: Array<{ id?: string }>;
        };
        const externalId = data.messages?.[0]?.id;
        if (!externalId) throw new WhatsAppError('WhatsApp did not return a message ID', false);
        return { externalId };
      } catch (error) {
        const waError =
          error instanceof WhatsAppError
            ? error
            : new WhatsAppError((error as Error).message, true);
        if (!waError.retryable || attempt >= 2) throw waError;
        this.logger.warn(`WhatsApp send failed (${waError.message}); retrying once`);
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
    }
  }

  async verify(credentials: WhatsAppCredentials): Promise<void> {
    const url = `${this.options.baseUrl}/${this.options.apiVersion}/${encodeURIComponent(
      credentials.phoneNumberId,
    )}?fields=display_phone_number`;
    await this.request(url, credentials, { method: 'GET' });
  }

  async markRead(credentials: WhatsAppCredentials, externalId: string): Promise<void> {
    await this.post(credentials, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: externalId,
    });
  }

  private post(credentials: WhatsAppCredentials, payload: unknown): Promise<unknown> {
    const url = `${this.options.baseUrl}/${this.options.apiVersion}/${encodeURIComponent(
      credentials.phoneNumberId,
    )}/messages`;
    return this.request(url, credentials, { method: 'POST', body: JSON.stringify(payload) });
  }

  private async request(
    url: string,
    credentials: WhatsAppCredentials,
    init: { method: 'GET' | 'POST'; body?: string },
  ): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(url, {
        method: init.method,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${credentials.accessToken}`,
        },
        body: init.body,
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error) {
      const timedOut = (error as Error).name === 'TimeoutError';
      throw new WhatsAppError(timedOut ? 'WhatsApp timed out' : 'WhatsApp unreachable', true);
    }
    if (res.ok) return res.json();

    // Only Meta's error code and our own wording are kept — never the raw body, which can echo
    // the buyer's number or message.
    const body = (await res.json().catch(() => null)) as GraphErrorBody | null;
    const code = body?.error?.code;
    const message =
      (code !== undefined && FRIENDLY_ERRORS[code]) ||
      `WhatsApp rejected the request (HTTP ${res.status}${code !== undefined ? `, code ${code}` : ''})`;
    const retryable = res.status >= 500 || (code !== undefined && RETRYABLE_CODES.has(code));
    throw new WhatsAppError(message, retryable, res.status, code);
  }
}
