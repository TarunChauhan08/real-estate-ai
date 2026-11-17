import { CloudApiWhatsAppClient } from './cloud-api.client';
import { splitForWhatsApp, WhatsAppError } from './whatsapp-client';

const credentials = { phoneNumberId: '106540352242922', accessToken: 'EAAG-secret-token' };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('CloudApiWhatsAppClient', () => {
  const client = new CloudApiWhatsAppClient({
    baseUrl: 'https://graph.example.test',
    apiVersion: 'v26.0',
    timeoutMs: 5000,
  });
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchMock.mockRestore());

  it('sends a text message to the phone number’s /messages endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { messages: [{ id: 'wamid.OUT' }] }));
    const result = await client.sendText(credentials, { to: '+919876543210', body: 'Namaste!' });

    expect(result).toEqual({ externalId: 'wamid.OUT' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://graph.example.test/v26.0/106540352242922/messages');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer EAAG-secret-token');
    expect(JSON.parse(init.body as string)).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '919876543210',
      type: 'text',
      text: { preview_url: false, body: 'Namaste!' },
    });
  });

  it('explains common Meta errors in plain words and does not retry permanent ones', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: { code: 131047, message: 'Re-engagement message +919876543210' },
      }),
    );
    const error = (await client
      .sendText(credentials, { to: '+919876543210', body: 'hi' })
      .catch((e: unknown) => e)) as WhatsAppError;
    expect(error).toBeInstanceOf(WhatsAppError);
    expect(error.code).toBe(131047);
    expect(error.message).toMatch(/24 hours/);
    // Meta's raw message (which can contain the buyer's number) is never surfaced.
    expect(error.message).not.toContain('9876543210');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries once on a temporary failure', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(200, { messages: [{ id: 'wamid.RETRY' }] }));
    await expect(
      client.sendText(credentials, { to: '+919876543210', body: 'hi' }),
    ).resolves.toEqual({
      externalId: 'wamid.RETRY',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports an invalid token when verifying a connection', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: { code: 190 } }));
    await expect(client.verify(credentials)).rejects.toThrow(/invalid or expired/);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://graph.example.test/v26.0/106540352242922?fields=display_phone_number',
    );
    expect(init.method).toBe('GET');
  });

  it('marks an incoming message as read', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { success: true }));
    await client.markRead(credentials, 'wamid.IN');
    expect(
      JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string),
    ).toEqual({ messaging_product: 'whatsapp', status: 'read', message_id: 'wamid.IN' });
  });
});

describe('splitForWhatsApp', () => {
  it('leaves short messages alone', () => {
    expect(splitForWhatsApp('  Hello  ')).toEqual(['Hello']);
  });

  it('splits long text on natural boundaries within the limit', () => {
    const text = `${'a'.repeat(60)}\n\n${'b'.repeat(60)}. ${'c'.repeat(30)}`;
    const parts = splitForWhatsApp(text, 80);
    expect(parts.every((p) => p.length <= 80)).toBe(true);
    expect(parts[0]).toBe('a'.repeat(60));
    expect(parts.join(' ').replace(/\s+/g, '')).toBe(text.replace(/\s+/g, ''));
  });

  it('hard-cuts text with no spaces', () => {
    expect(splitForWhatsApp('x'.repeat(25), 10)).toEqual([
      'x'.repeat(10),
      'x'.repeat(10),
      'x'.repeat(5),
    ]);
  });
});
