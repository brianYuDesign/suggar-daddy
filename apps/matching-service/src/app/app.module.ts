import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import {
  JwtStrategy,
  EnvConfigModule,
  AppConfigService,
} from "@suggar-daddy/common";
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
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: config.jwtExpiresIn },
      }),
    }),
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
  providers: [AppService, MatchingService, UserServiceClient, JwtStrategy],
})
export class AppModule {}
