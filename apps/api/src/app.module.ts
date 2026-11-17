import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { rateLimitOptions } from './common/rate-limit/rate-limit';
import { AppConfigService } from './config/app-config.service';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { PermissionsGuard } from './modules/roles/permissions.guard';
import { RolesModule } from './modules/roles/roles.module';
import { TenantsModule } from './modules/tenants/tenants.module';

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRootAsync({ inject: [AppConfigService], useFactory: rateLimitOptions }),
    DatabaseModule,
    AuditModule,
    MembershipsModule,
    AuthModule,
    RolesModule,
    TenantsModule,
    InvitationsModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [
    // Global guards run in this order for every request:
    // 1. rate limit  2. authenticate (deny by default)  3. authorize by role permissions.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
