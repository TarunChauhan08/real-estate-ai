import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request } from 'express';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { Errors } from '../../../common/errors/app.exception';
import { MembershipsService } from '../../memberships/memberships.service';
import { type AuthContext } from '../auth-context';
import { SessionsService } from '../sessions.service';
import { TokenService } from '../token.service';

/**
 * Global authentication guard (deny by default).
 *
 * 1. Verifies the Bearer access token signature, issuer, audience and expiry.
 * 2. Confirms the user is still ACTIVE and the login session family has not been revoked
 *    (so logout and token-theft revocation take effect immediately).
 * 3. Re-reads the membership named in the token and confirms it still belongs to this user,
 *    is ACTIVE, and that its tenant is not SUSPENDED. Role comes from the database row,
 *    never from the token or the request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly sessions: SessionsService,
    private readonly memberships: MembershipsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    const match = typeof header === 'string' ? /^Bearer ([A-Za-z0-9._-]+)$/.exec(header) : null;
    if (!match?.[1]) throw Errors.unauthenticated();

    const claims = await this.tokens.verifyAccessToken(match[1]);
    const [userActive, familyActive] = await Promise.all([
      this.memberships.isUserActive(claims.sub),
      this.sessions.isFamilyActive(claims.fam),
    ]);
    if (!userActive || !familyActive) throw Errors.unauthenticated('Session is no longer valid');

    let tenant: AuthContext['tenant'] = null;
    if (claims.tid && claims.mid) {
      tenant = await this.memberships.verifyTokenMembership(claims.sub, claims.tid, claims.mid);
      // Membership was suspended/removed or tenant suspended: force the client to refresh,
      // which re-resolves the user's tenant context from scratch.
      if (!tenant) throw Errors.unauthenticated('Tenant access has changed; please refresh your session');
    }

    req.auth = { userId: claims.sub, familyId: claims.fam, tenant };
    return true;
  }
}
