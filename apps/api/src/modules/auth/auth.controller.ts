import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type MeResponse, type SessionResponse } from '@rea/shared-types';
import { type Request, type Response } from 'express';
import { CurrentAuth } from '../../common/decorators/current-auth.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Errors } from '../../common/errors/app.exception';
import { TrustedOriginGuard } from '../../common/guards/trusted-origin.guard';
import { StrictRateLimit } from '../../common/rate-limit/rate-limit';
import { AppConfigService } from '../../config/app-config.service';
import { type AuthContext } from './auth-context';
import { REFRESH_COOKIE, clearRefreshCookie, setRefreshCookie } from './auth-cookies';
import { AuthService, type IssuedAuth } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SwitchTenantDto } from './dto/switch-tenant.dto';
import { TokenService } from './token.service';

function readRefreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' && value.length > 0 && value.length <= 128 ? value : undefined;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @StrictRateLimit()
  @Post('register')
  @ApiOperation({
    summary:
      'Register a business: creates owner user, tenant, profile, settings and OWNER membership',
  })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponse> {
    return this.respond(res, await this.auth.register(dto, { userAgent: req.get('user-agent') }));
  }

  @Public()
  @StrictRateLimit()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponse> {
    return this.respond(res, await this.auth.login(dto, { userAgent: req.get('user-agent') }));
  }

  // Not under the strict credential limit: every page load refreshes, and the token is a
  // 256-bit random value that cannot be guessed. The global limit still applies.
  @Public()
  @UseGuards(TrustedOriginGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('rea_refresh')
  @ApiOperation({ summary: 'Rotate the refresh-token cookie and issue a new access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponse> {
    const token = readRefreshCookie(req);
    if (!token) throw Errors.unauthenticated('No refresh token');
    try {
      return this.respond(
        res,
        await this.auth.refresh(token, { userAgent: req.get('user-agent') }),
      );
    } catch (error) {
      // Keep the cookie on a benign concurrent-refresh race; clear it on any real failure.
      const code = (error as { code?: string }).code;
      if (code !== 'REFRESH_RACE') clearRefreshCookie(res, this.config);
      throw error;
    }
  }

  @Public()
  @UseGuards(TrustedOriginGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth('rea_refresh')
  @ApiOperation({ summary: 'Revoke the current login session and clear the refresh cookie' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(readRefreshCookie(req));
    clearRefreshCookie(res, this.config);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user, active tenant and all usable memberships' })
  me(@CurrentAuth() auth: AuthContext): Promise<MeResponse> {
    return this.auth.me(auth);
  }

  @Post('switch-tenant')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Switch the active tenant to another business the user belongs to' })
  switchTenant(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: SwitchTenantDto,
  ): Promise<SessionResponse> {
    return this.auth.switchTenant(auth, dto.tenantId);
  }

  private respond(res: Response, issued: IssuedAuth): SessionResponse {
    setRefreshCookie(res, this.config, issued.refreshToken, this.tokens.refreshTtlMs);
    res.setHeader('Cache-Control', 'no-store');
    return issued.session;
  }
}
