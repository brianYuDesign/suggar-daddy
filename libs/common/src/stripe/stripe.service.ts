import { Injectable, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe | null = null;

  constructor() {
    const apiKey = process.env['STRIPE_SECRET_KEY'];
    if (apiKey) {
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2023-10-16',
      });
    }
  }

  getStripeInstance(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe is not configured. Set STRIPE_SECRET_KEY to enable payments.'
      );
    }
    return this.stripe;
  }

  isConfigured(): boolean {
    return this.stripe != null;
  }

  // Customer Management
  async createCustomer(email: string, name: string, userId: string) {
    return this.getStripeInstance().customers.create({
      email,
      name,
      metadata: { userId },
    });
  }

  async getCustomer(customerId: string) {
    return this.getStripeInstance().customers.retrieve(customerId);
  }

  // Subscription Management
  async createSubscription(
    customerId: string,
    priceId: string,
    metadata?: Record<string, string>
  ) {
    return this.getStripeInstance().subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata,
    });
  }

  async cancelSubscription(subscriptionId: string) {
    return this.getStripeInstance().subscriptions.cancel(subscriptionId);
  }

  async updateSubscription(subscriptionId: string, priceId: string) {
    const stripe = this.getStripeInstance();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return stripe.subscriptions.update(subscriptionId, {
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
    return this.getStripeInstance().paymentIntents.create({
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

    return this.getStripeInstance().prices.create(priceData);
  }

  // Product Management
  async createProduct(name: string, description: string) {
    return this.getStripeInstance().products.create({
      name,
      description,
    });
  }

  // Refund Management
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string,
  ) {
    const params: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };
    if (amount !== undefined) {
      params.amount = Math.round(amount * 100); // Convert to cents
    }
    if (reason) {
      params.reason = 'requested_by_customer';
      params.metadata = { reason };
    }
    return this.getStripeInstance().refunds.create(params);
  }

  // Webhook signature verification（僅需 STRIPE_WEBHOOK_SECRET，不依賴 STRIPE_SECRET_KEY）
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];
    if (!webhookSecret) {
      throw new BadRequestException(
        'Stripe webhook is not configured. Set STRIPE_WEBHOOK_SECRET to verify webhooks.'
      );
    }
    try {
      const client =
        this.stripe ??
        new Stripe(process.env['STRIPE_SECRET_KEY'] || '', {
          apiVersion: '2023-10-16',
        });
      return client.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}