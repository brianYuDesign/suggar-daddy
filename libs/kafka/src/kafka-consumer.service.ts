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
      this.logger.log('Kafka Consumer connected');
    } catch (error) {
      this.logger.error('Failed to connect Kafka Consumer (graceful degradation):', error);
      // Graceful degradation: service continues without Kafka
    }
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
    this.logger.log('Kafka Consumer disconnected');
  }

  async subscribe(topic: string, handler: MessageHandler) {
    this.messageHandlers.set(topic, handler);
    await this.consumer.subscribe({ topic, fromBeginning: false });
    this.logger.log(`Subscribed to topic: ${topic}`);
  }

  async startConsuming() {
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
  }
}
