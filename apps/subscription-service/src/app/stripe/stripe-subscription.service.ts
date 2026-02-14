import { Injectable, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { getStripeClient } from '@suggar-daddy/common';
import { RedisService } from '@suggar-daddy/redis';
import { SubscriptionService } from '../subscription.service';

const TIER_KEY = (id: string) => `tier:${id}`;
const SUBS_SUBSCRIBER = (id: string) => `subscriptions:subscriber:${id}`;
const SUB_KEY = (id: string) => `subscription:${id}`;
const STRIPE_CUSTOMER = (userId: string) => `stripe:customer:${userId}`;

@Injectable()
export class StripeSubscriptionService {
  private stripe: Stripe;

  constructor(
    private readonly redis: RedisService,
    private readonly subscriptionService: SubscriptionService,
  ) {
    this.stripe = getStripeClient();
  }

  async createSubscription(
    userId: string,
    tierId: string,
    paymentMethodId: string,
  ) {
    const tierRaw = await this.redis.get(TIER_KEY(tierId));
    if (!tierRaw) {
      throw new BadRequestException('Subscription tier not found');
    }
    const tier = JSON.parse(tierRaw);

    const subIds = await this.redis.lRange(SUBS_SUBSCRIBER(userId), 0, -1);
    for (const subId of subIds) {
      const raw = await this.redis.get(SUB_KEY(subId));
      if (raw) {
        const s = JSON.parse(raw);
        if (s.creatorId === tier.creatorId && s.status === 'active') {
          throw new BadRequestException('User already has an active subscription');
        }
      }
    }

    try {
      const customer = await this.createOrGetCustomer(userId);
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });
      await this.stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      const price = tier.priceMonthly ?? tier.price ?? 0;
      const stripeSubscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: tier.name,
                description: tier.description || undefined,
              },
              unit_amount: Math.round(price * 100),
              recurring: { interval: 'month' },
            } as unknown as Stripe.SubscriptionCreateParams.Item.PriceData,
          },
        ],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      const subscription = await this.subscriptionService.create({
        subscriberId: userId,
        creatorId: tier.creatorId,
        tierId: tier.id,
        stripeSubscriptionId: stripeSubscription.id,
        startDate: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      });

      const clientSecret =
        (stripeSubscription.latest_invoice as Stripe.Invoice)?.payment_intent &&
        typeof (stripeSubscription.latest_invoice as Stripe.Invoice).payment_intent === 'object'
          ? ((stripeSubscription.latest_invoice as Stripe.Invoice).payment_intent as Stripe.PaymentIntent).client_secret
          : null;

      return {
        subscriptionId: subscription.id,
        clientSecret,
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new BadRequestException(`Failed to create subscription: ${err?.message || error}`);
    }
  }

  async cancelSubscription(userId: string, subscriptionId: string) {
    const sub = await this.subscriptionService.findOne(subscriptionId);
    if (sub.subscriberId !== userId) {
      throw new BadRequestException('Subscription not found');
    }
    try {
      if (sub.stripeSubscriptionId) {
        await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      }
      await this.subscriptionService.cancel(subscriptionId);
      return { message: 'Subscription cancelled successfully' };
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new BadRequestException(`Failed to cancel subscription: ${err?.message || error}`);
    }
  }

  private async createOrGetCustomer(userId: string): Promise<Stripe.Customer> {
    const existingId = await this.redis.get(STRIPE_CUSTOMER(userId));
    if (existingId) {
      return (await this.stripe.customers.retrieve(existingId)) as Stripe.Customer;
    }
    const customer = await this.stripe.customers.create({
      metadata: { userId },
    });
    await this.redis.set(STRIPE_CUSTOMER(userId), customer.id);
    return customer;
  }
}
