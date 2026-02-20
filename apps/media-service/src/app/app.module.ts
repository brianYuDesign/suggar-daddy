import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { resolve } from "path";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import { EnvConfigModule, AppConfigService } from "@suggar-daddy/common";
import { AuthModule } from "@suggar-daddy/auth";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { MediaUploadController } from "./media-upload.controller";
import { UploadController } from "./upload/upload.controller";
import { VideoProcessorService } from "./video/video-processor";
import { LocalStorageModule } from "./storage/local-storage.module";

const uploadDir = process.env.UPLOAD_DIR || "./uploads";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    ServeStaticModule.forRoot({
      rootPath: resolve(uploadDir),
      serveRoot: "/uploads",
      serveStaticOptions: { index: false },
    }),
    EnvConfigModule,
    AuthModule,
    LocalStorageModule,
    RedisModule.forRoot(),
    KafkaModule.forRootAsync({
      useFactory: (config: AppConfigService) => ({
        clientId: config.kafkaClientId,
        brokers: config.kafkaBrokers,
        groupId: config.kafkaGroupId,
      }),
      inject: [AppConfigService],
    }),
  ],
  controllers: [
    AppController,
    MediaController,
    MediaUploadController,
    UploadController,
  ],
  providers: [AppService, MediaService, VideoProcessorService],
})
export class AppModule {}
