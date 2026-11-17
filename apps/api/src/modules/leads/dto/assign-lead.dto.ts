import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, ValidateIf } from 'class-validator';

export class AssignLeadDto {
  @ApiProperty({ nullable: true, description: 'Membership ID, or null to unassign' })
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  membershipId!: string | null;
}
