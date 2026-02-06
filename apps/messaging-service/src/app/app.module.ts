import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaModule } from '@suggar-daddy/kafka';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MatchingEventConsumer } from './matching-event.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    KafkaModule.forRoot({
      clientId: 'messaging-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      groupId: 'messaging-service-group',
    }),
  ],
  controllers: [AppController, MessagingController],
  providers: [AppService, MessagingService, MatchingEventConsumer],
})
export class AppModule {}
