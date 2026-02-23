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
  private pendingTopics: Set<string> = new Set();
  private connected = false;
  private running = false;
  private runPromise: Promise<void> | null = null;

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

  /**
   * Register a handler for a topic. The actual kafkajs consumer.subscribe()
   * is deferred until startConsuming() is called, preventing the
   * "Cannot subscribe to topic while consumer is running" race condition
   * when multiple consumers share the same KafkaConsumerService instance.
   */
  async subscribe(topic: string, handler: MessageHandler) {
    this.messageHandlers.set(topic, handler);
    this.pendingTopics.add(topic);

    if (!this.connected) {
      this.logger.warn(`Kafka not connected, topic ${topic} registered but not subscribed`);
      return;
    }

    // If consumer is already running, subscribe immediately and log a warning.
    // kafkajs supports subscribing to new topics while running only after stop/start,
    // but we handle this gracefully.
    if (this.running) {
      this.logger.warn(
        `Topic ${topic} registered after consumer already started. ` +
        `Handler is stored but the topic will not be consumed until the consumer is restarted.`,
      );
      return;
    }

    this.logger.log(`Registered handler for topic: ${topic}`);
  }

  /**
   * Subscribe to all pending topics and start the consumer.
   * Safe to call multiple times — only the first invocation actually starts
   * the consumer; subsequent calls are no-ops (the promise of the first
   * call is returned so callers can await it).
   */
  async startConsuming() {
    if (!this.connected) {
      this.logger.warn('Kafka not connected, consuming not started (graceful degradation)');
      return;
    }

    // If already running (or in the process of starting), return the existing promise
    if (this.runPromise) {
      return this.runPromise;
    }

    this.runPromise = this._startConsuming();
    return this.runPromise;
  }

  private async _startConsuming() {
    try {
      // Subscribe to all registered topics before calling consumer.run()
      const topics = Array.from(this.pendingTopics);
      for (const topic of topics) {
        try {
          await this.consumer.subscribe({ topic, fromBeginning: false });
          this.logger.log(`Subscribed to topic: ${topic}`);
        } catch (error) {
          this.logger.error(`Failed to subscribe to topic ${topic} (graceful degradation):`, error);
        }
      }
      this.pendingTopics.clear();

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
      this.running = true;
      this.logger.log('Kafka Consumer started');
    } catch (error) {
      this.runPromise = null;
      this.logger.error('Failed to start consuming (graceful degradation):', error);
    }
  }
}
