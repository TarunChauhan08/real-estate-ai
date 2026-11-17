import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  type RawBodyRequest,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';
import { type Request, type Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { Errors } from '../../common/errors/app.exception';
import { AppConfigService } from '../../config/app-config.service';
import { isValidSignature, parseWebhook } from '../whatsapp/webhook/webhook-payload';
import { WhatsAppInboundService } from './whatsapp-inbound.service';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Meta's webhook endpoint: `https://<api-host>/api/v1/webhooks/whatsapp`.
 * Public (Meta has no user session) and protected instead by the app-secret signature.
 */
@ApiExcludeController()
@Public()
@SkipThrottle()
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  constructor(
    private readonly config: AppConfigService,
    private readonly inbound: WhatsAppInboundService,
  ) {}

  /** Subscription handshake: echo `hub.challenge` if the verify token matches. */
  @Get()
  verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() res: Response,
  ): void {
    const expected = this.config.get('WHATSAPP_VERIFY_TOKEN');
    if (mode !== 'subscribe' || !expected || !token || !challenge || !safeEqual(token, expected)) {
      throw Errors.forbidden('Webhook verification failed');
    }
    res.status(200).type('text/plain').send(challenge);
  }

  /**
   * Incoming messages and delivery statuses. Answers 200 straight away; processing (including
   * the AI reply) continues in the background so Meta does not time out and retry.
   */
  @Post()
  @HttpCode(200)
  receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() body: unknown,
  ): void {
    const secret = this.config.get('WHATSAPP_APP_SECRET');
    if (secret) {
      if (!isValidSignature(req.rawBody, signature, secret))
        throw Errors.unauthenticated('Invalid webhook signature');
    } else if (this.config.isProduction || this.config.get('WHATSAPP_PROVIDER') === 'cloud') {
      // Never accept unsigned webhooks where they could reach real businesses.
      throw Errors.unauthenticated('Webhook signing is not configured');
    }
    this.inbound.accept(parseWebhook(body));
  }
}
