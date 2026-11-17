import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false', ''])
  .default('false')
  .transform((value) => value === 'true');

const commaList = z
  .string()
  .min(1)
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

/**
 * Every environment variable the API reads is declared and validated here.
 * The process refuses to start if any required value is missing or malformed.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(4000),
    /** Number of reverse-proxy hops to trust for client IPs (rate limiting). 0 = none. */
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    DATABASE_URL: z.string().url().startsWith('postgresql://'),
    CORS_ORIGINS: commaList,
    WEB_APP_URL: z.string().url(),

    JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters'),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    COOKIE_SECURE: booleanString,
    COOKIE_DOMAIN: z
      .string()
      .optional()
      .transform((value) => (value ? value : undefined)),

    RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

    INVITATION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(72),
    /** `dev_link` returns the accept link to the inviter (non-production only); `none` returns nothing. */
    INVITATION_DELIVERY: z.enum(['dev_link', 'none']).default('none'),

    /** `fake` = deterministic offline replies (tests, demos without a key); `anthropic` = Claude. */
    LLM_PROVIDER: z.enum(['fake', 'anthropic']).default('fake'),
    ANTHROPIC_API_KEY: z
      .string()
      .optional()
      .transform((value) => (value ? value : undefined)),
    ANTHROPIC_MODEL: z.string().min(1).default('claude-sonnet-5-5'),
    ANTHROPIC_BASE_URL: z.string().url().default('https://api.anthropic.com'),
    LLM_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
    /** How many earlier messages the AI sees on each turn. */
    AI_HISTORY_MESSAGES: z.coerce.number().int().min(2).max(60).default(20),

    /**
     * Key for encrypting secrets stored in the database (e.g. WhatsApp access tokens):
     * 32 random bytes, base64. Generate with `openssl rand -base64 32`. Required in production.
     */
    DATA_ENCRYPTION_KEY: z
      .string()
      .optional()
      .transform((value) => (value ? value : undefined))
      .refine((value) => value === undefined || Buffer.from(value, 'base64').length === 32, {
        message: 'must be 32 bytes, base64-encoded (openssl rand -base64 32)',
      }),

    /** `fake` = messages are recorded but not sent (tests, demos without Meta); `cloud` = Meta WhatsApp Cloud API. */
    WHATSAPP_PROVIDER: z.enum(['fake', 'cloud']).default('fake'),
    /** Meta app secret. Every webhook is verified against it (X-Hub-Signature-256). */
    WHATSAPP_APP_SECRET: z
      .string()
      .optional()
      .transform((value) => (value ? value : undefined)),
    /** Any long random string; entered in the Meta app when subscribing the webhook. */
    WHATSAPP_VERIFY_TOKEN: z
      .string()
      .optional()
      .transform((value) => (value ? value : undefined))
      .refine((value) => value === undefined || value.length >= 16, {
        message: 'must be at least 16 characters',
      }),
    WHATSAPP_GRAPH_API_VERSION: z
      .string()
      .regex(/^v\d+\.\d+$/, 'must look like v26.0')
      .default('v26.0'),
    WHATSAPP_GRAPH_BASE_URL: z.string().url().default('https://graph.facebook.com'),
    WHATSAPP_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(15000),
    /**
     * Wait this long after a buyer message before the AI answers, so a burst like
     * "hi" / "3 BHK chahiye" / "Noida" gets one reply that covers all of it.
     */
    WHATSAPP_REPLY_DEBOUNCE_MS: z.coerce.number().int().min(0).max(15000).default(2500),

    /** `fake` = emails are logged (development) or kept in memory (tests); `resend` = sent via Resend. */
    MAIL_PROVIDER: z.enum(['fake', 'resend']).default('fake'),
    RESEND_API_KEY: z
      .string()
      .optional()
      .transform((value) => (value ? value : undefined)),
    /** Sender, e.g. `AI Real Estate Sales Employee <noreply@yourdomain.in>` (domain verified in Resend). */
    MAIL_FROM: z.string().min(3).default('AI Real Estate Sales Employee <noreply@example.com>'),
    MAIL_REPLY_TO: z
      .string()
      .optional()
      .transform((value) => (value ? value : undefined)),
    /** Where demo/contact requests from the public website are emailed. Optional. */
    CONTACT_NOTIFICATION_EMAIL: z
      .string()
      .email()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(10).max(1440).default(60),
    EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(48),

    /** Remind buyers on WhatsApp this many minutes before a confirmed site visit. */
    SITE_VISIT_REMINDER_MINUTES: z.coerce.number().int().min(15).max(1440).default(180),
    /** How often to look for due reminders. 0 turns the reminder loop off (tests). */
    SITE_VISIT_REMINDER_INTERVAL_MS: z.coerce.number().int().min(0).max(3600000).default(60000),
  })
  .superRefine((env, ctx) => {
    if (env.LLM_PROVIDER === 'anthropic' && !env.ANTHROPIC_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ANTHROPIC_API_KEY'],
        message: 'is required when LLM_PROVIDER=anthropic',
      });
    }
    if (env.WHATSAPP_PROVIDER === 'cloud') {
      for (const key of ['WHATSAPP_APP_SECRET', 'WHATSAPP_VERIFY_TOKEN'] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: 'is required when WHATSAPP_PROVIDER=cloud',
          });
        }
      }
    }
    if (env.MAIL_PROVIDER === 'resend' && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['RESEND_API_KEY'],
        message: 'is required when MAIL_PROVIDER=resend',
      });
    }
    if (env.NODE_ENV === 'production' && env.MAIL_PROVIDER === 'fake') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MAIL_PROVIDER'],
        message:
          'must be a real provider in production (password resets and invitations need email)',
      });
    }
    if (env.NODE_ENV === 'production' && !env.DATA_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATA_ENCRYPTION_KEY'],
        message: 'is required in production',
      });
    }
    if (env.NODE_ENV === 'production' && !env.COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_SECURE'],
        message: 'must be true in production',
      });
    }
    if (env.NODE_ENV === 'production' && env.INVITATION_DELIVERY === 'dev_link') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['INVITATION_DELIVERY'],
        message: 'dev_link is not allowed in production',
      });
    }
    if (
      env.NODE_ENV === 'production' &&
      /replace-with|change-me|local-dev/i.test(env.JWT_ACCESS_SECRET)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ACCESS_SECRET'],
        message: 'must be a real random secret in production',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    // Only variable names and reasons are printed — never the values.
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}
