import { type ErrorEvent } from '@sentry/node';
import { initErrorReporting, reportError, scrubEvent, scrubText } from './error-reporting';

describe('error reporting', () => {
  it('is off without a DSN, and reporting is then a no-op', () => {
    expect(initErrorReporting({ dsn: undefined, environment: 'test', tracesSampleRate: 0 })).toBe(
      false,
    );
    expect(() => reportError(new Error('boom'))).not.toThrow();
  });

  it('masks phone numbers and emails', () => {
    expect(scrubText('Lead +91 98111 22333 / neha@example.com failed')).toBe(
      'Lead [number] / [email] failed',
    );
  });

  it('strips bodies, cookies, auth headers, user and breadcrumbs from events', () => {
    const event = scrubEvent({
      type: undefined,
      message: 'Send to 9811122333 failed',
      user: { email: 'owner@example.com' },
      request: {
        url: 'https://api.example.com/api/v1/conversations/x/messages',
        data: { content: 'Mujhe 2 BHK chahiye' },
        cookies: { rt: 'secret' },
        query_string: 'token=abc',
        headers: { authorization: 'Bearer x', cookie: 'rt=secret', 'user-agent': 'Chrome' },
      },
      exception: { values: [{ type: 'Error', value: 'Buyer 9811122333 not found' }] },
      breadcrumbs: [{ message: 'GET /x' }],
    } as ErrorEvent);
    expect(event.user).toBeUndefined();
    expect(event.request).toEqual({
      url: 'https://api.example.com/api/v1/conversations/x/messages',
      headers: { 'user-agent': 'Chrome' },
    });
    expect(event.message).toBe('Send to [number] failed');
    expect(event.exception?.values?.[0]?.value).toBe('Buyer [number] not found');
    expect(event.breadcrumbs).toBeUndefined();
  });
});
