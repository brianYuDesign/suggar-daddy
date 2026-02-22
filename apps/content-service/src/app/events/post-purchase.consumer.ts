import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import { PAYMENT_EVENTS, InjectLogger } from '@suggar-daddy/common';
import { RedisService } from '@suggar-daddy/redis';

const POST_UNLOCK = (postId: string, userId: string) => `post:unlock:${postId}:${userId}`;
const UNLOCK_TTL_SEC = 365 * 24 * 60 * 60; // 1 year

@Injectable()
export class PostPurchaseConsumer implements OnModuleInit {
  @InjectLogger() private readonly logger!: Logger;

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
      this.logger.log('Post purchase consumer subscribed');
    } catch (error) {
      this.logger.error('Failed to subscribe post purchase consumer (graceful degradation):', error);
    }
  }
}
