import { Module, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { KafkaConsumerService } from "@suggar-daddy/kafka";
import { ConfigModule } from "@nestjs/config";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import {
  EnvConfigModule,
  AppConfigService,
  CloudFrontModule,
} from "@suggar-daddy/common";
import { AuthModule } from "@suggar-daddy/auth";
import { DatabaseModule } from "@suggar-daddy/database";
import { ModerationModule } from "@suggar-daddy/moderation";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PostController } from "./post.controller";
import { PostService } from "./post.service";
import { ModerationController } from "./moderation.controller";
import { ModerationService } from "./moderation.service";
import { AppealController } from "./appeal.controller";
import { AppealService } from "./appeal.service";
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
import { ModerationPipelineConsumer } from "./consumers/moderation-pipeline.consumer";
import { NsfwClientService } from "./nsfw-client.service";
import { BlogModule } from "./blog/blog.module";
import { StaticPageModule } from "./static-page/static-page.module";

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
    DatabaseModule.forRoot(),
    ModerationModule.forRoot(),
    BlogModule,
    StaticPageModule,
  ],
  controllers: [
    AppController,
    FeedController,
    DiscoveryController,
    PostController,
    ModerationController,
    AppealController,
    VideoController,
    StoryController,
  ],
  providers: [
    AppService,
    PostService,
    ModerationService,
    AppealService,
    NsfwClientService,
    SubscriptionServiceClient,
    PostPurchaseConsumer,
    VideoProcessedConsumer,
    FeedService,
    DiscoveryService,
    StoryService,
    FeedConsumer,
    TrendingConsumer,
    ModerationPipelineConsumer,
  ],
})
export class AppModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly kafkaConsumer: KafkaConsumerService) {}

  async onApplicationBootstrap() {
    try {
      await this.kafkaConsumer.startConsuming();
      this.logger.log('Kafka consumer started (all topics subscribed)');
    } catch (error) {
      this.logger.error('Failed to start Kafka consumer:', error);
    }
  }
}
