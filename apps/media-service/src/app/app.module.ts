import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import {
  UploadModule,
  EnvConfigModule,
  AppConfigService,
  S3Module,
} from "@suggar-daddy/common";
import { AuthModule } from "@suggar-daddy/auth";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { UploadController } from "./upload/upload.controller";
import { VideoProcessorService } from "./video/video-processor";

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
    UploadModule.forRoot(),
    S3Module.forRoot(),
  ],
  controllers: [AppController, MediaController, UploadController],
  providers: [AppService, MediaService, VideoProcessorService],
})
export class AppModule {}
