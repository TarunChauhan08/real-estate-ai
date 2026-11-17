import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../../../common/validation/transforms';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

export class InvitationTokenDto {
  @ApiProperty({ description: 'Token from the invitation link' })
  @IsString()
  @Matches(TOKEN_PATTERN, { message: 'Invalid invitation token' })
  token: string;
}

export class AcceptInvitationDto extends InvitationTokenDto {
  @ApiPropertyOptional({ description: 'Required when the invitee does not have an account yet' })
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiProperty({
    format: 'password',
    description: 'New users choose a password (policy enforced); existing users confirm their current password',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}
