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
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.producer.send({ topic, messages });
        this.logger.log(`Message sent to topic ${topic}`);
        return result;
      } catch (error) {
        this.logger.error(`Failed to send to ${topic} (attempt ${attempt}/${maxRetries}):`, error);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500)); // exponential backoff
        }
      }
    }
    this.logger.error(`All ${maxRetries} attempts failed for topic ${topic} — message dropped`);
    return null;
  }

  async sendEvent(topic: string, event: any) {
    return this.send(topic, [
      {
        key: event.id || Date.now().toString(),
        value: JSON.stringify(event),
      },
    ]);
  }

  /** Fire-and-forget: sends event without awaiting. Errors are logged but not thrown. */
  sendEventAsync(topic: string, event: any): void {
    this.sendEvent(topic, event).catch((err) => {
      this.logger.error(`sendEventAsync failed for topic ${topic}:`, err);
    });
  }
}
