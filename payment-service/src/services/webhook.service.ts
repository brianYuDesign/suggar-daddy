import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Stripe from 'stripe';
import { WebhookEvent } from '../entities/webhook-event.entity';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Subscription, SubscriptionStatus } from '../entities/subscription.entity';
import { PaymentService } from './payment.service';
import { SubscriptionService } from './subscription.service';
import { InvoiceService } from './invoice.service';
import { ConfigService } from './config.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private stripe: Stripe.Stripe;

  constructor(
    @InjectRepository(WebhookEvent)
    private webhookEventRepository: Repository<WebhookEvent>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private paymentService: PaymentService,
    private subscriptionService: SubscriptionService,
    private invoiceService: InvoiceService,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe.Stripe(this.configService.getStripeApiKey(), {
      apiVersion: this.configService.getStripeApiVersion() as any,
    });
  }

  /**
   * 驗證 Stripe webhook 簽名
   */
  verifyWebhookSignature(body: string, signature: string): Stripe.Event {
    try {
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.configService.getStripeWebhookSecret(),
      );
      return event;
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  /**
   * 處理 webhook 事件
   */
  async handleWebhookEvent(event: Stripe.Event) {
    this.logger.log(`Processing webhook event: ${event.type}`);

    try {
      // 檢查是否已處理
      const existingEvent = await this.webhookEventRepository.findOneBy({
        stripeEventId: event.id,
      });

      if (existingEvent) {
        this.logger.log(`Event ${event.id} already processed`);
        return { received: true };
      }

      // 保存事件記錄
      let webhookEvent = this.webhookEventRepository.create({
        stripeEventId: event.id,
        eventType: event.type,
        payload: event.data,
      });

      webhookEvent = await this.webhookEventRepository.save(webhookEvent);

      // 根據事件類型處理
      switch (event.type) {
        case 'charge.succeeded':
          await this.handleChargeSucceeded(event.data.object as Stripe.Charge, webhookEvent);
          break;
        case 'charge.failed':
          await this.handleChargeFailed(event.data.object as Stripe.Charge, webhookEvent);
          break;
        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object as Stripe.Charge, webhookEvent);
          break;
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(
            event.data.object as Stripe.Subscription,
            webhookEvent,
          );
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription,
            webhookEvent,
          );
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancelled(
            event.data.object as Stripe.Subscription,
            webhookEvent,
          );
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(
            event.data.object as Stripe.Invoice,
            webhookEvent,
          );
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, webhookEvent);
          break;
        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      // 標記事件為已處理
      webhookEvent.processed = true;
      webhookEvent.processedAt = new Date();
      await this.webhookEventRepository.save(webhookEvent);

      return { received: true };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`);

      // 記錄錯誤並重試
      const webhookEvent = await this.webhookEventRepository.findOneBy({
        stripeEventId: event.id,
      });

      if (webhookEvent) {
        webhookEvent.errorMessage = error.message;
        webhookEvent.retryCount += 1;
        await this.webhookEventRepository.save(webhookEvent);
      }

      throw error;
    }
  }

  /**
   * 處理支付成功事件
   */
  private async handleChargeSucceeded(charge: Stripe.Charge, webhookEvent: WebhookEvent) {
    this.logger.log(`Charge succeeded: ${charge.id}`);

    const paymentId = charge.metadata?.paymentId;
    if (!paymentId) {
      this.logger.warn(`No payment ID in charge metadata`);
      return;
    }

    const payment = await this.paymentRepository.findOneBy({ id: paymentId });
    if (payment) {
      payment.status = PaymentStatus.SUCCEEDED;
      payment.stripeChargeId = charge.id;
      payment.processedAt = new Date();
      payment.stripeWebhookId = webhookEvent.id;
      await this.paymentRepository.save(payment);

      this.logger.log(`Payment marked as succeeded: ${paymentId}`);
    }
  }

  /**
   * 處理支付失敗事件
   */
  private async handleChargeFailed(charge: Stripe.Charge, webhookEvent: WebhookEvent) {
    this.logger.log(`Charge failed: ${charge.id}`);

    const paymentId = charge.metadata?.paymentId;
    if (!paymentId) {
      this.logger.warn(`No payment ID in charge metadata`);
      return;
    }

    const payment = await this.paymentRepository.findOneBy({ id: paymentId });
    if (payment) {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = charge.failure_message || 'Unknown error';
      payment.retryCount += 1;
      payment.stripeWebhookId = webhookEvent.id;
      await this.paymentRepository.save(payment);

      this.logger.log(`Payment marked as failed: ${paymentId}`);
    }
  }

  /**
   * 處理退款事件
   */
  private async handleChargeRefunded(charge: Stripe.Charge, webhookEvent: WebhookEvent) {
    this.logger.log(`Charge refunded: ${charge.id}`);

    const payment = await this.paymentRepository.findOneBy({
      stripeChargeId: charge.id,
    });

    if (payment) {
      payment.status = PaymentStatus.REFUNDED;
      payment.refundedAt = new Date();
      payment.stripeWebhookId = webhookEvent.id;
      await this.paymentRepository.save(payment);

      this.logger.log(`Payment refunded: ${payment.id}`);
    }
  }

  /**
   * 處理訂閱創建
   */
  private async handleSubscriptionCreated(
    subscription: Stripe.Subscription,
    webhookEvent: WebhookEvent,
  ) {
    this.logger.log(`Subscription created: ${subscription.id}`);
    // 訂閱已在 API 中創建，無需額外處理
  }

  /**
   * 處理訂閱更新
   */
  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
    webhookEvent: WebhookEvent,
  ) {
    this.logger.log(`Subscription updated: ${subscription.id}`);

    const dbSubscription = await this.subscriptionRepository.findOneBy({
      stripeSubscriptionId: subscription.id,
    });

    if (dbSubscription) {
      // 更新下一個計費日期
      if (subscription.current_period_end) {
        dbSubscription.nextBillingDate = new Date(subscription.current_period_end * 1000);
        dbSubscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      }

      // 根據狀態更新
      if (subscription.status === 'active') {
        dbSubscription.status = SubscriptionStatus.ACTIVE;
      } else if (subscription.status === 'paused') {
        dbSubscription.status = SubscriptionStatus.PAUSED;
      }

      await this.subscriptionRepository.save(dbSubscription);
      this.logger.log(`Subscription updated in DB: ${dbSubscription.id}`);
    }
  }

  /**
   * 處理訂閱取消
   */
  private async handleSubscriptionCancelled(
    subscription: Stripe.Subscription,
    webhookEvent: WebhookEvent,
  ) {
    this.logger.log(`Subscription cancelled: ${subscription.id}`);

    const dbSubscription = await this.subscriptionRepository.findOneBy({
      stripeSubscriptionId: subscription.id,
    });

    if (dbSubscription) {
      dbSubscription.status = SubscriptionStatus.CANCELLED;
      dbSubscription.cancelledAt = new Date();
      dbSubscription.autoRenew = false;
      await this.subscriptionRepository.save(dbSubscription);

      this.logger.log(`Subscription cancelled in DB: ${dbSubscription.id}`);
    }
  }

  /**
   * 處理發票支付成功
   */
  private async handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice,
    webhookEvent: WebhookEvent,
  ) {
    this.logger.log(`Invoice payment succeeded: ${invoice.id}`);

    // 如果發票與訂閱關聯，在數據庫中創建發票記錄
    if (invoice.subscription) {
      const subscription = await this.subscriptionRepository.findOneBy({
        stripeSubscriptionId: invoice.subscription as string,
      });

      if (subscription) {
        await this.invoiceService.createRecurringInvoice(
          subscription.userId,
          subscription.id,
          subscription.amount,
        );

        // 處理續費
        await this.subscriptionService.handleRenewal(subscription.stripeSubscriptionId);

        this.logger.log(`Invoice created for subscription: ${subscription.id}`);
      }
    }
  }

  /**
   * 處理發票支付失敗
   */
  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
    webhookEvent: WebhookEvent,
  ) {
    this.logger.log(`Invoice payment failed: ${invoice.id}`);

    if (invoice.subscription) {
      const subscription = await this.subscriptionRepository.findOneBy({
        stripeSubscriptionId: invoice.subscription as string,
      });

      if (subscription) {
        subscription.failedRenewalAttempts = (subscription.failedRenewalAttempts || 0) + 1;

        // 3 次失敗後取消訂閱
        if (subscription.failedRenewalAttempts >= 3) {
          subscription.status = SubscriptionStatus.CANCELLED;
          this.logger.warn(`Subscription cancelled due to payment failures: ${subscription.id}`);
        }

        await this.subscriptionRepository.save(subscription);
      }
    }
  }

  /**
   * 重試失敗的 webhook 事件
   */
  async retryFailedEvents() {
    this.logger.log(`Retrying failed webhook events`);

    const failedEvents = await this.webhookEventRepository.find({
      where: { processed: false, retryCount: 0 },
      take: 10,
    });

    for (const event of failedEvents) {
      try {
        // 重新構造事件並重試
        const stripeEvent = {
          id: event.stripeEventId,
          type: event.eventType,
          data: event.payload,
        } as Stripe.Event;

        await this.handleWebhookEvent(stripeEvent);
      } catch (error) {
        this.logger.error(`Failed to retry event ${event.id}: ${error.message}`);
      }
    }
  }
}
