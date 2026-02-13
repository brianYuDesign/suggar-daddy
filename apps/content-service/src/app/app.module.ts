import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import {
  EnvConfigModule,
  AppConfigService,
  CloudFrontModule,
} from "@suggar-daddy/common";
import { AuthModule } from "@suggar-daddy/auth";
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
import { FeedController } from "./feed.controller";
import { FeedService } from "./feed.service";
import { DiscoveryController } from "./discovery.controller";
import { DiscoveryService } from "./discovery.service";
import { StoryController } from "./story.controller";
import { StoryService } from "./story.service";
import { FeedConsumer } from "./consumers/feed.consumer";
import { TrendingConsumer } from "./consumers/trending.consumer";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    EnvConfigModule,
    AuthModule,
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
  controllers: [
    AppController,
    FeedController,
    DiscoveryController,
    PostController,
    ModerationController,
    VideoController,
    StoryController,
  ],
  providers: [
    AppService,
    PostService,
    ModerationService,
    SubscriptionServiceClient,
    PostPurchaseConsumer,
    VideoProcessedConsumer,
    FeedService,
    DiscoveryService,
    StoryService,
    FeedConsumer,
    TrendingConsumer,
  ],
})
export class AppModule {}
