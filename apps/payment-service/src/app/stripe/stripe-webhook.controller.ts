import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@suggar-daddy/auth';
import { StripeService } from '@suggar-daddy/common';
import { StripeWebhookService } from './stripe-webhook.service';

@ApiTags('Stripe Webhooks')
@Controller('stripe/webhooks')
export class StripeWebhookController {
  constructor(
    private stripeService: StripeService,
    private webhookService: StripeWebhookService,
  ) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing request body');
    }

    // Verify webhook signature
    const event = this.stripeService.constructWebhookEvent(rawBody, signature);

    // Handle different event types
    await this.webhookService.handleEvent(event);

    return { received: true };
  }
}