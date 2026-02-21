import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@suggar-daddy/redis';
import { KafkaModule } from '@suggar-daddy/kafka';
import {
  EnvConfigModule,
  AppConfigService,
} from '@suggar-daddy/common';
import { AuthModule } from '@suggar-daddy/auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { UserServiceClient } from './user-service.client';
import { PaymentServiceClient } from './payment-service.client';
import { CompatibilityService } from './compatibility.service';
import { DiscoveryService } from './discovery.service';
import { SwipeService } from './swipe.service';
import { LikesMeService } from './likes-me.service';
import { BehaviorService } from './behavior.service';
import { MlClientService } from './ml-client.service';
import { SubscriptionServiceClient } from './subscription-service.client';
import { ContentServiceClient } from './content-service.client';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EnvConfigModule,
    AuthModule,
    RedisModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        host: config.redisHost,
        port: config.redisPort,
      }),
    }),
    KafkaModule.forRootAsync({
      useFactory: (config: AppConfigService) => ({
        clientId: config.kafkaClientId,
        brokers: config.kafkaBrokers,
        groupId: config.kafkaGroupId,
      }),
      inject: [AppConfigService],
    }),
  ],
  controllers: [AppController, MatchingController],
  providers: [
    AppService,
    MatchingService,
    UserServiceClient,
    PaymentServiceClient,
    CompatibilityService,
    DiscoveryService,
    SwipeService,
    LikesMeService,
    BehaviorService,
    MlClientService,
    SubscriptionServiceClient,
    ContentServiceClient,
  ],
})
export class AppModule {}
