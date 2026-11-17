import { Inject, Injectable, Logger } from '@nestjs/common';
import { Errors } from '../../common/errors/app.exception';
import { generateToken, sha256Hex } from '../../common/utils/crypto';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../database/prisma.service';
import { UserStatus, UserTokenPurpose } from '../../generated/prisma/enums';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-actions';
import { MAILER, type Mailer } from '../mail/mailer';
import { passwordResetEmail, verifyEmailEmail } from '../mail/templates';
import { PasswordService } from './password.service';

/**
 * Self-service account security: forgotten passwords, email verification, password changes.
 *
 * - Tokens are 256-bit random values; only their SHA-256 is stored, and each works once.
 * - "Forgot password" answers the same way whether or not the email exists, so it cannot be
 *   used to find out who has an account.
 * - Resetting or changing a password signs the user out everywhere else.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, status: true },
    });
    if (!user || user.status !== UserStatus.ACTIVE) return;

    const minutes = this.config.get('PASSWORD_RESET_TTL_MINUTES');
    const token = await this.issueToken(user.id, UserTokenPurpose.PASSWORD_RESET, minutes * 60_000);
    await this.sendSafely(
      passwordResetEmail({
        to: user.email,
        name: user.name,
        url: `${this.config.get('WEB_APP_URL')}/reset-password#token=${token}`,
        minutes,
      }),
    );
    await this.audit.recordSafely({
      tenantId: null,
      actorId: user.id,
      action: AuditAction.AUTH_PASSWORD_RESET_REQUESTED,
      entityType: 'user',
      entityId: user.id,
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const passwordHash = await this.passwords.hash(password);
    await this.prisma.$transaction(async (tx) => {
      const userId = await this.consumeToken(tx, token, UserTokenPurpose.PASSWORD_RESET);
      await tx.user.update({
        where: { id: userId },
        // Following a link sent to the inbox also proves the address is theirs.
        data: { passwordHash },
      });
      await tx.user.updateMany({
        where: { id: userId, emailVerifiedAt: null },
        data: { emailVerifiedAt: new Date() },
      });
      await this.signOutEverywhere(tx, userId);
      await this.audit.record(
        {
          tenantId: null,
          actorId: userId,
          action: AuditAction.AUTH_PASSWORD_RESET,
          entityType: 'user',
          entityId: userId,
        },
        tx,
      );
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    keepFamilyId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user || !(await this.passwords.verify(user.passwordHash, currentPassword))) {
      throw Errors.validation([
        { field: 'currentPassword', message: 'Your current password is not correct' },
      ]);
    }
    if (currentPassword === newPassword) {
      throw Errors.validation([
        { field: 'newPassword', message: 'Choose a password you have not used here' },
      ]);
    }
    const passwordHash = await this.passwords.hash(newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      // Other devices are signed out; this one stays signed in.
      await this.signOutEverywhere(tx, userId, keepFamilyId);
      await this.audit.record(
        {
          tenantId: null,
          actorId: userId,
          action: AuditAction.AUTH_PASSWORD_CHANGED,
          entityType: 'user',
          entityId: userId,
        },
        tx,
      );
    });
  }

  /** Sends (or re-sends) the verification email. Already verified: nothing to do. */
  async sendVerification(userId: string): Promise<{ alreadyVerified: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, emailVerifiedAt: true },
    });
    if (!user) throw Errors.unauthenticated();
    if (user.emailVerifiedAt) return { alreadyVerified: true };

    const hours = this.config.get('EMAIL_VERIFICATION_TTL_HOURS');
    const token = await this.issueToken(
      user.id,
      UserTokenPurpose.EMAIL_VERIFICATION,
      hours * 3_600_000,
    );
    await this.sendSafely(
      verifyEmailEmail({
        to: user.email,
        name: user.name,
        url: `${this.config.get('WEB_APP_URL')}/verify-email#token=${token}`,
        hours,
      }),
    );
    return { alreadyVerified: false };
  }

  async verifyEmail(token: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const userId = await this.consumeToken(tx, token, UserTokenPurpose.EMAIL_VERIFICATION);
      await tx.user.updateMany({
        where: { id: userId, emailVerifiedAt: null },
        data: { emailVerifiedAt: new Date() },
      });
      await this.audit.record(
        {
          tenantId: null,
          actorId: userId,
          action: AuditAction.AUTH_EMAIL_VERIFIED,
          entityType: 'user',
          entityId: userId,
        },
        tx,
      );
    });
  }

  /** Creates a new one-time token, invalidating older unused ones for the same purpose. */
  private async issueToken(
    userId: string,
    purpose: UserTokenPurpose,
    ttlMs: number,
  ): Promise<string> {
    const token = generateToken();
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.userToken.updateMany({
        where: { userId, purpose, usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.userToken.create({
        data: {
          userId,
          purpose,
          tokenHash: sha256Hex(token),
          expiresAt: new Date(now.getTime() + ttlMs),
        },
      }),
    ]);
    return token;
  }

  /** Marks the token used (atomically, so it works exactly once) and returns its user. */
  private async consumeToken(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    token: string,
    purpose: UserTokenPurpose,
  ): Promise<string> {
    const invalid = () =>
      Errors.badRequest(
        'INVALID_OR_EXPIRED_LINK',
        'This link is invalid or has expired. Ask for a new one.',
      );
    const row = await tx.userToken.findUnique({
      where: { tokenHash: sha256Hex(token) },
      include: { user: { select: { status: true } } },
    });
    if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt < new Date())
      throw invalid();
    if (row.user.status !== UserStatus.ACTIVE) throw invalid();
    const claimed = await tx.userToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw invalid();
    return row.userId;
  }

  private async signOutEverywhere(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    userId: string,
    exceptFamilyId?: string,
  ): Promise<void> {
    await tx.refreshSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptFamilyId ? { familyId: { not: exceptFamilyId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
  }

  /** Email problems are logged, never shown: the response must not depend on them. */
  private async sendSafely(email: Parameters<Mailer['send']>[0]): Promise<void> {
    try {
      await this.mailer.send(email);
    } catch (error) {
      this.logger.error(`Could not send "${email.subject}": ${(error as Error).message}`);
    }
  }
}
