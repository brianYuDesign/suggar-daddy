import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import { MEDIA_EVENTS, InjectLogger } from '@suggar-daddy/common';
import { RedisService } from '@suggar-daddy/redis';

const POST_KEY = (id: string) => `post:${id}`;
const MEDIA_POST_INDEX = (mediaId: string) => `media:post:${mediaId}`;

@Injectable()
export class VideoProcessedConsumer implements OnModuleInit {
  @InjectLogger() private readonly logger!: Logger;

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    try {
      await this.kafkaConsumer.subscribe(MEDIA_EVENTS.VIDEO_PROCESSED, async (payload) => {
        const value = payload.message?.value;
        if (!value) return;

        const event = JSON.parse(value.toString());
        const { mediaId, s3Key, thumbnailUrl, previewUrl, processingStatus } = event;

        if (!mediaId) return;

        // Look up which post uses this mediaId via reverse index
        const postId = await this.redis.get(MEDIA_POST_INDEX(mediaId));
        if (!postId) {
          this.logger.warn(`No post found for mediaId=${mediaId}, skipping update`);
          return;
        }

        // Update the post's videoMeta
        const postRaw = await this.redis.get(POST_KEY(postId));
        if (!postRaw) {
          this.logger.warn(`Post ${postId} not found in Redis`);
          return;
        }

        const post = JSON.parse(postRaw);
        if (post.videoMeta) {
          post.videoMeta = {
            ...post.videoMeta,
            s3Key: s3Key || post.videoMeta.s3Key,
            thumbnailUrl: thumbnailUrl || post.videoMeta.thumbnailUrl,
            previewUrl: previewUrl || post.videoMeta.previewUrl,
            processingStatus: processingStatus || post.videoMeta.processingStatus,
          };
          await this.redis.set(POST_KEY(postId), JSON.stringify(post));
          this.logger.log(`Updated post ${postId} videoMeta from media.video.processed event`);
        }
      });

      await this.kafkaConsumer.startConsuming();
      this.logger.log('Video processed consumer started');
    } catch (error) {
      this.logger.error('Failed to start video processed consumer (graceful degradation):', error);
    }
  }
}
