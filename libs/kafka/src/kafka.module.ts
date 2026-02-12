import { Module, Global, DynamicModule, InjectionToken, OptionalFactoryDependency } from "@nestjs/common";
import { KafkaProducerService } from "./kafka-producer.service";
import { KafkaConsumerService } from "./kafka-consumer.service";
import { KafkaDLQService } from "./kafka-dlq.service";
import { KafkaRetryStrategy } from "./kafka-retry-strategy.service";

export interface KafkaModuleOptions {
  brokers: string[];
  clientId: string;
  groupId?: string;
}

export interface KafkaModuleAsyncOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory: (...args: any[]) => Promise<KafkaModuleOptions> | KafkaModuleOptions;
  inject?: Array<InjectionToken | OptionalFactoryDependency>;
}

@Global()
@Module({})
export class KafkaModule {
  static forRoot(options: KafkaModuleOptions): DynamicModule {
    return {
      module: KafkaModule,
      providers: [
        {
          provide: "KAFKA_OPTIONS",
          useValue: options,
        },
        KafkaProducerService,
        KafkaConsumerService,
        KafkaDLQService,
        KafkaRetryStrategy,
      ],
      exports: [
        KafkaProducerService,
        KafkaConsumerService,
        KafkaDLQService,
        KafkaRetryStrategy,
      ],
    };
  }

  static forRootAsync(options: KafkaModuleAsyncOptions): DynamicModule {
    return {
      module: KafkaModule,
      providers: [
        {
          provide: "KAFKA_OPTIONS",
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        KafkaProducerService,
        KafkaConsumerService,
        KafkaDLQService,
        KafkaRetryStrategy,
      ],
      exports: [
        KafkaProducerService,
        KafkaConsumerService,
        KafkaDLQService,
        KafkaRetryStrategy,
      ],
    };
  }
}
