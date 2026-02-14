import { Module } from '@nestjs/common';
import { StripeSubscriptionService } from './stripe-subscription.service';
import { StripeSubscriptionController } from './stripe-subscription.controller';
import { SubscriptionModule } from '../subscription.module';

@Module({
  imports: [SubscriptionModule],
  controllers: [StripeSubscriptionController],
  providers: [StripeSubscriptionService],
  exports: [StripeSubscriptionService],
})
export class StripeModule {}