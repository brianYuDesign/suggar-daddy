import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@suggar-daddy/redis';
import { KafkaModule } from '@suggar-daddy/kafka';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
      }),
    }),
    KafkaModule.forRoot({
      clientId: 'matching-service',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
      groupId: 'matching-service-group',
    }),
  ],
  controllers: [AppController, MatchingController],
  providers: [AppService, MatchingService],
})
export class AppModule {}
