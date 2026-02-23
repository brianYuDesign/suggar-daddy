import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import {
  CONTENT_EVENTS,
  MODERATION_EVENTS,
  InjectLogger,
} from '@suggar-daddy/common';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { RedisService } from '@suggar-daddy/redis';
import { TextFilterService } from '@suggar-daddy/moderation';
import type { ModerationResult, ModerationSeverity } from '@suggar-daddy/moderation';
import { NsfwClientService } from '../nsfw-client.service';
import { ModerationService } from '../moderation.service';

const MODERATION_RESULT_KEY = (type: string, id: string) =>
  `moderation:result:${type}:${id}`;
const MODERATION_FLAGGED_QUEUE = 'moderation:queue:flagged';

@Injectable()
export class ModerationPipelineConsumer implements OnModuleInit {
  @InjectLogger() private readonly logger!: Logger;
  private readonly maxRetries = 3;

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly redis: RedisService,
    private readonly textFilter: TextFilterService,
    private readonly nsfwClient: NsfwClientService,
    private readonly moderationService: ModerationService,
  ) {}

  async onModuleInit() {
    try {
      const topics = [
        { topic: CONTENT_EVENTS.POST_CREATED, contentType: 'post' as const },
        { topic: CONTENT_EVENTS.COMMENT_CREATED, contentType: 'comment' as const },
        { topic: CONTENT_EVENTS.STORY_CREATED, contentType: 'story' as const },
      ];

      for (const { topic, contentType } of topics) {
        await this.kafkaConsumer.subscribe(topic, async (payload) => {
          const value = payload.message?.value;
          if (!value) return;
          const event = JSON.parse(value.toString());

          let lastErr: unknown;
          for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
              await this.processContent(contentType, event);
              return;
            } catch (err) {
              lastErr = err;
              this.logger.warn(
                `Moderation pipeline error for ${topic} (attempt ${attempt + 1}/${this.maxRetries + 1}):`,
                err,
              );
              if (attempt < this.maxRetries) {
                await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
              }
            }
          }
          this.logger.error(
            `Moderation pipeline failed for ${topic} after ${this.maxRetries + 1} attempts. Event: ${JSON.stringify(event)}`,
            lastErr instanceof Error ? lastErr.stack : String(lastErr),
          );
        });
      }

      this.logger.log('Moderation pipeline consumer subscribed');
    } catch (error) {
      this.logger.error('Failed to subscribe moderation pipeline consumer (graceful degradation):', error);
    }
  }

  private async processContent(
    contentType: 'post' | 'comment' | 'story',
    event: Record<string, unknown>,
  ): Promise<void> {
    const contentId = this.getContentId(contentType, event);
    const creatorId = (event.creatorId as string) || (event.userId as string) || '';
    const text = this.getTextContent(contentType, event);
    const mediaUrls = (event.mediaUrls as string[]) || [];

    // 1. Text filtering
    const textResult = text ? this.textFilter.check(text) : undefined;

    // 2. NSFW image check (only if media present)
    const imageResults = mediaUrls.length > 0
      ? await this.nsfwClient.checkImages(mediaUrls)
      : undefined;

    // 3. Resolve overall severity
    const overallSeverity = this.resolveOverallSeverity(textResult, imageResults);

    // 4. Determine action
    const action = this.determineAction(overallSeverity);

    // 5. Build moderation result
    const result: ModerationResult = {
      contentType,
      contentId,
      textResult,
      imageResults,
      overallSeverity,
      action,
      processedAt: new Date().toISOString(),
    };

    // 6. Store result in Redis
    await this.redis.set(
      MODERATION_RESULT_KEY(contentType, contentId),
      JSON.stringify(result),
      86400 * 30, // 30 day TTL
    );

    // 7. Take action based on severity
    if (action === 'auto_hide' && contentType === 'post') {
      await this.moderationService.takeDownPost(contentId, 'auto-moderation');
      await this.kafkaProducer.sendEvent(MODERATION_EVENTS.CONTENT_AUTO_HIDDEN, {
        contentType,
        contentId,
        creatorId,
        overallSeverity,
        textCategory: textResult?.category,
        flaggedWords: textResult?.flaggedWords,
        nsfwScore: this.getHighestNsfwScore(imageResults),
        processedAt: result.processedAt,
      });
      this.logger.warn(`content auto-hidden type=${contentType} id=${contentId} severity=${overallSeverity}`);
    } else if (action === 'flag') {
      // Add to flagged queue sorted set (score = timestamp)
      const client = this.redis.getClient();
      await client.zadd(MODERATION_FLAGGED_QUEUE, Date.now(), `${contentType}:${contentId}`);
      await this.kafkaProducer.sendEvent(MODERATION_EVENTS.CONTENT_FLAGGED, {
        contentType,
        contentId,
        creatorId,
        overallSeverity,
        textCategory: textResult?.category,
        flaggedWords: textResult?.flaggedWords,
        nsfwScore: this.getHighestNsfwScore(imageResults),
        processedAt: result.processedAt,
      });
      this.logger.log(`content flagged type=${contentType} id=${contentId} severity=${overallSeverity}`);
    }

    // 8. Always emit moderated event
    await this.kafkaProducer.sendEvent(MODERATION_EVENTS.CONTENT_MODERATED, {
      contentType,
      contentId,
      creatorId,
      overallSeverity,
      action,
      textCategory: textResult?.category,
      flaggedWords: textResult?.flaggedWords,
      nsfwScore: this.getHighestNsfwScore(imageResults),
      processedAt: result.processedAt,
    });
  }

  private getContentId(contentType: string, event: Record<string, unknown>): string {
    switch (contentType) {
      case 'post': return event.postId as string;
      case 'comment': return event.commentId as string;
      case 'story': return event.storyId as string;
      default: return event.id as string;
    }
  }

  private getTextContent(contentType: string, event: Record<string, unknown>): string | undefined {
    switch (contentType) {
      case 'post': return event.caption as string | undefined;
      case 'comment': return event.content as string | undefined;
      case 'story': return event.caption as string | undefined;
      default: return undefined;
    }
  }

  private resolveOverallSeverity(
    textResult?: { severity: ModerationSeverity | null },
    imageResults?: { nsfwScore: number }[],
  ): ModerationSeverity | null {
    const severityOrder: Record<string, number> = { low: 1, medium: 2, high: 3 };
    let highest: ModerationSeverity | null = null;

    // Check text severity
    if (textResult?.severity) {
      highest = textResult.severity;
    }

    // Check image severity
    if (imageResults) {
      for (const img of imageResults) {
        let imgSeverity: ModerationSeverity | null = null;
        if (img.nsfwScore >= 0.8) {
          imgSeverity = 'high';
        } else if (img.nsfwScore >= 0.5) {
          imgSeverity = 'medium';
        }

        if (imgSeverity && (!highest || severityOrder[imgSeverity] > severityOrder[highest])) {
          highest = imgSeverity;
        }
      }
    }

    return highest;
  }

  private determineAction(severity: ModerationSeverity | null): 'pass' | 'flag' | 'auto_hide' {
    switch (severity) {
      case 'high': return 'auto_hide';
      case 'medium': return 'flag';
      case 'low': return 'pass';
      default: return 'pass';
    }
  }

  private getHighestNsfwScore(imageResults?: { nsfwScore: number }[]): number | undefined {
    if (!imageResults || imageResults.length === 0) return undefined;
    return Math.max(...imageResults.map((r) => r.nsfwScore));
  }
}
