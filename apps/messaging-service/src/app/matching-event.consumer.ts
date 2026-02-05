import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import { MessagingService } from './messaging.service';

@Injectable()
export class MatchingEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(MatchingEventConsumer.name);

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly messagingService: MessagingService,
  ) {}

  async onModuleInit() {
    try {
      // 訂閱 matching.matched 事件
      await this.kafkaConsumer.subscribe('matching.matched', async (payload) => {
        const { message } = payload;
        const event = JSON.parse(message.value.toString());
        
        this.logger.log(`Received matching.matched event: matchId=${event.matchId}`);
        
        // 自動建立對話
        const conversationId = this.messagingService.ensureConversation(
          event.userAId,
          event.userBId
        );
        
        this.logger.log(`Conversation created/ensured: conversationId=${conversationId} for matchId=${event.matchId}`);
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
