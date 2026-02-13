import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import { SOCIAL_EVENTS, CONTENT_EVENTS, MESSAGING_EVENTS } from '@suggar-daddy/common';
import { NotificationService } from './notification.service';

@Injectable()
export class SocialEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(SocialEventConsumer.name);

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    try {
      // Follow notification
      await this.kafkaConsumer.subscribe(SOCIAL_EVENTS.USER_FOLLOWED, async (payload) => {
        const event = JSON.parse(payload.message.value.toString());
        await this.notificationService.send({
          userId: event.followedId,
          type: 'follow',
          title: '新粉絲！',
          body: '有人開始追蹤你了',
          data: { followerId: event.followerId },
        });
      });

      // Comment reply notification
      await this.kafkaConsumer.subscribe(CONTENT_EVENTS.COMMENT_CREATED, async (payload) => {
        const event = JSON.parse(payload.message.value.toString());
        if (event.parentCommentId) {
          if (event.parentCommentUserId && event.parentCommentUserId !== event.userId) {
            await this.notificationService.send({
              userId: event.parentCommentUserId,
              type: 'comment_reply',
              title: '留言回覆',
              body: '有人回覆了你的留言',
              data: { postId: event.postId, commentId: event.commentId },
            });
          }
        }
      });

      // Broadcast notification
      await this.kafkaConsumer.subscribe(MESSAGING_EVENTS.BROADCAST_SENT, async (payload) => {
        const event = JSON.parse(payload.message.value.toString());
        this.logger.log(`Broadcast notification: broadcastId=${event.broadcastId} recipients=${event.recipientCount}`);
      });

      await this.kafkaConsumer.startConsuming();
      this.logger.log('Social event consumer started');
    } catch (error) {
      this.logger.error('Failed to start social event consumer (graceful degradation):', error);
    }
  }
}
