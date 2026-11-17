import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type ConversationDto,
  type ConversationSummaryDto,
  type ConversationTurnDto,
  Permission,
} from '@rea/shared-types';
import { CurrentAuth, CurrentTenant } from '../../common/decorators/current-auth.decorator';
import { Errors } from '../../common/errors/app.exception';
import { type Paginated } from '../../common/interceptors/response-envelope.interceptor';
import { type AuthContext, type TenantContext } from '../auth/auth-context';
import { RequirePermissions } from '../roles/require-permissions.decorator';
import { ConversationsService } from './conversations.service';
import { ConversationQueryDto } from './dto/conversation-query.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { StartConversationDto } from './dto/start-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

const uuidPipe = new ParseUUIDPipe({ exceptionFactory: () => Errors.notFound('Conversation') });

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  @RequirePermissions(Permission.CONVERSATIONS_READ)
  @ApiOperation({ summary: 'List conversations, most recent activity first' })
  list(
    @CurrentTenant() ctx: TenantContext,
    @Query() query: ConversationQueryDto,
  ): Promise<Paginated<ConversationSummaryDto>> {
    return this.conversations.list(ctx, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.CONVERSATIONS_READ)
  @ApiOperation({ summary: 'Get a conversation with its messages' })
  get(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', uuidPipe) id: string,
  ): Promise<ConversationDto> {
    return this.conversations.get(ctx, id);
  }

  @Post()
  @RequirePermissions(Permission.CONVERSATIONS_WRITE, Permission.LEADS_WRITE)
  @ApiOperation({ summary: 'Start a test chat with the AI employee, as an existing or new buyer' })
  start(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Body() dto: StartConversationDto,
  ): Promise<ConversationDto> {
    return this.conversations.start(ctx, auth.userId, dto);
  }

  @Post(':id/messages')
  @HttpCode(200)
  @RequirePermissions(Permission.CONVERSATIONS_WRITE)
  @ApiOperation({ summary: 'Send a message. Buyer messages in test chats get an AI reply.' })
  send(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Param('id', uuidPipe) id: string,
    @Body() dto: SendMessageDto,
  ): Promise<ConversationTurnDto> {
    return this.conversations.sendMessage(ctx, auth.userId, id, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.CONVERSATIONS_WRITE)
  @ApiOperation({ summary: 'Turn the AI on/off for this conversation, or close/re-open it' })
  update(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Param('id', uuidPipe) id: string,
    @Body() dto: UpdateConversationDto,
  ): Promise<ConversationDto> {
    return this.conversations.update(ctx, auth.userId, id, dto);
  }
}
