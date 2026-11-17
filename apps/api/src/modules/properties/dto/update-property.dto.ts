import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PropertyStatus } from '../../../generated/prisma/enums';
import { CreatePropertyDto } from './create-property.dto';

/**
 * Every field is optional. Required columns (title, city, price, propertyType) cannot be
 * cleared: the service ignores `null` for them rather than letting the database reject it.
 */
export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {
  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;
}
