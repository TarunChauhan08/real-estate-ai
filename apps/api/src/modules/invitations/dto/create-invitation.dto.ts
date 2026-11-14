import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../../common/validation/transforms';
import { MembershipRole } from '../../../generated/prisma/enums';

export class CreateInvitationDto {
  @ApiProperty({ example: 'agent@noidahomes.in' })
  @NormalizeEmail()
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email: string;

  @ApiProperty({ enum: MembershipRole, description: 'OWNER cannot be granted by invitation' })
  @IsEnum(MembershipRole)
  role: MembershipRole;
}
