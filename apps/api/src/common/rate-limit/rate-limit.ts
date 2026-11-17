import { type ExecutionContext, SetMetadata } from '@nestjs/common';
import { type ThrottlerModuleOptions } from '@nestjs/throttler';
import { type AppConfigService } from '../../config/app-config.service';

const STRICT_RATE_LIMIT_KEY = 'strictRateLimit';

/** Applies the stricter credential-endpoint limit (AUTH_RATE_LIMIT_MAX) in addition to the global one. */
export const StrictRateLimit = (): MethodDecorator => SetMetadata(STRICT_RATE_LIMIT_KEY, true);

function isStrict(context: ExecutionContext): boolean {
  return Reflect.getMetadata(STRICT_RATE_LIMIT_KEY, context.getHandler()) === true;
}

/** Two named throttlers keyed by client IP: a global limit and a strict one for auth endpoints. */
export function rateLimitOptions(config: AppConfigService): ThrottlerModuleOptions {
  const ttl = config.get('RATE_LIMIT_TTL_SECONDS') * 1000;
  return {
    throttlers: [
      { name: 'default', ttl, limit: config.get('RATE_LIMIT_MAX') },
      { name: 'strict', ttl, limit: config.get('AUTH_RATE_LIMIT_MAX'), skipIf: (ctx) => !isStrict(ctx) },
    ],
  };
}
