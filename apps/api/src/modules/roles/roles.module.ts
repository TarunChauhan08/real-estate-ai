import { Module } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';

/** Role-based authorization. Future modules declare permissions with @RequirePermissions(). */
@Module({
  providers: [PermissionsGuard],
  exports: [PermissionsGuard],
})
export class RolesModule {}
