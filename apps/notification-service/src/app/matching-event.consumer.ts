import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import { MATCHING_EVENTS } from '@suggar-daddy/common';
import { NotificationService } from './notification.service';

@Injectable()
export class MatchingEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(MatchingEventConsumer.name);

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly notificationService: NotificationService,
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
            // 發送通知給兩個用戶
            await this.notificationService.send({
              userId: event.userAId,
              type: 'match',
              title: '新配對！',
              body: '你們互相喜歡對方，現在可以開始聊天了！',
              data: {
                matchId: event.matchId,
                userId: event.userBId,
              },
            });

            await this.notificationService.send({
              userId: event.userBId,
              type: 'match',
              title: '新配對！',
              body: '你們互相喜歡對方，現在可以開始聊天了！',
              data: {
                matchId: event.matchId,
                userId: event.userAId,
              },
            });

            this.logger.log(`Sent match notifications for matchId=${event.matchId}`);
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
