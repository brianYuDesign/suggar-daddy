import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeService } from '@suggar-daddy/common';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionTier } from '../entities/subscription-tier.entity';

@Injectable()
export class StripeSubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(SubscriptionTier)
    private tierRepo: Repository<SubscriptionTier>,
    private stripeService: StripeService,
  ) {}

  async createSubscription(
    userId: string,
    tierId: string,
    stripeCustomerId: string,
  ) {
    // Get tier details
    const tier = await this.tierRepo.findOne({ where: { id: tierId } });
    if (!tier) {
      throw new NotFoundException('Subscription tier not found');
    }

    // Create Stripe subscription
    const stripeSubscription = await this.stripeService.createSubscription(
      stripeCustomerId,
      tier.stripePriceId,
      {
        userId,
        tierId,
      }
    );

    // Save to database
    const subscription = this.subscriptionRepo.create({
      userId,
      creatorId: tier.creatorId,
      tierId,
      status: 'pending',
      stripeSubscriptionId: stripeSubscription.id,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    });

    await this.subscriptionRepo.save(subscription);

    return {
      subscription,
      clientSecret: (stripeSubscription.latest_invoice as any)?.payment_intent?.client_secret,
    };
  }

  async cancelSubscription(subscriptionId: string, userId: string) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Cancel in Stripe
    await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId);

    // Update database
    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    await this.subscriptionRepo.save(subscription);

    return subscription;
  }

  async upgradeSubscription(
    subscriptionId: string,
    userId: string,
    newTierId: string,
  ) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const newTier = await this.tierRepo.findOne({ where: { id: newTierId } });
    if (!newTier) {
      throw new NotFoundException('New subscription tier not found');
    }

    // Update in Stripe
    await this.stripeService.updateSubscription(
      subscription.stripeSubscriptionId,
      newTier.stripePriceId,
    );

    // Update database
    subscription.tierId = newTierId;
    await this.subscriptionRepo.save(subscription);

    return subscription;
  }
}