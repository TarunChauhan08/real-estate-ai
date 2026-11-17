import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ConversationStatus } from '../../../generated/prisma/enums';

export class UpdateConversationDto {
  @ApiPropertyOptional({ description: 'false = a human takes over and the AI stays silent' })
  @IsOptional()
  @IsBoolean()
  aiEnabled?: boolean;

  @ApiPropertyOptional({ enum: ConversationStatus })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;
}
