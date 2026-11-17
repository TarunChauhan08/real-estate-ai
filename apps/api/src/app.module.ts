import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { rateLimitOptions } from './common/rate-limit/rate-limit';
import { AppConfigService } from './config/app-config.service';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AiModule } from './modules/ai/ai.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { LeadsModule } from './modules/leads/leads.module';
import { PermissionsGuard } from './modules/roles/permissions.guard';
import { PropertiesModule } from './modules/properties/properties.module';
import { RolesModule } from './modules/roles/roles.module';
import { SiteVisitsModule } from './modules/site-visits/site-visits.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { WhatsAppWebhookModule } from './modules/whatsapp-webhook/whatsapp-webhook.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { ContactModule } from './modules/contact/contact.module';
import { MailModule } from './modules/mail/mail.module';

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
    PropertiesModule,
    LeadsModule,
    AiModule,
    MailModule,
    ContactModule,
    WhatsAppModule,
    SiteVisitsModule,
    ConversationsModule,
    WhatsAppWebhookModule,
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
