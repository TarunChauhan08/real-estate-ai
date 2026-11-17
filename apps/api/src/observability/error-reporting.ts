import * as Sentry from '@sentry/node';

let enabled = false;

const PHONE = /\+?\d[\d\s-]{8,}\d/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

/** Removes things that identify buyers or team members from any text sent off the server. */
export function scrubText(text: string): string {
  return text.replace(EMAIL, '[email]').replace(PHONE, '[number]');
}

/**
 * Strips request bodies, cookies, auth headers, query strings and user details, and masks
 * phone numbers and emails in messages. Error reports describe *what broke*, never who.
 */
export function scrubEvent<T extends Sentry.ErrorEvent>(event: T): T {
  delete event.user;
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
    if (event.request.headers) {
      const { 'user-agent': userAgent } = event.request.headers;
      event.request.headers = userAgent ? { 'user-agent': userAgent } : {};
    }
  }
  if (event.message) event.message = scrubText(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrubText(ex.value);
  }
  delete event.breadcrumbs;
  return event;
}

export interface ErrorReportingOptions {
  dsn: string | undefined;
  environment: string;
  release?: string;
  tracesSampleRate: number;
}

/** Turns on Sentry when a DSN is configured. Safe to call when it is not. */
export function initErrorReporting(options: ErrorReportingOptions): boolean {
  if (!options.dsn) return false;
  Sentry.init({
    dsn: options.dsn,
    environment: options.environment,
    release: options.release,
    sendDefaultPii: false,
    // Only crash handlers: no automatic HTTP/database instrumentation that could record
    // URLs, queries or payloads.
    defaultIntegrations: false,
    integrations: [
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
    ],
    tracesSampleRate: options.tracesSampleRate,
    beforeSend: (event) => scrubEvent(event),
  });
  enabled = true;
  return true;
}

/** Reports an unexpected server error (5xx). No-op when error reporting is off. */
export function reportError(
  error: unknown,
  context: { requestId?: string; method?: string; route?: string } = {},
): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    if (context.requestId) scope.setTag('request_id', context.requestId);
    if (context.method) scope.setTag('method', context.method);
    if (context.route) scope.setTag('route', context.route);
    Sentry.captureException(error);
  });
}
