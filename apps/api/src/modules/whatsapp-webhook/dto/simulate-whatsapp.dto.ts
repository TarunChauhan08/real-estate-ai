import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type SimulateWhatsAppRequest } from '@rea/shared-types';
import { IsOptional, IsString, Length } from 'class-validator';
import { PhoneNumber } from '../../../common/validation/phone';
import { Trim } from '../../../common/validation/transforms';

export class SimulateWhatsAppDto implements SimulateWhatsAppRequest {
  @PhoneNumber()
  from!: string;

  @ApiPropertyOptional({ example: 'Priya Verma', description: 'WhatsApp profile name' })
  @IsOptional()
  @Trim()
  @IsString()
  @Length(1, 120)
  name?: string;

  @ApiProperty({ example: 'Hi, 2 BHK in Noida under 70 lakh?', maxLength: 2000 })
  @Trim()
  @IsString()
  @Length(1, 2000)
  text!: string;
}
