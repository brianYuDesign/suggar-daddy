import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { PAYMENT_EVENTS } from '@suggar-daddy/common';
import { TransactionService } from '../transaction.service';

const WEBHOOK_IDEMPOTENCY_PREFIX = 'stripe:webhook:processed:';
const WEBHOOK_IDEMPOTENCY_TTL_SEC = 86400; // 24h

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly transactionService: TransactionService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly redis: RedisService,
  ) {}

  async handleEvent(event: Stripe.Event): Promise<void> {
    const idempotencyKey = `${WEBHOOK_IDEMPOTENCY_PREFIX}${event.id}`;
    const alreadyProcessed = await this.redis.get(idempotencyKey);
    if (alreadyProcessed) {
      this.logger.log(`Webhook event ${event.id} already processed, skipping`);
      return;
    }

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

    await this.redis.setex(idempotencyKey, WEBHOOK_IDEMPOTENCY_TTL_SEC, '1');
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
