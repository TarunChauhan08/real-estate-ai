import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { Trim } from '../../../common/validation/transforms';

export const SENDER_ROLES = ['BUYER', 'AGENT'] as const;
export type SenderRole = (typeof SENDER_ROLES)[number];

export class SendMessageDto {
  @ApiProperty({ example: 'Hi, mujhe Noida mein 3 BHK chahiye. Budget 85 lakh.', maxLength: 2000 })
  @Trim()
  @IsString()
  @Length(1, 2000)
  content!: string;

  @ApiPropertyOptional({
    enum: SENDER_ROLES,
    default: 'BUYER',
    description:
      'BUYER (test chats only) gets an AI reply. AGENT is a team member writing in the conversation; the AI stays quiet.',
  })
  @IsOptional()
  @IsIn(SENDER_ROLES)
  as?: SenderRole;
}
