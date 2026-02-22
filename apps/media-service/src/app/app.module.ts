import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TypeOrmModule } from "@nestjs/typeorm";
import { resolve } from "path";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import { EnvConfigModule, AppConfigService } from "@suggar-daddy/common";
import { AuthModule } from "@suggar-daddy/auth";
import { DatabaseModule } from "@suggar-daddy/database";
import { UploadSession } from "@suggar-daddy/entities";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { MediaUploadController } from "./media-upload.controller";
import { UploadController } from "./upload/upload.controller";
import { ChunkedUploadController } from "./upload/chunked-upload.controller";
import { ChunkedUploadService } from "./upload/chunked-upload.service";
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
    DatabaseModule.forRoot(),
    TypeOrmModule.forFeature([UploadSession]),
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
    ChunkedUploadController,
  ],
  providers: [AppService, MediaService, VideoProcessorService, ChunkedUploadService],
})
export class AppModule {}
