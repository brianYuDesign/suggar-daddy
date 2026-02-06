import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { PAYMENT_EVENTS } from '@suggar-daddy/common';
import { TransactionService } from '../transaction.service';

@Injectable()
export class StripeWebhookService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async handleEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        break;
    }
  }

  async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const transaction = await this.transactionService.findByStripePaymentId(paymentIntent.id);
    if (!transaction) return;
    await this.transactionService.update(transaction.id, { status: 'succeeded' });
    await this.kafkaProducer.sendEvent(PAYMENT_EVENTS.PAYMENT_COMPLETED, {
      transactionId: transaction.id,
      userId: transaction.userId,
      amount: transaction.amount,
      type: transaction.type,
      metadata: transaction.metadata,
    });
  }

  async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const transaction = await this.transactionService.findByStripePaymentId(paymentIntent.id);
    if (transaction) {
      await this.transactionService.update(transaction.id, { status: 'failed' });
    }
    await this.kafkaProducer.sendEvent(PAYMENT_EVENTS.PAYMENT_FAILED, {
      transactionId: transaction?.id,
      userId: transaction?.userId,
      reason: 'payment_failed',
    });
  }
}
