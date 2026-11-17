import { type CookieOptions, type Response } from 'express';
import { API_PREFIX } from '../../common/constants';
import { type AppConfigService } from '../../config/app-config.service';

export const REFRESH_COOKIE = 'rea_refresh';
/** The refresh cookie is only ever sent to the auth endpoints. */
const REFRESH_COOKIE_PATH = `/${API_PREFIX}/auth`;

function baseOptions(config: AppConfigService): CookieOptions {
  return {
    httpOnly: true,
    secure: config.get('COOKIE_SECURE'),
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    domain: config.get('COOKIE_DOMAIN'),
  };
}

export function setRefreshCookie(res: Response, config: AppConfigService, token: string, maxAgeMs: number): void {
  res.cookie(REFRESH_COOKIE, token, { ...baseOptions(config), maxAge: maxAgeMs });
}

export function clearRefreshCookie(res: Response, config: AppConfigService): void {
  res.clearCookie(REFRESH_COOKIE, baseOptions(config));
}
