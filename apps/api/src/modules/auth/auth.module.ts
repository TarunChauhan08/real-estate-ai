import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MembershipsModule } from '../memberships/memberships.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PasswordService } from './password.service';
import { SessionsService } from './sessions.service';
import { TokenService } from './token.service';

@Module({
  imports: [JwtModule.register({}), MembershipsModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, SessionsService, JwtAuthGuard],
  exports: [AuthService, PasswordService, SessionsService, TokenService, JwtAuthGuard],
})
export class AuthModule {}
