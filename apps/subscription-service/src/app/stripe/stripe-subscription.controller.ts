import { Controller, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '@suggar-daddy/auth';
import { StripeSubscriptionService } from './stripe-subscription.service';

class CreateSubscriptionDto {
  tierId: string;
  paymentMethodId: string;
}

@ApiTags('Stripe Subscriptions')
@ApiBearerAuth()
@Controller('stripe/subscriptions')
export class StripeSubscriptionController {
  constructor(private stripeSubscriptionService: StripeSubscriptionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  async createSubscription(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.stripeSubscriptionService.createSubscription(
      userId,
      dto.tierId,
      dto.paymentMethodId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  async cancelSubscription(
    @CurrentUser('userId') userId: string,
    @Param('id') subscriptionId: string,
  ) {
    return this.stripeSubscriptionService.cancelSubscription(userId, subscriptionId);
  }
}