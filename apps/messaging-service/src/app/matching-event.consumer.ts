import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import { MATCHING_EVENTS, InjectLogger } from '@suggar-daddy/common';
import { MessagingService } from './messaging.service';

@Injectable()
export class MatchingEventConsumer implements OnModuleInit {
  @InjectLogger() private readonly logger!: Logger;

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly messagingService: MessagingService,
  ) {}

  private readonly maxRetries = 3;

  async onModuleInit() {
    try {
      // 訂閱 matching.matched 事件
      await this.kafkaConsumer.subscribe(MATCHING_EVENTS.MATCHED, async (payload) => {
        const { message } = payload;
        const event = JSON.parse(message.value.toString());

        this.logger.log(`Received matching.matched event: matchId=${event.matchId}`);

        let lastErr: unknown;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
          try {
            // 自動建立對話
            const conversationId = await this.messagingService.ensureConversation(
              event.userAId,
              event.userBId
            );

            this.logger.log(`Conversation created/ensured: conversationId=${conversationId} for matchId=${event.matchId}`);
            return;
          } catch (err) {
            lastErr = err;
            this.logger.warn(
              `Error processing ${MATCHING_EVENTS.MATCHED} (attempt ${attempt + 1}/${this.maxRetries + 1}):`,
              err,
            );
            if (attempt < this.maxRetries) {
              await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
            }
          }
        }
        this.logger.error(
          `Failed processing ${MATCHING_EVENTS.MATCHED} after ${this.maxRetries + 1} attempts. Event: ${JSON.stringify(event)}`,
          lastErr instanceof Error ? lastErr.stack : String(lastErr),
        );
      });

      // 開始消費訊息
      await this.kafkaConsumer.startConsuming();
      this.logger.log('Matching event consumer started');
    } catch (error) {
      this.logger.error('Failed to start matching event consumer (graceful degradation):', error);
      // Graceful degradation: service continues without Kafka consumer
    }
  }
}
