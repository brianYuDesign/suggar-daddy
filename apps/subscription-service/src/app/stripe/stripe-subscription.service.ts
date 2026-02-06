import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { getStripeClient } from '@suggar-daddy/common';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionTier } from '../entities/subscription-tier.entity';

@Injectable()
export class StripeSubscriptionService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionTier)
    private tierRepository: Repository<SubscriptionTier>,
  ) {
    this.stripe = getStripeClient();
  }

  /**
   * Create a Stripe subscription for a user
   */
  async createSubscription(
    userId: string,
    tierId: string,
    paymentMethodId: string,
  ) {
    // Get tier details
    const tier = await this.tierRepository.findOne({ where: { id: tierId } });
    if (!tier) {
      throw new BadRequestException('Subscription tier not found');
    }

    // Check if user already has active subscription to this creator
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: {
        subscriberId: userId,
        creatorId: tier.creatorId,
        status: 'active',
      },
    });

    if (existingSubscription) {
      throw new BadRequestException('User already has an active subscription');
    }

    try {
      // Create or retrieve Stripe customer
      const customer = await this.createOrGetCustomer(userId);

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      // Set as default payment method
      await this.stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Create Stripe subscription
      const stripeSubscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: tier.name,
                description: tier.description,
              },
              unit_amount: Math.round(tier.price * 100), // Convert to cents
              recurring: {
                interval: 'month',
              },
            },
          },
        ],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      // Save subscription to database
      const subscription = this.subscriptionRepository.create({
        subscriberId: userId,
        creatorId: tier.creatorId,
        tierId: tier.id,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: customer.id,
        status: 'pending',
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      });

      await this.subscriptionRepository.save(subscription);

      return {
        subscriptionId: subscription.id,
        clientSecret: (stripeSubscription.latest_invoice as Stripe.Invoice)
          .payment_intent
          ? ((stripeSubscription.latest_invoice as Stripe.Invoice).payment_intent as Stripe.PaymentIntent).client_secret
          : null,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to create subscription: ${error.message}`);
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(userId: string, subscriptionId: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId, subscriberId: userId },
    });

    if (!subscription) {
      throw new BadRequestException('Subscription not found');
    }

    try {
      // Cancel at period end (don't immediately revoke access)
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      subscription.status = 'cancelled';
      await this.subscriptionRepository.save(subscription);

      return { message: 'Subscription cancelled successfully' };
    } catch (error) {
      throw new BadRequestException(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Get or create Stripe customer for user
   */
  private async createOrGetCustomer(userId: string): Promise<Stripe.Customer> {
    // Check if customer already exists
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: { subscriberId: userId },
      order: { createdAt: 'DESC' },
    });

    if (existingSubscription?.stripeCustomerId) {
      return await this.stripe.customers.retrieve(
        existingSubscription.stripeCustomerId,
      ) as Stripe.Customer;
    }

    // Create new customer
    return await this.stripe.customers.create({
      metadata: { userId },
    });
  }
}