import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Transaction } from '../entities/transaction.entity';
import { StripePurchaseService } from './stripe-purchase.service';
import { StripeTipService } from './stripe-tip.service';

@Injectable()
export class StripeWebhookService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private purchaseService: StripePurchaseService,
    private tipService: StripeTipService,
  ) {}

  async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const transaction = await this.transactionRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!transaction) {
      console.error(`Transaction not found for payment intent: ${paymentIntent.id}`);
      return;
    }

    if (transaction.type === 'post_purchase') {
      await this.purchaseService.confirmPurchase(paymentIntent.id);
    } else if (transaction.type === 'tip') {
      await this.tipService.confirmTip(paymentIntent.id);
    }

    console.log(`Payment succeeded: ${paymentIntent.id}`);
  }

  async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const transaction = await this.transactionRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (transaction) {
      transaction.status = 'failed';
      await this.transactionRepository.save(transaction);
    }

    console.log(`Payment failed: ${paymentIntent.id}`);
  }

  async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    console.log(`Subscription updated: ${subscription.id}`);
  }

  async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    console.log(`Subscription deleted: ${subscription.id}`);
  }

  async handleInvoicePaymentSuccess(invoice: Stripe.Invoice) {
    console.log(`Invoice payment succeeded: ${invoice.id}`);
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    console.log(`Invoice payment failed: ${invoice.id}`);
  }
}