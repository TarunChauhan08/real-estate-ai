import { randomUUID } from 'node:crypto';
import {
  type SendTextRequest,
  type WhatsAppClient,
  type WhatsAppCredentials,
  WhatsAppError,
} from './whatsapp-client';

export interface FakeSentMessage extends SendTextRequest {
  phoneNumberId: string;
  externalId: string;
}

/**
 * Offline WhatsApp: nothing leaves the server. Sent messages are kept in memory so tests can
 * assert on them, and the reply still appears in the dashboard inbox like a real one.
 *
 * Sending to a number ending in `0000000` fails, so tests and demos can see the failure path.
 */
export class FakeWhatsAppClient implements WhatsAppClient {
  readonly name = 'fake' as const;
  readonly sent: FakeSentMessage[] = [];
  readonly read: string[] = [];

  sendText(
    credentials: WhatsAppCredentials,
    request: SendTextRequest,
  ): Promise<{ externalId: string }> {
    if (request.to.endsWith('0000000')) {
      return Promise.reject(
        new WhatsAppError('This number cannot receive WhatsApp messages.', false, 400, 131026),
      );
    }
    const externalId = `wamid.fake-${randomUUID()}`;
    this.sent.push({ ...request, phoneNumberId: credentials.phoneNumberId, externalId });
    return Promise.resolve({ externalId });
  }

  verify(credentials: WhatsAppCredentials): Promise<void> {
    if (credentials.accessToken === 'invalid-token') {
      return Promise.reject(
        new WhatsAppError('WhatsApp access token is invalid or expired.', false, 401, 190),
      );
    }
    return Promise.resolve();
  }

  markRead(_credentials: WhatsAppCredentials, externalId: string): Promise<void> {
    this.read.push(externalId);
    return Promise.resolve();
  }

  /** Test helper. */
  reset(): void {
    this.sent.length = 0;
    this.read.length = 0;
  }
}
