import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import {
  JwtStrategy,
  EnvConfigModule,
  AppConfigService,
  CloudFrontModule,
} from "@suggar-daddy/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PostController } from "./post.controller";
import { PostService } from "./post.service";
import { ModerationController } from "./moderation.controller";
import { ModerationService } from "./moderation.service";
import { SubscriptionServiceClient } from "./subscription-service.client";
import { PostPurchaseConsumer } from "./events/post-purchase.consumer";
import { VideoController } from "./video.controller";
import { VideoProcessedConsumer } from "./events/video-processed.consumer";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
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
    RedisModule.forRoot(),
    KafkaModule.forRootAsync({
      useFactory: (config: AppConfigService) => ({
        clientId: config.kafkaClientId,
        brokers: config.kafkaBrokers,
        groupId: config.kafkaGroupId,
      }),
      inject: [AppConfigService],
    }),
    CloudFrontModule.forRoot(),
  ],
  controllers: [AppController, PostController, ModerationController, VideoController],
  providers: [
    AppService,
    PostService,
    ModerationService,
    SubscriptionServiceClient,
    JwtStrategy,
    PostPurchaseConsumer,
    VideoProcessedConsumer,
  ],
})
export class AppModule {}
