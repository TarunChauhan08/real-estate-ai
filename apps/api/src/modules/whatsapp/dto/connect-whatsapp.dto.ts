import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type ConnectWhatsAppRequest } from '@rea/shared-types';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { PhoneNumber } from '../../../common/validation/phone';
import { Trim } from '../../../common/validation/transforms';

const META_ID = /^\d{5,32}$/;

export class ConnectWhatsAppDto implements ConnectWhatsAppRequest {
  @ApiProperty({
    example: '106540352242922',
    description: 'Phone number ID from Meta (WhatsApp → API Setup)',
  })
  @Trim()
  @IsString()
  @Matches(META_ID, { message: 'Phone number ID is the long number from Meta (digits only)' })
  phoneNumberId!: string;

  @ApiPropertyOptional({ example: '102290129340398', description: 'WhatsApp Business Account ID' })
  @IsOptional()
  @Trim()
  @IsString()
  @Matches(META_ID, { message: 'WhatsApp Business Account ID is digits only' })
  wabaId?: string;

  @PhoneNumber()
  displayPhoneNumber!: string;

  @ApiProperty({
    description: 'Permanent system-user access token. Stored encrypted; never returned.',
  })
  @IsString()
  @Length(8, 1024)
  @Matches(/^\S+$/, { message: 'Access token cannot contain spaces' })
  accessToken!: string;
}
