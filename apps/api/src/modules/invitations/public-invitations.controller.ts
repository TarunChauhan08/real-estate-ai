import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type InvitationPreview, type SessionResponse } from '@rea/shared-types';
import { type Request, type Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { StrictRateLimit } from '../../common/rate-limit/rate-limit';
import { AppConfigService } from '../../config/app-config.service';
import { setRefreshCookie } from '../auth/auth-cookies';
import { TokenService } from '../auth/token.service';
import { AcceptInvitationDto, InvitationTokenDto } from './dto/accept-invitation.dto';
import { InvitationsService } from './invitations.service';

/** Endpoints used by invitees, who are not (yet) members. The token is the credential. */
@ApiTags('invitations')
@Controller('invitations')
export class PublicInvitationsController {
  constructor(
    private readonly invitations: InvitationsService,
    private readonly tokens: TokenService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @StrictRateLimit()
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Describe an invitation (business, email, role) from its token' })
  preview(@Body() dto: InvitationTokenDto): Promise<InvitationPreview> {
    return this.invitations.preview(dto.token);
  }

  @Public()
  @StrictRateLimit()
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation; creates the account if needed and signs the user in' })
  async accept(
    @Body() dto: AcceptInvitationDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponse> {
    const issued = await this.invitations.accept(dto, { userAgent: req.get('user-agent') });
    setRefreshCookie(res, this.config, issued.refreshToken, this.tokens.refreshTtlMs);
    res.setHeader('Cache-Control', 'no-store');
    return issued.session;
  }
}
