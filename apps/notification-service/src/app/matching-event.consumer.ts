import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import { NotificationService } from './notification.service';

@Injectable()
export class MatchingEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(MatchingEventConsumer.name);

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    try {
      // 訂閱 matching.matched 事件
      await this.kafkaConsumer.subscribe('matching.matched', async (payload) => {
        const { message } = payload;
        const event = JSON.parse(message.value.toString());
        
        this.logger.log(`Received matching.matched event: matchId=${event.matchId}`);
        
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
