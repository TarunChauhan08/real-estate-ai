import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { type Request } from 'express';
import { AppConfigService } from '../../config/app-config.service';
import { Errors } from '../errors/app.exception';

/**
 * CSRF defence-in-depth for endpoints authenticated by cookie (refresh, logout).
 * Browsers send `Origin` on cross-origin POSTs; reject any origin not on the allow-list.
 * Requests without an Origin header (server-to-server, tests) pass — the SameSite=Strict
 * refresh cookie already prevents cross-site use.
 */
@Injectable()
export class TrustedOriginGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const origin = context.switchToHttp().getRequest<Request>().headers.origin;
    if (origin && !this.config.get('CORS_ORIGINS').includes(origin)) {
      throw Errors.forbidden('Request origin is not allowed');
    }
    return true;
  }
}
