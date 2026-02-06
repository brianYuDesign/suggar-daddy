import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeSubscriptionService } from './stripe-subscription.service';
import { StripeSubscriptionController } from './stripe-subscription.controller';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionTier } from '../entities/subscription-tier.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, SubscriptionTier])],
  controllers: [StripeSubscriptionController],
  providers: [StripeSubscriptionService],
  exports: [StripeSubscriptionService],
})
export class StripeModule {}