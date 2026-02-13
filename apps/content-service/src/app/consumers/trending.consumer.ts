import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import { CONTENT_EVENTS } from '@suggar-daddy/common';
import { DiscoveryService } from '../discovery.service';

@Injectable()
export class TrendingConsumer implements OnModuleInit {
  private readonly logger = new Logger(TrendingConsumer.name);

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly discoveryService: DiscoveryService,
  ) {}

  async onModuleInit() {
    try {
      // Listen for likes
      await this.kafkaConsumer.subscribe(CONTENT_EVENTS.POST_LIKED, async (payload) => {
        const value = payload.message?.value;
        if (!value) return;
        const event = JSON.parse(value.toString());
        if (event.postId) {
          await this.discoveryService.updateTrendingScore(event.postId, 'like');
        }
      });

      // Listen for comments
      await this.kafkaConsumer.subscribe(CONTENT_EVENTS.COMMENT_CREATED, async (payload) => {
        const value = payload.message?.value;
        if (!value) return;
        const event = JSON.parse(value.toString());
        if (event.postId) {
          await this.discoveryService.updateTrendingScore(event.postId, 'comment');
        }
      });

      // Listen for bookmarks
      await this.kafkaConsumer.subscribe(CONTENT_EVENTS.POST_BOOKMARKED, async (payload) => {
        const value = payload.message?.value;
        if (!value) return;
        const event = JSON.parse(value.toString());
        if (event.postId) {
          await this.discoveryService.updateTrendingScore(event.postId, 'bookmark');
        }
      });

      await this.kafkaConsumer.startConsuming();
      this.logger.log('Trending consumer started');
    } catch (error) {
      this.logger.error('Failed to start trending consumer (graceful degradation):', error);
    }
  }
}
