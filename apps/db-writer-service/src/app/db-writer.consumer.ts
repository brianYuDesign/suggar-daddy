import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import {
  USER_EVENTS,
  CONTENT_EVENTS,
  MEDIA_EVENTS,
  SUBSCRIPTION_EVENTS,
  PAYMENT_EVENTS,
  SOCIAL_EVENTS,
  MESSAGING_EVENTS,
} from '@suggar-daddy/common';
import { DbWriterService } from './db-writer.service';
import { DlqService } from './dlq.service';

@Injectable()
export class DbWriterConsumer implements OnModuleInit {
  private readonly logger = new Logger(DbWriterConsumer.name);

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly dbWriter: DbWriterService,
    private readonly dlqService: DlqService,
  ) {}

  async onModuleInit() {
    const topics: Array<{ topic: string; handler: (payload: Record<string, unknown>) => Promise<void> }> = [
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
      { topic: PAYMENT_EVENTS.PAYMENT_REFUNDED, handler: (p) => this.dbWriter.handlePaymentRefunded(p) },
      { topic: PAYMENT_EVENTS.TIP_SENT, handler: (p) => this.dbWriter.handleTipSent(p) },
      { topic: PAYMENT_EVENTS.POST_PURCHASED, handler: (p) => this.dbWriter.handlePostPurchased(p) },
      { topic: SUBSCRIPTION_EVENTS.TIER_CREATED, handler: (p) => this.dbWriter.handleTierCreated(p) },
      { topic: SOCIAL_EVENTS.USER_FOLLOWED, handler: (p) => this.dbWriter.handleUserFollowed(p) },
      { topic: SOCIAL_EVENTS.USER_UNFOLLOWED, handler: (p) => this.dbWriter.handleUserUnfollowed(p) },
      { topic: CONTENT_EVENTS.POST_BOOKMARKED, handler: (p) => this.dbWriter.handlePostBookmarked(p) },
      { topic: CONTENT_EVENTS.POST_UNBOOKMARKED, handler: (p) => this.dbWriter.handlePostUnbookmarked(p) },
      { topic: CONTENT_EVENTS.COMMENT_DELETED, handler: (p) => this.dbWriter.handleCommentDeleted(p) },
      { topic: CONTENT_EVENTS.STORY_CREATED, handler: (p) => this.dbWriter.handleStoryCreated(p) },
      { topic: MESSAGING_EVENTS.DM_PURCHASED, handler: (p) => this.dbWriter.handleDmPurchased(p) },
    ];

    const maxRetries = 3;

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
              err,
            );
            if (attempt < maxRetries) {
              // Exponential backoff: 500ms, 1s, 2s, 4s...
              const delay = Math.pow(2, attempt) * 500;
              await new Promise((r) => setTimeout(r, delay));
            }
          }
        }
        // 重試 3 次仍失敗，寫入死信佇列
        this.logger.error('Failed processing ' + topic + ' after ' + (maxRetries + 1) + ' attempts, sending to DLQ');
        try {
          await this.dlqService.addToDeadLetterQueue(
            topic,
            event,
            lastErr instanceof Error ? lastErr.message : String(lastErr),
            maxRetries + 1,
          );
        } catch (dlqErr) {
          this.logger.error('Failed to write to DLQ:', dlqErr);
        }
      });
    }

    await this.kafkaConsumer.startConsuming();
    this.logger.log('DB Writer consumer started (with DLQ support)');
  }
}
