import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import {
  SOCIAL_EVENTS,
  CONTENT_EVENTS,
  MESSAGING_EVENTS,
  PAYMENT_EVENTS,
  SUBSCRIPTION_EVENTS,
  MATCHING_EVENTS,
  InjectLogger,
} from '@suggar-daddy/common';
import { RedisService } from '@suggar-daddy/redis';
import { NotificationService } from './notification.service';

@Injectable()
export class SocialEventConsumer implements OnModuleInit {
  @InjectLogger() private readonly logger!: Logger;

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly notificationService: NotificationService,
    private readonly redis: RedisService,
  ) {}

  private readonly maxRetries = 3;

  private async withRetry(topic: string, event: Record<string, unknown>, handler: () => Promise<void>) {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await handler();
        return;
      } catch (err) {
        lastErr = err;
        this.logger.warn(
          `Error processing ${topic} (attempt ${attempt + 1}/${this.maxRetries + 1}):`,
          err,
        );
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
        }
      }
    }
    this.logger.error(
      `Failed processing ${topic} after ${this.maxRetries + 1} attempts. Event: ${JSON.stringify(event)}`,
      lastErr instanceof Error ? lastErr.stack : String(lastErr),
    );
  }

  private async sendBatch(
    userIds: string[],
    notification: { type: string; title: string; body?: string; data?: Record<string, unknown> },
    batchSize = 50,
  ) {
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      await Promise.all(
        batch.map((userId) =>
          this.notificationService.send({ userId, ...notification }),
        ),
      );
    }
  }

  async onModuleInit() {
    try {
      // Follow notification
      await this.kafkaConsumer.subscribe(SOCIAL_EVENTS.USER_FOLLOWED, async (payload) => {
        const event = JSON.parse(payload.message.value.toString());
        await this.withRetry(SOCIAL_EVENTS.USER_FOLLOWED, event, async () => {
          await this.notificationService.send({
            userId: event.followedId,
            type: 'follow',
            title: '新粉絲！',
            body: '有人開始追蹤你了',
            data: { followerId: event.followerId },
          });
        });
      });

      // Comment reply notification
      await this.kafkaConsumer.subscribe(CONTENT_EVENTS.COMMENT_CREATED, async (payload) => {
        const event = JSON.parse(payload.message.value.toString());
        if (event.parentCommentId) {
          if (event.parentCommentUserId && event.parentCommentUserId !== event.userId) {
            await this.withRetry(CONTENT_EVENTS.COMMENT_CREATED, event, async () => {
              await this.notificationService.send({
                userId: event.parentCommentUserId,
                type: 'comment_reply',
                title: '留言回覆',
                body: '有人回覆了你的留言',
                data: { postId: event.postId, commentId: event.commentId },
              });
            });
          }
        }
      });

      // Broadcast notification — notify all followers of the creator
      await this.kafkaConsumer.subscribe(MESSAGING_EVENTS.BROADCAST_SENT, async (payload) => {
        const event = JSON.parse(payload.message.value.toString());
        await this.withRetry(MESSAGING_EVENTS.BROADCAST_SENT, event, async () => {
          const followers = await this.redis.sMembers(`user:followers:${event.creatorId}`);
          this.logger.log(
            `Broadcast notification: broadcastId=${event.broadcastId} creatorId=${event.creatorId} followers=${followers.length}`,
          );
          if (followers.length > 0) {
            await this.sendBatch(followers, {
              type: 'broadcast',
              title: '新廣播訊息',
              body: event.content?.slice(0, 100) || '你追蹤的創作者發送了廣播',
              data: { broadcastId: event.broadcastId, creatorId: event.creatorId },
            });
          }
        });
      });

      // Post liked notification
      await this.kafkaConsumer.subscribe(CONTENT_EVENTS.POST_LIKED, async (payload) => {
        const event = JSON.parse(payload.message.value.toString());
        await this.withRetry(CONTENT_EVENTS.POST_LIKED, event, async () => {
          // Get post creator from Redis
          const postRaw = await this.redis.get(`post:${event.postId}`);
          const creatorId = postRaw
            ? (JSON.parse(postRaw) as { creatorId?: string }).creatorId
            : event.creatorId;

          if (!creatorId || creatorId === event.userId) return;

          await this.notificationService.send({
            userId: creatorId,
            type: 'like',
            title: '有人按讚你的貼文',
            body: '你的貼文獲得了一個新的讚',
            data: { postId: event.postId, likerId: event.userId },
          });
        });
      });

      // Tip sent notification
      await this.kafkaConsumer.subscribe(PAYMENT_EVENTS.TIP_SENT, async (payload) => {
        const event = JSON.parse(payload.message.value.toString());
        await this.withRetry(PAYMENT_EVENTS.TIP_SENT, event, async () => {
          if (!event.recipientId) return;

          await this.notificationService.send({
            userId: event.recipientId,
            type: 'tip',
            title: '收到打賞！',
            body: `你收到了一筆打賞`,
            data: {
              senderId: event.senderId,
              amount: event.amount,
              transactionId: event.transactionId,
            },
          });
        });
      });

      // Subscription created notification
      await this.kafkaConsumer.subscribe(SUBSCRIPTION_EVENTS.SUBSCRIPTION_CREATED, async (payload) => {
        const event = JSON.parse(payload.message.value.toString());
        await this.withRetry(SUBSCRIPTION_EVENTS.SUBSCRIPTION_CREATED, event, async () => {
          if (!event.creatorId) return;

          await this.notificationService.send({
            userId: event.creatorId,
            type: 'subscription',
            title: '新訂閱者！',
            body: '有人訂閱了你的內容',
            data: {
              subscriberId: event.subscriberId,
              tierId: event.tierId,
            },
          });
        });
      });

      // Likes-me revealed notification
      await this.kafkaConsumer.subscribe(MATCHING_EVENTS.LIKES_ME_REVEALED, async (payload) => {
        const event = JSON.parse(payload.message.value.toString());
        await this.withRetry(MATCHING_EVENTS.LIKES_ME_REVEALED, event, async () => {
          if (!event.likerId) return;

          await this.notificationService.send({
            userId: event.likerId,
            type: 'match',
            title: '你的喜歡被揭曉了',
            body: '有人查看了你的喜歡',
            data: {
              userId: event.userId,
              diamondCost: event.diamondCost,
            },
          });
        });
      });

      await this.kafkaConsumer.startConsuming();
      this.logger.log('Social event consumer started');
    } catch (error) {
      this.logger.error('Failed to start social event consumer (graceful degradation):', error);
    }
  }
}
