import { Controller, Post, Delete, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@suggar-daddy/common';
import { StripeSubscriptionService } from './stripe-subscription.service';

@ApiTags('Stripe Subscriptions')
@ApiBearerAuth()
@Controller('stripe/subscriptions')
export class StripeSubscriptionController {
  constructor(private stripeSubService: StripeSubscriptionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subscription' })
  async createSubscription(
    @CurrentUser('userId') userId: string,
    @Body() body: { tierId: string; stripeCustomerId: string },
  ) {
    return this.stripeSubService.createSubscription(
      userId,
      body.tierId,
      body.stripeCustomerId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.stripeSubService.cancelSubscription(id, userId);
  }

  @Patch(':id/upgrade')
  @ApiOperation({ summary: 'Upgrade subscription tier' })
  async upgradeSubscription(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() body: { newTierId: string },
  ) {
    return this.stripeSubService.upgradeSubscription(id, userId, body.newTierId);
  }
}