import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import { PAYMENT_EVENTS } from '@suggar-daddy/common';
import { SubscriptionService } from '../subscription.service';

@Injectable()
export class PaymentEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(PaymentEventConsumer.name);

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async onModuleInit() {
    try {
      await this.kafkaConsumer.subscribe(PAYMENT_EVENTS.PAYMENT_COMPLETED, async (payload) => {
        const value = payload.message?.value;
        if (!value) return;
        const event = JSON.parse(value.toString());
        if (event.type !== 'subscription' || !event.metadata?.subscriptionId) {
          return;
        }
        const subscriptionId = event.metadata.subscriptionId;
        this.logger.log(`Payment completed for subscription ${subscriptionId}, extending period`);
        try {
          const nextEnd = new Date();
          nextEnd.setMonth(nextEnd.getMonth() + 1);
          await this.subscriptionService.extendPeriod(subscriptionId, nextEnd.toISOString());
          this.logger.log(`Subscription ${subscriptionId} period extended to ${nextEnd.toISOString()}`);
        } catch (err) {
          this.logger.error(`Failed to extend subscription ${subscriptionId}:`, err);
        }
      });
      await this.kafkaConsumer.startConsuming();
      this.logger.log('Payment event consumer started');
    } catch (error) {
      this.logger.error('Failed to start payment event consumer (graceful degradation):', error);
    }
  }
}
