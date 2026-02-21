import { Injectable, Logger } from '@nestjs/common';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { BEHAVIOR_EVENTS } from '@suggar-daddy/common';
import type {
  BehaviorEventDto,
  BehaviorBatchResponseDto,
} from '@suggar-daddy/dto';

@Injectable()
export class BehaviorService {
  private readonly logger = new Logger(BehaviorService.name);

  private readonly MAX_BATCH_SIZE = 50;
  private readonly FAST_SWIPE_THRESHOLD_MS = 1000; // 1 second
  private readonly FAST_SWIPE_WEIGHT = 0.3;

  constructor(private readonly kafkaProducer: KafkaProducerService) {}

  async ingest(
    userId: string,
    events: BehaviorEventDto[],
  ): Promise<BehaviorBatchResponseDto> {
    if (!events || events.length === 0) {
      return { accepted: 0, rejected: 0 };
    }

    // Validate batch size
    if (events.length > this.MAX_BATCH_SIZE) {
      this.logger.warn(
        `Batch exceeds max size userId=${userId} size=${events.length} max=${this.MAX_BATCH_SIZE}`,
      );
      events = events.slice(0, this.MAX_BATCH_SIZE);
    }

    let accepted = 0;
    let rejected = 0;
    const validEvents: BehaviorEventDto[] = [];

    for (const event of events) {
      // Validate required fields
      if (!event.eventType || !event.targetUserId || !event.timestamp) {
        rejected++;
        continue;
      }

      // Filter fast-swipes (< 1s) with lower weight
      if (
        event.eventType === 'swipe' &&
        event.metadata?.durationMs !== undefined &&
        event.metadata.durationMs < this.FAST_SWIPE_THRESHOLD_MS
      ) {
        // Still accept but mark as low-weight
        validEvents.push({
          ...event,
          metadata: {
            ...event.metadata,
            weight: this.FAST_SWIPE_WEIGHT,
            fastSwipe: true,
          },
        } as BehaviorEventDto);
        accepted++;
        continue;
      }

      validEvents.push(event);
      accepted++;
    }

    // Publish to Kafka
    if (validEvents.length > 0) {
      try {
        await this.kafkaProducer.sendEvent(BEHAVIOR_EVENTS.BEHAVIOR_BATCH, {
          userId,
          events: validEvents.map((e) => ({
            eventType: e.eventType,
            targetUserId: e.targetUserId,
            metadata: e.metadata ?? {},
            timestamp: e.timestamp,
          })),
          batchTimestamp: new Date().toISOString(),
        });

        this.logger.log(
          `behavior batch ingested userId=${userId} accepted=${accepted} rejected=${rejected}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to publish behavior batch userId=${userId}`,
          err,
        );
        // Still return accepted count since we validated them
      }
    }

    return { accepted, rejected };
  }
}
