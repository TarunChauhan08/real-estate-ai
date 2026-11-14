import { ApiPropertyOptional } from '@nestjs/swagger';
import { type InvitationStatus } from '@rea/shared-types';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export const INVITATION_STATUSES: InvitationStatus[] = [
  'PENDING',
  'ACCEPTED',
  'EXPIRED',
  'REVOKED',
];

export class InvitationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: INVITATION_STATUSES })
  @IsOptional()
  @IsIn(INVITATION_STATUSES)
  status?: InvitationStatus;
}
