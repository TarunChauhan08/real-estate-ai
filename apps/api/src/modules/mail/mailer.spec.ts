import { MailError, ResendMailer } from './mailer';

describe('ResendMailer', () => {
  const mailer = new ResendMailer({
    apiKey: 're_secret',
    from: 'Brand <noreply@brand.in>',
    replyTo: 'support@brand.in',
  });
  const email = { to: 'a@b.in', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' };
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchMock.mockRestore());

  it('posts the email to Resend with the API key', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }));
    await expect(mailer.send(email)).resolves.toEqual({ id: 'em_1' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer re_secret');
    expect(JSON.parse(init.body as string)).toEqual({
      from: 'Brand <noreply@brand.in>',
      to: ['a@b.in'],
      subject: 'Hi',
      html: '<p>Hi</p>',
      text: 'Hi',
      reply_to: 'support@brand.in',
    });
  });

  it('reports refusals and outages without leaking the key', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ name: 'validation_error' }), { status: 422 }),
    );
    const refused = (await mailer.send(email).catch((e: unknown) => e)) as MailError;
    expect(refused).toBeInstanceOf(MailError);
    expect(refused.message).toContain('validation_error');
    expect(refused.message).not.toContain('re_secret');

    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    await expect(mailer.send(email)).rejects.toThrow(/could not be reached/);
  });
});
