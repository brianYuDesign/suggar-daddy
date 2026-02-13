import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import { CONTENT_EVENTS } from '@suggar-daddy/common';
import { RedisService } from '@suggar-daddy/redis';
import { FeedService } from '../feed.service';

const USER_FOLLOWERS = (userId: string) => `user:followers:${userId}`;

@Injectable()
export class FeedConsumer implements OnModuleInit {
  private readonly logger = new Logger(FeedConsumer.name);

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly redis: RedisService,
    private readonly feedService: FeedService,
  ) {}

  async onModuleInit() {
    try {
      await this.kafkaConsumer.subscribe(CONTENT_EVENTS.POST_CREATED, async (payload) => {
        const value = payload.message?.value;
        if (!value) return;
        const event = JSON.parse(value.toString());
        const { postId, creatorId, visibility } = event;

        if (!postId || !creatorId) return;
        // Only distribute public posts to feeds
        if (visibility !== 'public') return;

        const timestamp = Date.now();

        // Get creator's followers and add post to each follower's feed
        const followers = await this.redis.sMembers(USER_FOLLOWERS(creatorId));
        this.logger.debug(`Distributing post=${postId} to ${followers.length} followers of creator=${creatorId}`);

        for (const followerId of followers) {
          try {
            await this.feedService.addToFeed(followerId, postId, timestamp);
          } catch (err) {
            this.logger.warn(`Failed to add post to feed for user=${followerId}`, err);
          }
        }
      });

      await this.kafkaConsumer.startConsuming();
      this.logger.log('Feed consumer started');
    } catch (error) {
      this.logger.error('Failed to start feed consumer (graceful degradation):', error);
    }
  }
}
