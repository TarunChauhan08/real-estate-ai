import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn } from 'class-validator';
import { MembershipRole, MembershipStatus } from '../../../generated/prisma/enums';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: MembershipRole })
  @IsEnum(MembershipRole)
  role: MembershipRole;
}

/** Members are activated or suspended; INVITED is managed by the invitation flow. */
export class UpdateMemberStatusDto {
  @ApiProperty({ enum: [MembershipStatus.ACTIVE, MembershipStatus.SUSPENDED] })
  @IsIn([MembershipStatus.ACTIVE, MembershipStatus.SUSPENDED])
  status: typeof MembershipStatus.ACTIVE | typeof MembershipStatus.SUSPENDED;
}
