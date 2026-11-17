import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type ImportListingsRequest } from '@rea/shared-types';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ImportListingsDto implements ImportListingsRequest {
  @ApiProperty({ description: 'CSV text; the first row holds the column headers' })
  @IsString()
  @MinLength(1)
  @MaxLength(2_200_000)
  csv!: string;

  @ApiPropertyOptional({ default: false, description: 'Validate only; create nothing' })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
