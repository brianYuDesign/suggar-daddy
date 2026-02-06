import { Injectable, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import {
  SUBSCRIPTION_EVENTS,
  SubscriptionCreatedEvent,
} from '@suggar-daddy/common';

@Injectable()
export class SubscriptionProducer {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // Connect to Kafka
    await this.kafkaClient.connect();
  }

  async emitSubscriptionCreated(event: SubscriptionCreatedEvent) {
    return this.kafkaClient.emit(
      SUBSCRIPTION_EVENTS.SUBSCRIPTION_CREATED,
      event,
    );
  }

  async emitSubscriptionUpdated(subscriptionId: string, data: any) {
    return this.kafkaClient.emit(SUBSCRIPTION_EVENTS.SUBSCRIPTION_UPDATED, {
      subscriptionId,
      ...data,
    });
  }

  async emitSubscriptionCancelled(subscriptionId: string, reason?: string) {
    return this.kafkaClient.emit(SUBSCRIPTION_EVENTS.SUBSCRIPTION_CANCELLED, {
      subscriptionId,
      reason,
      cancelledAt: new Date(),
    });
  }

  async emitTierCreated(tierId: string, creatorId: string, data: any) {
    return this.kafkaClient.emit(SUBSCRIPTION_EVENTS.TIER_CREATED, {
      tierId,
      creatorId,
      ...data,
    });
  }
}