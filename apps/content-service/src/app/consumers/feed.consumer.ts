import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import { CONTENT_EVENTS, InjectLogger } from '@suggar-daddy/common';
import { RedisService } from '@suggar-daddy/redis';
import { FeedService } from '../feed.service';

const USER_FOLLOWERS = (userId: string) => `user:followers:${userId}`;

@Injectable()
export class FeedConsumer implements OnModuleInit {
  @InjectLogger() private readonly logger!: Logger;

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly redis: RedisService,
    private readonly feedService: FeedService,
  ) {}

  private readonly maxRetries = 3;

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

        let lastErr: unknown;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
          try {
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
            return;
          } catch (err) {
            lastErr = err;
            this.logger.warn(
              `Error processing ${CONTENT_EVENTS.POST_CREATED} (attempt ${attempt + 1}/${this.maxRetries + 1}):`,
              err,
            );
            if (attempt < this.maxRetries) {
              await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
            }
          }
        }
        this.logger.error(
          `Failed processing ${CONTENT_EVENTS.POST_CREATED} after ${this.maxRetries + 1} attempts. Event: ${JSON.stringify(event)}`,
          lastErr instanceof Error ? lastErr.stack : String(lastErr),
        );
      });

      await this.kafkaConsumer.startConsuming();
      this.logger.log('Feed consumer started');
    } catch (error) {
      this.logger.error('Failed to start feed consumer (graceful degradation):', error);
    }
  }
}
