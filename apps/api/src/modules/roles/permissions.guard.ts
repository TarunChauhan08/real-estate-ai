import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission, type Permission } from '@rea/shared-types';
import { type Request } from 'express';
import { Errors } from '../../common/errors/app.exception';
import { PERMISSIONS_KEY } from './require-permissions.decorator';

/**
 * Global role-based authorization. Runs after JwtAuthGuard, so `req.auth.tenant.role`
 * has just been read from the membership row in the database.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const auth = context.switchToHttp().getRequest<Request>().auth;
    if (!auth) throw Errors.unauthenticated();
    if (!auth.tenant) throw Errors.forbidden('No active business membership');

    const role = auth.tenant.role;
    if (!required.every((permission) => hasPermission(role, permission))) throw Errors.forbidden();
    return true;
  }
}
