import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { KafkaModuleOptions } from './kafka.module';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor(
    @Inject('KAFKA_OPTIONS') private readonly options: KafkaModuleOptions
  ) {
    this.kafka = new Kafka({
      clientId: this.options.clientId,
      brokers: this.options.brokers,
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.logger.log('Kafka Producer connected');
    } catch (error) {
      this.logger.error('Failed to connect Kafka Producer (graceful degradation):', error);
      // Graceful degradation: service continues without Kafka
    }
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    this.logger.log('Kafka Producer disconnected');
  }

  async send(topic: string, messages: { key?: string; value: string }[]) {
    try {
      const result = await this.producer.send({
        topic,
        messages,
      });
      this.logger.log(`Message sent to topic ${topic}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send message to topic ${topic}:`, error);
      // Graceful degradation: log error but don't throw
      return null;
    }
  }

  async sendEvent(topic: string, event: any) {
    return this.send(topic, [
      {
        key: event.id || Date.now().toString(),
        value: JSON.stringify(event),
      },
    ]);
  }
}
