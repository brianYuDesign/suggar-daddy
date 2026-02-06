import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import {
  USER_EVENTS,
  CONTENT_EVENTS,
  MEDIA_EVENTS,
  SUBSCRIPTION_EVENTS,
  PAYMENT_EVENTS,
} from '@suggar-daddy/common';
import { DbWriterService } from './db-writer.service';

@Injectable()
export class DbWriterConsumer implements OnModuleInit {
  private readonly logger = new Logger(DbWriterConsumer.name);

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly dbWriter: DbWriterService,
  ) {}

  async onModuleInit() {
    const topics: Array<{ topic: string; handler: (payload: any) => Promise<void> }> = [
      { topic: USER_EVENTS.USER_CREATED, handler: (p) => this.dbWriter.handleUserCreated(p) },
      { topic: USER_EVENTS.USER_UPDATED, handler: (p) => this.dbWriter.handleUserUpdated(p) },
      { topic: CONTENT_EVENTS.POST_CREATED, handler: (p) => this.dbWriter.handlePostCreated(p) },
      { topic: CONTENT_EVENTS.POST_UPDATED, handler: (p) => this.dbWriter.handlePostUpdated(p) },
      { topic: CONTENT_EVENTS.POST_DELETED, handler: (p) => this.dbWriter.handlePostDeleted(p) },
      { topic: CONTENT_EVENTS.POST_LIKED, handler: (p) => this.dbWriter.handlePostLiked(p) },
      { topic: CONTENT_EVENTS.POST_UNLIKED, handler: (p) => this.dbWriter.handlePostUnliked(p) },
      { topic: CONTENT_EVENTS.COMMENT_CREATED, handler: (p) => this.dbWriter.handleCommentCreated(p) },
      { topic: MEDIA_EVENTS.MEDIA_UPLOADED, handler: (p) => this.dbWriter.handleMediaUploaded(p) },
      { topic: MEDIA_EVENTS.MEDIA_DELETED, handler: (p) => this.dbWriter.handleMediaDeleted(p) },
      { topic: SUBSCRIPTION_EVENTS.SUBSCRIPTION_CREATED, handler: (p) => this.dbWriter.handleSubscriptionCreated(p) },
      { topic: PAYMENT_EVENTS.PAYMENT_COMPLETED, handler: (p) => this.dbWriter.handlePaymentCompleted(p) },
      { topic: PAYMENT_EVENTS.TIP_SENT, handler: (p) => this.dbWriter.handleTipSent(p) },
      { topic: PAYMENT_EVENTS.POST_PURCHASED, handler: (p) => this.dbWriter.handlePostPurchased(p) },
      { topic: SUBSCRIPTION_EVENTS.TIER_CREATED, handler: (p) => this.dbWriter.handleTierCreated(p) },
    ];

    const maxRetries = 2;
    const retryDelayMs = 1000;

    for (const { topic, handler } of topics) {
      await this.kafkaConsumer.subscribe(topic, async (payload) => {
        const value = payload.message?.value;
        const event = value ? JSON.parse(value.toString()) : {};
        let lastErr: unknown;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            await handler(event);
            return;
          } catch (err) {
            lastErr = err;
            this.logger.warn(
              `Error processing ${topic} (attempt ${attempt + 1}/${maxRetries + 1}):`,
              err
            );
            if (attempt < maxRetries) {
              await new Promise((r) => setTimeout(r, retryDelayMs));
            }
          }
        }
        this.logger.error(`Failed processing ${topic} after ${maxRetries + 1} attempts:`, lastErr);
      });
    }

    await this.kafkaConsumer.startConsuming();
    this.logger.log('DB Writer consumer started');
  }
}
