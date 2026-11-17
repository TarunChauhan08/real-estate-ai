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
  })
  .superRefine((env, ctx) => {
    if (env.LLM_PROVIDER === 'anthropic' && !env.ANTHROPIC_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ANTHROPIC_API_KEY'],
        message: 'is required when LLM_PROVIDER=anthropic',
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
