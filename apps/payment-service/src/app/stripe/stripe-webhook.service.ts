import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Transaction } from '../entities/transaction.entity';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
  ) {}

  async handleEvent(event: Stripe.Event) {
    this.logger.log(`Received Stripe event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        this.logger.warn(`Unhandled event type: ${event.type}`);
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const transaction = await this.transactionRepo.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (transaction) {
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      await this.transactionRepo.save(transaction);
      this.logger.log(`Transaction ${transaction.id} completed`);

      // TODO: Emit Kafka event for payment.completed
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    const transaction = await this.transactionRepo.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (transaction) {
      transaction.status = 'failed';
      await this.transactionRepo.save(transaction);
      this.logger.error(`Transaction ${transaction.id} failed`);

      // TODO: Emit Kafka event for payment.failed
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    this.logger.log(`Subscription created: ${subscription.id}`);
    // TODO: Update subscription status in database
    // TODO: Emit Kafka event for subscription.created
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    this.logger.log(`Subscription updated: ${subscription.id}`);
    // TODO: Update subscription in database
    // TODO: Emit Kafka event for subscription.updated
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    this.logger.log(`Subscription deleted: ${subscription.id}`);
    // TODO: Update subscription status in database
    // TODO: Emit Kafka event for subscription.cancelled
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    this.logger.log(`Invoice payment succeeded: ${invoice.id}`);
    // TODO: Record invoice payment in database
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    this.logger.error(`Invoice payment failed: ${invoice.id}`);
    // TODO: Handle failed recurring payment
  }
}