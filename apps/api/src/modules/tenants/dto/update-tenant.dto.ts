import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../../../common/validation/transforms';

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'Noida Homes Brokerage' })
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;
}
