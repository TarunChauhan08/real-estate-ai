import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MAX_PRICE_RUPEES } from '@rea/shared-types';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Max,
  Min,
} from 'class-validator';
import { CleanStringList, EmptyToNull, Trim } from '../../../common/validation/transforms';
import { ListingType, PossessionStatus, PropertyType } from '../../../generated/prisma/enums';
import { OptionalText } from '../../tenants/dto/profile-fields';

/** Optional whole number; `null` clears it on update. */
const OptionalInt = (min: number, max: number, example?: number): PropertyDecorator =>
  applyDecorators(
    ApiPropertyOptional({ nullable: true, minimum: min, maximum: max, example }),
    IsOptional(),
    IsInt(),
    Min(min),
    Max(max),
  );

export class CreatePropertyDto {
  @ApiProperty({ example: '3 BHK in Sector 150, Noida', minLength: 3, maxLength: 160 })
  @Trim()
  @IsString()
  @Length(3, 160)
  title!: string;

  @OptionalText(160, 'Sunrise Heights')
  projectName?: string | null;

  @ApiProperty({ enum: PropertyType })
  @IsEnum(PropertyType)
  propertyType!: PropertyType;

  @ApiPropertyOptional({ enum: ListingType, default: ListingType.SALE })
  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType;

  @OptionalInt(0, 20, 3)
  bedrooms?: number | null;

  @OptionalInt(0, 20, 2)
  bathrooms?: number | null;

  @OptionalInt(1, 1_000_000, 1250)
  carpetAreaSqft?: number | null;

  @ApiProperty({
    minimum: 1,
    maximum: MAX_PRICE_RUPEES,
    example: 8_500_000,
    description: 'Whole rupees. Sale price, or monthly rent for RENT listings.',
  })
  @IsInt()
  @Min(1)
  @Max(MAX_PRICE_RUPEES)
  price!: number;

  @OptionalText(120, 'Sector 150')
  locality?: string | null;

  @ApiProperty({ example: 'Noida', minLength: 2, maxLength: 100 })
  @Trim()
  @IsString()
  @Length(2, 100)
  city!: string;

  @OptionalText(100, 'Uttar Pradesh')
  state?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '201310' })
  @EmptyToNull()
  @IsOptional()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'Enter a valid 6-digit pincode' })
  pincode?: string | null;

  @ApiPropertyOptional({ enum: PossessionStatus, nullable: true })
  @IsOptional()
  @IsEnum(PossessionStatus)
  possessionStatus?: PossessionStatus | null;

  @ApiPropertyOptional({ nullable: true, example: '2027-12-31', description: 'YYYY-MM-DD' })
  @EmptyToNull()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use the format YYYY-MM-DD' })
  possessionDate?: string | null;

  @OptionalText(60, 'UPRERAPRJ123456')
  reraNumber?: string | null;

  @ApiPropertyOptional({ type: [String], example: ['Swimming pool', 'Gym', 'Power backup'] })
  @IsOptional()
  @CleanStringList()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  amenities?: string[];

  @OptionalText(5000)
  description?: string | null;
}
