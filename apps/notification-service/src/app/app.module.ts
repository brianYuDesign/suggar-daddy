import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaModule } from '@suggar-daddy/kafka';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { MatchingEventConsumer } from './matching-event.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    KafkaModule.forRoot({
      clientId: 'notification-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      groupId: 'notification-service-group',
    }),
  ],
  controllers: [AppController, NotificationController],
  providers: [AppService, NotificationService, MatchingEventConsumer],
})
export class AppModule {}
