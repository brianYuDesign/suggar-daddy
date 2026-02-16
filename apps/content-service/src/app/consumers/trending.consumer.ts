import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import { CONTENT_EVENTS, InjectLogger } from '@suggar-daddy/common';
import { DiscoveryService } from '../discovery.service';

@Injectable()
export class TrendingConsumer implements OnModuleInit {
  @InjectLogger() private readonly logger!: Logger;

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly discoveryService: DiscoveryService,
  ) {}

  private readonly maxRetries = 3;

  async onModuleInit() {
    try {
      const trendingTopics: Array<{ topic: string; action: 'like' | 'comment' | 'bookmark' }> = [
        { topic: CONTENT_EVENTS.POST_LIKED, action: 'like' },
        { topic: CONTENT_EVENTS.COMMENT_CREATED, action: 'comment' },
        { topic: CONTENT_EVENTS.POST_BOOKMARKED, action: 'bookmark' },
      ];

      for (const { topic, action } of trendingTopics) {
        await this.kafkaConsumer.subscribe(topic, async (payload) => {
          const value = payload.message?.value;
          if (!value) return;
          const event = JSON.parse(value.toString());
          if (!event.postId) return;

          let lastErr: unknown;
          for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
              await this.discoveryService.updateTrendingScore(event.postId, action);
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
        });
      }

      await this.kafkaConsumer.startConsuming();
      this.logger.log('Trending consumer started');
    } catch (error) {
      this.logger.error('Failed to start trending consumer (graceful degradation):', error);
    }
  }
}
