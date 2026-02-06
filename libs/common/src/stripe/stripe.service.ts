import { Injectable, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-11-20.acacia',
    });
  }

  getStripeInstance(): Stripe {
    return this.stripe;
  }

  // Customer Management
  async createCustomer(email: string, name: string, userId: string) {
    return this.stripe.customers.create({
      email,
      name,
      metadata: { userId },
    });
  }

  async getCustomer(customerId: string) {
    return this.stripe.customers.retrieve(customerId);
  }

  // Subscription Management
  async createSubscription(
    customerId: string,
    priceId: string,
    metadata?: Record<string, string>
  ) {
    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata,
    });
  }

  async cancelSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.cancel(subscriptionId);
  }

  async updateSubscription(subscriptionId: string, priceId: string) {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    return this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
    });
  }

  // Payment Intent for one-time purchases
  async createPaymentIntent(
    amount: number,
    currency: string,
    customerId: string,
    metadata?: Record<string, string>
  ) {
    return this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: customerId,
      metadata,
      automatic_payment_methods: { enabled: true },
    });
  }

  // Price Management
  async createPrice(
    amount: number,
    currency: string,
    productId: string,
    interval?: 'month' | 'year'
  ) {
    const priceData: Stripe.PriceCreateParams = {
      unit_amount: Math.round(amount * 100),
      currency,
      product: productId,
    };

    if (interval) {
      priceData.recurring = { interval };
    }

    return this.stripe.prices.create(priceData);
  }

  // Product Management
  async createProduct(name: string, description: string) {
    return this.stripe.products.create({
      name,
      description,
    });
  }

  // Webhook signature verification
  constructWebhookEvent(payload: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
    }

    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }
  }
}