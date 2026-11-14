import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Errors } from '../../common/errors/app.exception';
import { generateToken, sha256Hex } from '../../common/utils/crypto';
import { AppConfigService } from '../../config/app-config.service';
import { type AccessTokenClaims } from './auth-context';

const ISSUER = 'rea-api';
const AUDIENCE = 'rea-web';

/** Issues and verifies short-lived access JWTs and opaque refresh tokens. */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  get accessTtlSeconds(): number {
    return this.config.get('JWT_ACCESS_TTL_SECONDS');
  }

  get refreshTtlMs(): number {
    return this.config.get('REFRESH_TOKEN_TTL_DAYS') * 24 * 60 * 60 * 1000;
  }

  signAccessToken(claims: AccessTokenClaims): Promise<string> {
    return this.jwt.signAsync(
      { fam: claims.fam, tid: claims.tid, mid: claims.mid },
      {
        subject: claims.sub,
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.accessTtlSeconds,
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithm: 'HS256',
      },
    );
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenClaims & { sub: string }>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ['HS256'],
      });
      if (typeof payload.sub !== 'string' || typeof payload.fam !== 'string')
        throw new Error('bad claims');
      return {
        sub: payload.sub,
        fam: payload.fam,
        tid: payload.tid ?? null,
        mid: payload.mid ?? null,
      };
    } catch {
      throw Errors.unauthenticated('Invalid or expired access token');
    }
  }

  /** New opaque refresh token and the hash that is persisted. The raw token is never stored. */
  createRefreshToken(): { token: string; tokenHash: string } {
    const token = generateToken(32);
    return { token, tokenHash: sha256Hex(token) };
  }

  hashRefreshToken(token: string): string {
    return sha256Hex(token);
  }
}
