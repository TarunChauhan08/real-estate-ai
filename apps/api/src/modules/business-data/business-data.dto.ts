import { ApiProperty } from '@nestjs/swagger';
import { type RequestBusinessDeletionRequest } from '@rea/shared-types';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RequestDeletionDto implements RequestBusinessDeletionRequest {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;

  @ApiProperty({ description: 'The business name, typed exactly' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  confirmBusinessName!: string;
}
