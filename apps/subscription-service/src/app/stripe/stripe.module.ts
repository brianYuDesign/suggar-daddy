import { Module } from '@nestjs/common';
import { StripeSubscriptionService } from './stripe-subscription.service';
import { StripeSubscriptionController } from './stripe-subscription.controller';

@Module({
  controllers: [StripeSubscriptionController],
  providers: [StripeSubscriptionService],
  exports: [StripeSubscriptionService],
})
export class StripeModule {}