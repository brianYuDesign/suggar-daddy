import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import {
  UploadModule,
  JwtStrategy,
  EnvConfigModule,
  AppConfigService,
  S3Module,
} from "@suggar-daddy/common";

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
    UploadModule.forRoot(),
    S3Module.forRoot(),
  ],
  controllers: [AppController, MediaController, UploadController],
  providers: [AppService, MediaService, JwtStrategy, VideoProcessorService],
})
export class AppModule {}
