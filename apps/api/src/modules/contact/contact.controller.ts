import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { StrictRateLimit } from '../../common/rate-limit/rate-limit';
import { ContactRequestDto } from './contact.dto';
import { ContactService } from './contact.service';

@ApiTags('public')
@Controller('public/contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @StrictRateLimit()
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Demo / contact request from the public website' })
  async submit(@Body() dto: ContactRequestDto): Promise<void> {
    await this.contact.submit(dto);
  }
}
