import { Injectable, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { PAYMENT_EVENTS, PaymentCompletedEvent } from '@suggar-daddy/common';

@Injectable()
export class PaymentProducer {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  async emitPaymentCompleted(event: PaymentCompletedEvent) {
    return this.kafkaClient.emit(PAYMENT_EVENTS.PAYMENT_COMPLETED, event);
  }

  async emitPaymentFailed(
    transactionId: string,
    userId: string,
    reason: string,
  ) {
    return this.kafkaClient.emit(PAYMENT_EVENTS.PAYMENT_FAILED, {
      transactionId,
      userId,
      reason,
      failedAt: new Date(),
    });
  }

  async emitTipSent(
    senderId: string,
    recipientId: string,
    amount: number,
    transactionId: string,
  ) {
    return this.kafkaClient.emit(PAYMENT_EVENTS.TIP_SENT, {
      senderId,
      recipientId,
      amount,
      transactionId,
      sentAt: new Date(),
    });
  }

  async emitPostPurchased(
    userId: string,
    postId: string,
    amount: number,
    transactionId: string,
  ) {
    return this.kafkaClient.emit(PAYMENT_EVENTS.POST_PURCHASED, {
      userId,
      postId,
      amount,
      transactionId,
      purchasedAt: new Date(),
    });
  }
}