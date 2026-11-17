import { createHmac } from 'node:crypto';
import {
  describeMessage,
  isValidSignature,
  parseWebhook,
  shouldApplyStatus,
} from './webhook-payload';

/** Builds a webhook body shaped exactly like Meta's. */
function webhook(value: Record<string, unknown>, phoneNumberId = '111222333') {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WABA_ID',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '919999900000', phone_number_id: phoneNumberId },
              ...value,
            },
          },
        ],
      },
    ],
  };
}

describe('parseWebhook', () => {
  it('turns a text message into an event with the buyer number in E.164 and their profile name', () => {
    const events = parseWebhook(
      webhook({
        contacts: [{ profile: { name: 'Priya Verma' }, wa_id: '919876543210' }],
        messages: [
          {
            from: '919876543210',
            id: 'wamid.ABC',
            timestamp: '1794900000',
            type: 'text',
            text: { body: '  Noida mein 3 BHK chahiye  ' },
          },
        ],
      }),
    );
    expect(events).toEqual([
      {
        kind: 'message',
        phoneNumberId: '111222333',
        from: '+919876543210',
        profileName: 'Priya Verma',
        externalId: 'wamid.ABC',
        receivedAt: new Date(1794900000 * 1000),
        type: 'text',
        content: 'Noida mein 3 BHK chahiye',
      },
    ]);
  });

  it('parses delivery statuses, including the reason for failures', () => {
    const events = parseWebhook(
      webhook({
        statuses: [
          { id: 'wamid.1', status: 'delivered', timestamp: '1794900001', recipient_id: '91987' },
          {
            id: 'wamid.2',
            status: 'failed',
            timestamp: '1794900002',
            errors: [{ code: 131047, title: 'Re-engagement message' }],
          },
          { id: 'wamid.3', status: 'deleted' },
        ],
      }),
    );
    expect(events).toEqual([
      expect.objectContaining({
        kind: 'status',
        externalId: 'wamid.1',
        status: 'DELIVERED',
        error: null,
      }),
      expect.objectContaining({
        kind: 'status',
        externalId: 'wamid.2',
        status: 'FAILED',
        error: 'Error 131047: Re-engagement message',
      }),
    ]);
  });

  it('skips reactions, malformed messages and unrelated webhooks without throwing', () => {
    expect(
      parseWebhook(
        webhook({
          messages: [
            { from: '919876543210', id: 'wamid.R', type: 'reaction', reaction: { emoji: '👍' } },
            { from: 'not-a-number', id: 'wamid.X', type: 'text', text: { body: 'hi' } },
            { from: '919876543210', type: 'text', text: { body: 'no id' } },
            { from: '919876543210', id: 'wamid.E', type: 'text', text: { body: '   ' } },
          ],
        }),
      ),
    ).toEqual([]);
    expect(parseWebhook({ object: 'page', entry: [] })).toEqual([]);
    expect(parseWebhook(null)).toEqual([]);
    expect(parseWebhook({ object: 'whatsapp_business_account', entry: 'oops' })).toEqual([]);
    expect(parseWebhook(webhook({ messages: [{ id: 'x' }] }, ''))).toEqual([]);
  });

  it('caps very long messages', () => {
    const [event] = parseWebhook(
      webhook({
        messages: [
          { from: '919876543210', id: 'w', type: 'text', text: { body: 'a'.repeat(9000) } },
        ],
      }),
    );
    expect(event?.kind === 'message' && event.content.length).toBe(4000);
  });
});

describe('describeMessage', () => {
  it.each([
    [{ type: 'button', button: { text: 'Book a visit' } }, 'Book a visit'],
    [{ type: 'interactive', interactive: { button_reply: { id: '1', title: 'Yes' } } }, 'Yes'],
    [{ type: 'interactive', interactive: { list_reply: { id: '2', title: '3 BHK' } } }, '3 BHK'],
    [
      { type: 'image', image: { caption: 'Is this flat available?' } },
      '[Sent a photo] Is this flat available?',
    ],
    [{ type: 'document', document: {} }, '[Sent a document]'],
    [
      { type: 'audio', audio: { voice: true } },
      '[Sent a voice note — the AI cannot listen to voice notes yet]',
    ],
    [
      { type: 'location', location: { latitude: 28.4089, longitude: 77.3178, name: 'Sector 150' } },
      '[Shared a location: Sector 150 (28.40890, 77.31780)]',
    ],
    [{ type: 'contacts', contacts: [] }, '[Shared a contact card]'],
    [{ type: 'unsupported' }, '[Sent a message type the AI cannot read yet]'],
  ])('%j → %s', (message, expected) => {
    expect(describeMessage(message)).toBe(expected);
  });
});

describe('isValidSignature', () => {
  const secret = 'app-secret';
  const body = Buffer.from('{"object":"whatsapp_business_account"}');
  const sign = (bytes: Buffer, key = secret) =>
    `sha256=${createHmac('sha256', key).update(bytes).digest('hex')}`;

  it('accepts Meta’s HMAC of the exact raw bytes', () => {
    expect(isValidSignature(body, sign(body), secret)).toBe(true);
  });

  it('rejects a wrong secret, altered body, missing or malformed header', () => {
    expect(isValidSignature(body, sign(body, 'other'), secret)).toBe(false);
    expect(isValidSignature(Buffer.from(`${body.toString()} `), sign(body), secret)).toBe(false);
    expect(isValidSignature(body, undefined, secret)).toBe(false);
    expect(isValidSignature(body, 'sha1=abc', secret)).toBe(false);
    expect(isValidSignature(body, 'sha256=zz', secret)).toBe(false);
    expect(isValidSignature(undefined, sign(body), secret)).toBe(false);
  });
});

describe('shouldApplyStatus', () => {
  it('only moves forward: sent → delivered → read', () => {
    expect(shouldApplyStatus('PENDING', 'SENT')).toBe(true);
    expect(shouldApplyStatus('SENT', 'DELIVERED')).toBe(true);
    expect(shouldApplyStatus('DELIVERED', 'READ')).toBe(true);
    expect(shouldApplyStatus('READ', 'DELIVERED')).toBe(false);
    expect(shouldApplyStatus('DELIVERED', 'DELIVERED')).toBe(false);
  });

  it('a failure always wins, and nothing overrides a failure', () => {
    expect(shouldApplyStatus('SENT', 'FAILED')).toBe(true);
    expect(shouldApplyStatus('FAILED', 'READ')).toBe(false);
  });
});
