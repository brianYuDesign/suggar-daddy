import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionTierService } from './subscription-tier.service';

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionTierService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
