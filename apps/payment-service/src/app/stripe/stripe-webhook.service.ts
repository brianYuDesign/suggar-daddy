import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { PAYMENT_EVENTS, InjectLogger, PaymentMetricsService } from '@suggar-daddy/common';
import { TransactionService } from '../transaction.service';
import { PostPurchaseService } from '../post-purchase.service';
import { TipService } from '../tip.service';
import { DiamondPurchaseService } from '../diamond-purchase.service';

const WEBHOOK_IDEMPOTENCY_PREFIX = 'stripe:webhook:processed:';
const WEBHOOK_IDEMPOTENCY_TTL_SEC = 86400; // 24h

@Injectable()
export class StripeWebhookService {
  @InjectLogger() private readonly logger!: Logger;

  constructor(
    private readonly transactionService: TransactionService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly redis: RedisService,
    private readonly postPurchaseService: PostPurchaseService,
    private readonly tipService: TipService,
    private readonly metricsService: PaymentMetricsService,
    private readonly diamondPurchaseService: DiamondPurchaseService,
  ) {}

  async handleEvent(event: Stripe.Event): Promise<void> {
    const idempotencyKey = `${WEBHOOK_IDEMPOTENCY_PREFIX}${event.id}`;
    const alreadyProcessed = await this.redis.get(idempotencyKey);
    if (alreadyProcessed) {
      this.logger.log(`Webhook event ${event.id} already processed, skipping`);
      return;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === 'diamond_purchase') {
          await this.handleDiamondPurchase(session);
        }
        break;
      }
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

    if (transaction.type === 'ppv' && transaction.relatedEntityId && transaction.relatedEntityType === 'post') {
      try {
        await this.postPurchaseService.create({
          postId: transaction.relatedEntityId,
          buyerId: transaction.userId,
          amount: transaction.amount,
        });
        this.logger.log(`Post purchase created for transaction ${transaction.id}`);
      } catch (e) {
        this.logger.warn(`Post purchase create (may be duplicate): ${e}`);
      }
    }
    if (transaction.type === 'tip' && transaction.relatedEntityId && transaction.relatedEntityType === 'creator') {
      try {
        await this.tipService.create({
          fromUserId: transaction.userId,
          toUserId: transaction.relatedEntityId,
          amount: transaction.amount,
        });
        this.logger.log(`Tip created for transaction ${transaction.id}`);
      } catch (e) {
        this.logger.warn(`Tip create (may be duplicate): ${e}`);
      }
    }

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
    
    if (!transaction) {
      // ✅ Bug 2 修復: 記錄孤兒交易並發送完整事件
      this.logger.error(
        `Payment failed but transaction not found: ${paymentIntent.id}`,
        {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          customer: paymentIntent.customer,
          lastPaymentError: paymentIntent.last_payment_error,
        }
      );
      
      // 🔥 記錄孤兒交易 metrics
      this.metricsService.recordOrphanTransactionDetected(paymentIntent.id, {
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        customer: paymentIntent.customer,
      });
      
      // 創建孤兒交易記錄
      try {
        const orphanTransaction = await this.transactionService.createOrphan({
          stripePaymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Stripe 使用美分
          currency: paymentIntent.currency,
          status: 'failed',
          type: 'orphan',
          metadata: {
            reason: 'orphan_payment',
            stripeCustomer: paymentIntent.customer as string,
            failureReason: paymentIntent.last_payment_error?.message,
          },
        });
        
        // 發送孤兒交易事件用於人工處理
        await this.kafkaProducer.sendEvent(PAYMENT_EVENTS.PAYMENT_FAILED_ORPHAN, {
          paymentIntentId: paymentIntent.id,
          transactionId: orphanTransaction.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          failureReason: paymentIntent.last_payment_error?.message || 'unknown',
          timestamp: new Date().toISOString(),
        });
        
        this.logger.warn(
          `Orphan transaction created: ${orphanTransaction.id} for payment ${paymentIntent.id}`
        );
      } catch (error) {
        // 🔥 記錄孤兒交易處理失敗 metrics
        this.metricsService.recordOrphanProcessingFailure(
          paymentIntent.id,
          error instanceof Error ? error : new Error(String(error))
        );
        
        this.logger.error(
          `Failed to create orphan transaction for ${paymentIntent.id}`,
          error
        );
      }
      
      return;
    }
    
    // ✅ 更新交易狀態並記錄失敗原因
    await this.transactionService.update(transaction.id, { 
      status: 'failed',
      metadata: {
        ...transaction.metadata,
        failedAt: new Date().toISOString(),
        failureReason: paymentIntent.last_payment_error?.message,
        stripeErrorCode: paymentIntent.last_payment_error?.code,
      },
    });
    
    // ✅ 發送完整的失敗事件
    await this.kafkaProducer.sendEvent(PAYMENT_EVENTS.PAYMENT_FAILED, {
      transactionId: transaction.id,
      userId: transaction.userId,
      amount: transaction.amount,
      currency: transaction.currency || 'usd',
      type: transaction.type,
      reason: paymentIntent.last_payment_error?.message || 'payment_failed',
      errorCode: paymentIntent.last_payment_error?.code,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.warn(
      `Payment failed: ${transaction.id}`,
      {
        userId: transaction.userId,
        amount: transaction.amount,
        reason: paymentIntent.last_payment_error?.message,
      }
    );
  }

  private async handleDiamondPurchase(session: Stripe.Checkout.Session): Promise<void> {
    if (session.payment_status !== 'paid') {
      this.logger.warn(`Diamond purchase session not paid: ${session.id}`);
      return;
    }

    const metadata = session.metadata || {};
    const stripePaymentId = session.payment_intent as string || session.id;

    try {
      await this.diamondPurchaseService.handlePaymentSuccess(stripePaymentId, metadata);
      this.logger.log(`Diamond purchase completed: session=${session.id}`);
    } catch (err) {
      this.logger.error(`Diamond purchase handling failed: session=${session.id}`, err);
    }
  }
}
