import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MembershipsModule } from '../memberships/memberships.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PasswordService } from './password.service';
import { SessionsService } from './sessions.service';
import { TokenService } from './token.service';

@Module({
  imports: [JwtModule.register({}), MembershipsModule],
  controllers: [AuthController, AccountController],
  providers: [
    AuthService,
    AccountService,
    PasswordService,
    TokenService,
    SessionsService,
    JwtAuthGuard,
  ],
  exports: [
    AuthService,
    AccountService,
    PasswordService,
    SessionsService,
    TokenService,
    JwtAuthGuard,
  ],
})
export class AuthModule {}
