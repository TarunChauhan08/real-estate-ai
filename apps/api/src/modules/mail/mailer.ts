import { Logger } from '@nestjs/common';

export const MAILER = Symbol('MAILER');

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface Mailer {
  readonly name: 'fake' | 'resend';
  /** Throws MailError if the provider refuses or cannot be reached. */
  send(email: Email): Promise<{ id: string }>;
}

export class MailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MailError';
  }
}

/**
 * Nothing leaves the server. Tests read `sent`; in development the link-bearing text is logged so
 * a developer can click it. Never used in production (env validation refuses it there).
 */
export class FakeMailer implements Mailer {
  readonly name = 'fake' as const;
  readonly sent: Email[] = [];
  private readonly logger = new Logger('FakeMailer');

  constructor(private readonly log: boolean) {}

  send(email: Email): Promise<{ id: string }> {
    this.sent.push(email);
    if (this.log) this.logger.log(`Email to ${email.to}: ${email.subject}\n${email.text}`);
    return Promise.resolve({ id: `fake-${this.sent.length}` });
  }

  /** Test helper: the most recent email to this address. */
  lastTo(to: string): Email | undefined {
    return [...this.sent].reverse().find((e) => e.to === to);
  }
}

/** https://resend.com/docs/api-reference/emails/send-email */
export class ResendMailer implements Mailer {
  readonly name = 'resend' as const;

  constructor(
    private readonly options: {
      apiKey: string;
      from: string;
      replyTo?: string;
      timeoutMs?: number;
    },
  ) {}

  async send(email: Email): Promise<{ id: string }> {
    let res: Response;
    try {
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.options.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: this.options.from,
          to: [email.to],
          subject: email.subject,
          html: email.html,
          text: email.text,
          ...(this.options.replyTo ? { reply_to: this.options.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(this.options.timeoutMs ?? 10_000),
      });
    } catch {
      throw new MailError('The email service could not be reached');
    }
    if (!res.ok) {
      // Resend's error names are safe to keep; the body never includes our API key.
      const body = (await res.json().catch(() => null)) as { name?: string } | null;
      throw new MailError(
        `The email service refused the message (HTTP ${res.status}${body?.name ? `, ${body.name}` : ''})`,
      );
    }
    const data = (await res.json()) as { id?: string };
    return { id: data.id ?? 'unknown' };
  }
}
