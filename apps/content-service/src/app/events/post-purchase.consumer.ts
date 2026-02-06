import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import { PAYMENT_EVENTS } from '@suggar-daddy/common';
import { RedisService } from '@suggar-daddy/redis';

const POST_UNLOCK = (postId: string, userId: string) => `post:unlock:${postId}:${userId}`;
const UNLOCK_TTL_SEC = 365 * 24 * 60 * 60; // 1 year

@Injectable()
export class PostPurchaseConsumer implements OnModuleInit {
  private readonly logger = new Logger(PostPurchaseConsumer.name);

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    try {
      await this.kafkaConsumer.subscribe(PAYMENT_EVENTS.POST_PURCHASED, async (payload) => {
        const value = payload.message?.value;
        if (!value) return;
        const event = JSON.parse(value.toString());
        const postId = event.postId;
        const userId = event.userId ?? event.buyerId;
        if (!postId || !userId) return;
        const key = POST_UNLOCK(postId, userId);
        await this.redis.setex(key, UNLOCK_TTL_SEC, '1');
        this.logger.log(`Post unlock recorded postId=${postId} userId=${userId}`);
      });
      await this.kafkaConsumer.startConsuming();
      this.logger.log('Post purchase consumer started');
    } catch (error) {
      this.logger.error('Failed to start post purchase consumer (graceful degradation):', error);
    }
  }
}
