import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type Request } from 'express';
import { type AuthContext, type TenantContext } from '../../modules/auth/auth-context';
import { Errors } from '../errors/app.exception';

/** Injects the authenticated principal. */
export const CurrentAuth = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthContext => {
  const auth = ctx.switchToHttp().getRequest<Request>().auth;
  if (!auth) throw Errors.unauthenticated();
  return auth;
});

/**
 * Injects the active tenant context resolved from the authenticated membership.
 * Throws 403 when the user has no active tenant — handlers can rely on a non-null value.
 */
export const CurrentTenant = createParamDecorator((_data: unknown, ctx: ExecutionContext): TenantContext => {
  const auth = ctx.switchToHttp().getRequest<Request>().auth;
  if (!auth) throw Errors.unauthenticated();
  if (!auth.tenant) throw Errors.forbidden('No active business membership');
  return auth.tenant;
});
