import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import {
  EnvConfigModule,
  AppConfigService,
} from "@suggar-daddy/common";
import { AuthModule } from "@suggar-daddy/auth";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MatchingController } from "./matching.controller";
import { MatchingService } from "./matching.service";
import { UserServiceClient } from "./user-service.client";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
  providers: [AppService, MatchingService, UserServiceClient],
})
export class AppModule {}
