import { SetMetadata } from '@nestjs/common';
import { type Permission } from '@rea/shared-types';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Declares the permissions a route needs in the caller's *active tenant*.
 * Implies tenant context: routes using this reject users without an active membership.
 */
export const RequirePermissions = (
  ...permissions: Permission[]
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSIONS_KEY, permissions);
