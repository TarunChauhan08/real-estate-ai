import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type SendVerificationResponse } from '@rea/shared-types';
import { CurrentAuth } from '../../common/decorators/current-auth.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { StrictRateLimit } from '../../common/rate-limit/rate-limit';
import { AccountService } from './account.service';
import { type AuthContext } from './auth-context';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  TokenDto,
} from './dto/account.dto';

@ApiTags('auth')
@Controller('auth')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Public()
  @StrictRateLimit()
  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Email a password-reset link. Same answer whether or not the account exists.',
  })
  async forgot(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.account.requestPasswordReset(dto.email);
  }

  @Public()
  @StrictRateLimit()
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set a new password with the emailed token; signs out everywhere' })
  async reset(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.account.resetPassword(dto.token, dto.password);
  }

  @StrictRateLimit()
  @Post('password/change')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password; other devices are signed out' })
  async change(@CurrentAuth() auth: AuthContext, @Body() dto: ChangePasswordDto): Promise<void> {
    await this.account.changePassword(
      auth.userId,
      dto.currentPassword,
      dto.newPassword,
      auth.familyId,
    );
  }

  @Public()
  @StrictRateLimit()
  @Post('email/verify')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Confirm the email address with the emailed token' })
  async verify(@Body() dto: TokenDto): Promise<void> {
    await this.account.verifyEmail(dto.token);
  }

  @StrictRateLimit()
  @Post('email/send-verification')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send (again) the email-verification link' })
  sendVerification(@CurrentAuth() auth: AuthContext): Promise<SendVerificationResponse> {
    return this.account.sendVerification(auth.userId);
  }
}
