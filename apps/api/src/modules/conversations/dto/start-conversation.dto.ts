import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length, ValidateIf } from 'class-validator';
import { PhoneNumber } from '../../../common/validation/phone';
import { Trim } from '../../../common/validation/transforms';

/**
 * Start a test chat from the dashboard, as an existing lead (`leadId`)
 * or as a new buyer identified by phone (the lead is created or reused).
 */
export class StartConversationDto {
  @ApiPropertyOptional({ description: 'Existing lead to chat as' })
  @ValidateIf((o: StartConversationDto) => o.phone === undefined)
  @IsUUID()
  leadId?: string;

  @ApiPropertyOptional({ example: '98765 43210', description: 'Required when leadId is not given' })
  @ValidateIf((o: StartConversationDto) => o.leadId === undefined)
  @PhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ example: 'Rahul Sharma' })
  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 120)
  name?: string;
}
