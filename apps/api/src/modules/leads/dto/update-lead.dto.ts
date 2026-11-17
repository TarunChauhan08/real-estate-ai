import { PartialType } from '@nestjs/swagger';
import { CreateLeadDto } from './create-lead.dto';

/** Status and assignment have their own endpoints so they get their own permissions and audit. */
export class UpdateLeadDto extends PartialType(CreateLeadDto) {}
