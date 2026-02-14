import { Module, DynamicModule } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

export interface KafkaModuleOptions {
  name: string;
  clientId: string;
  groupId: string;
}

@Module({})
export class KafkaModule {
  static register(options: KafkaModuleOptions): DynamicModule {
    return {
      module: KafkaModule,
      imports: [
        ClientsModule.register([
          {
            name: options.name,
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: options.clientId,
                brokers: (process.env['KAFKA_BROKERS'] || 'localhost:9094').split(','),
              },
              consumer: {
                groupId: options.groupId,
                allowAutoTopicCreation: true,
              },
              producer: {
                allowAutoTopicCreation: true,
              },
            },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}