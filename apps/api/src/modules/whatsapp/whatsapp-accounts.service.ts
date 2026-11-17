import { Inject, Injectable, Logger } from '@nestjs/common';
import { type WhatsAppStatusDto } from '@rea/shared-types';
import { Errors } from '../../common/errors/app.exception';
import { type SecretBox } from '../../common/utils/secret-box';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-actions';
import { type TenantContext } from '../auth/auth-context';
import {
  WHATSAPP_CLIENT,
  type WhatsAppClient,
  type WhatsAppCredentials,
  WhatsAppError,
} from './client/whatsapp-client';
import { type ConnectWhatsAppDto } from './dto/connect-whatsapp.dto';

export const SECRET_BOX = Symbol('SECRET_BOX');

export interface ResolvedAccount {
  tenantId: string;
  phoneNumberId: string;
  /** Null if the stored token cannot be decrypted (encryption key changed): reconnect needed. */
  credentials: WhatsAppCredentials | null;
}

/** One WhatsApp Business number per business: connect, disconnect, and look up credentials. */
@Injectable()
export class WhatsAppAccountsService {
  private readonly logger = new Logger(WhatsAppAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
    @Inject(WHATSAPP_CLIENT) private readonly client: WhatsAppClient,
    @Inject(SECRET_BOX) private readonly secrets: SecretBox,
  ) {}

  get simulatorEnabled(): boolean {
    return this.client.name === 'fake' && !this.config.isProduction;
  }

  async status(tenantId: string): Promise<WhatsAppStatusDto> {
    const account = await this.prisma.whatsAppAccount.findUnique({ where: { tenantId } });
    return {
      provider: this.client.name,
      simulatorEnabled: this.simulatorEnabled,
      account: account
        ? {
            phoneNumberId: account.phoneNumberId,
            wabaId: account.wabaId,
            displayPhoneNumber: account.displayPhoneNumber,
            connectedAt: account.createdAt.toISOString(),
            lastInboundAt: account.lastInboundAt?.toISOString() ?? null,
          }
        : null,
    };
  }

  /** Connects (or replaces) the business's WhatsApp number after checking the token works. */
  async connect(
    ctx: TenantContext,
    actorId: string,
    dto: ConnectWhatsAppDto,
  ): Promise<WhatsAppStatusDto> {
    try {
      await this.client.verify({ phoneNumberId: dto.phoneNumberId, accessToken: dto.accessToken });
    } catch (error) {
      const reason =
        error instanceof WhatsAppError
          ? error.message
          : 'Could not reach WhatsApp to check the token.';
      throw Errors.badRequest('WHATSAPP_VERIFICATION_FAILED', reason);
    }

    const data = {
      phoneNumberId: dto.phoneNumberId,
      wabaId: dto.wabaId ?? null,
      displayPhoneNumber: dto.displayPhoneNumber,
      accessTokenEncrypted: this.secrets.encrypt(dto.accessToken),
      connectedById: actorId,
    };
    try {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.whatsAppAccount.findUnique({ where: { tenantId: ctx.tenantId } });
        if (existing) {
          await tx.whatsAppAccount.update({
            where: { id: existing.id },
            // A different number starts fresh; the same number keeps its history.
            data: {
              ...data,
              lastInboundAt: existing.phoneNumberId === dto.phoneNumberId ? undefined : null,
            },
          });
        } else {
          await tx.whatsAppAccount.create({ data: { ...data, tenantId: ctx.tenantId } });
        }
        await this.audit.record(
          {
            tenantId: ctx.tenantId,
            actorId,
            action: AuditAction.WHATSAPP_CONNECTED,
            entityType: 'whatsapp_account',
            metadata: {
              phoneNumberId: dto.phoneNumberId,
              displayPhoneNumber: dto.displayPhoneNumber,
              replaced: existing ? existing.phoneNumberId : null,
            },
          },
          tx,
        );
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw Errors.conflict(
          'WHATSAPP_NUMBER_IN_USE',
          'This WhatsApp number is already connected to another business.',
        );
      }
      throw error;
    }
    return this.status(ctx.tenantId);
  }

  async disconnect(ctx: TenantContext, actorId: string): Promise<WhatsAppStatusDto> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.whatsAppAccount.findUnique({ where: { tenantId: ctx.tenantId } });
      if (!existing) throw Errors.notFound('WhatsApp connection');
      // The row only holds connection settings; conversations and messages are kept.
      await tx.whatsAppAccount.delete({ where: { id: existing.id } });
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: AuditAction.WHATSAPP_DISCONNECTED,
          entityType: 'whatsapp_account',
          metadata: { phoneNumberId: existing.phoneNumberId },
        },
        tx,
      );
    });
    return this.status(ctx.tenantId);
  }

  /** Webhook routing: which business owns this Meta phone number ID? */
  async resolveByPhoneNumberId(phoneNumberId: string): Promise<ResolvedAccount | null> {
    const account = await this.prisma.whatsAppAccount.findUnique({ where: { phoneNumberId } });
    return account ? this.toResolved(account) : null;
  }

  async resolveByTenant(tenantId: string): Promise<ResolvedAccount | null> {
    const account = await this.prisma.whatsAppAccount.findUnique({ where: { tenantId } });
    return account ? this.toResolved(account) : null;
  }

  async touchInbound(tenantId: string, at: Date): Promise<void> {
    await this.prisma.whatsAppAccount.updateMany({
      where: { tenantId, OR: [{ lastInboundAt: null }, { lastInboundAt: { lt: at } }] },
      data: { lastInboundAt: at },
    });
  }

  private toResolved(account: {
    tenantId: string;
    phoneNumberId: string;
    accessTokenEncrypted: string;
  }): ResolvedAccount {
    try {
      return {
        tenantId: account.tenantId,
        phoneNumberId: account.phoneNumberId,
        credentials: {
          phoneNumberId: account.phoneNumberId,
          accessToken: this.secrets.decrypt(account.accessTokenEncrypted),
        },
      };
    } catch {
      // Happens if DATA_ENCRYPTION_KEY changed. The business must reconnect WhatsApp.
      this.logger.error(
        `Cannot decrypt the WhatsApp token for tenant ${account.tenantId}; it must be reconnected`,
      );
      return {
        tenantId: account.tenantId,
        phoneNumberId: account.phoneNumberId,
        credentials: null,
      };
    }
  }
}
