import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { KafkaModuleOptions } from './kafka.module';

export type MessageHandler = (payload: EachMessagePayload) => Promise<void>;

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private connected = false;

  constructor(
    @Inject('KAFKA_OPTIONS') private readonly options: KafkaModuleOptions
  ) {
    this.kafka = new Kafka({
      clientId: this.options.clientId,
      brokers: this.options.brokers,
    });
    this.consumer = this.kafka.consumer({
      groupId: this.options.groupId || 'default-group'
    });
  }

  async onModuleInit() {
    try {
      await this.consumer.connect();
      this.connected = true;
      this.logger.log('Kafka Consumer connected');
    } catch (error) {
      this.connected = false;
      this.logger.error('Failed to connect Kafka Consumer (graceful degradation):', error);
      // Graceful degradation: service continues without Kafka
    }
  }

  async onModuleDestroy() {
    if (this.connected) {
      await this.consumer.disconnect();
      this.logger.log('Kafka Consumer disconnected');
    }
  }

  async subscribe(topic: string, handler: MessageHandler) {
    this.messageHandlers.set(topic, handler);
    if (!this.connected) {
      this.logger.warn(`Kafka not connected, topic ${topic} registered but not subscribed`);
      return;
    }
    try {
      await this.consumer.subscribe({ topic, fromBeginning: false });
      this.logger.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic ${topic} (graceful degradation):`, error);
    }
  }

  async startConsuming() {
    if (!this.connected) {
      this.logger.warn('Kafka not connected, consuming not started (graceful degradation)');
      return;
    }
    try {
      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          const { topic } = payload;
          const handler = this.messageHandlers.get(topic);

          if (handler) {
            try {
              await handler(payload);
            } catch (error) {
              this.logger.error(`Error processing message from topic ${topic}:`, error);
            }
          }
        },
      });
      this.logger.log('Kafka Consumer started');
    } catch (error) {
      this.logger.error('Failed to start consuming (graceful degradation):', error);
    }
  }
}
