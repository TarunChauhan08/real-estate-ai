import { ApiPropertyOptional } from '@nestjs/swagger';
import { MAX_PRICE_RUPEES } from '@rea/shared-types';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { Trim } from '../../../common/validation/transforms';
import { ListingType, PropertyStatus, PropertyType } from '../../../generated/prisma/enums';

export const PROPERTY_SORTS = ['newest', 'price_asc', 'price_desc'] as const;
export type PropertySort = (typeof PROPERTY_SORTS)[number];

export class PropertyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search title, project, locality or city' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    enum: PropertyStatus,
    description: 'Archived listings are hidden unless you ask for status=ARCHIVED',
  })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({ enum: ListingType })
  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  bedrooms?: number;

  @ApiPropertyOptional({ description: 'Minimum price in whole rupees' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_RUPEES)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price in whole rupees' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_RUPEES)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: PROPERTY_SORTS, default: 'newest' })
  @IsOptional()
  @IsIn(PROPERTY_SORTS)
  sort: PropertySort = 'newest';
}
