import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@/config/config.service';
import { Video } from '@/entities/video.entity';
import { VideoQuality } from '@/entities/video-quality.entity';
import { TranscodingJob } from '@/entities/transcoding-job.entity';
import { UploadSession } from '@/entities/upload-session.entity';
import { Content } from '@/entities/content.entity';
import { ModerationLog } from '@/entities/moderation-log.entity';
import { VideoController } from '@/modules/streams/video.controller';
import { StreamingController } from '@/modules/streams/streaming.controller';
import { UploadController } from '@/modules/uploads/upload.controller';
import { TranscodingController } from '@/modules/transcoding/transcoding.controller';
import { QualityController } from '@/modules/quality/quality.controller';
import { VideoService } from '@/services/video.service';
import { S3Service } from '@/services/s3.service';
import { TranscodingService } from '@/services/transcoding.service';
import { CloudflareService } from '@/services/cloudflare.service';
import { UploadService } from '@/services/upload.service';
import { ContentModule } from '@/content.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.getDatabase();
        return {
          type: 'postgres' as const,
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          entities: [Video, VideoQuality, TranscodingJob, UploadSession, Content, ModerationLog],
          synchronize: dbConfig.synchronize,
          logging: dbConfig.logging,
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Video, VideoQuality, TranscodingJob, UploadSession]),
    ContentModule,
  ],
  controllers: [
    VideoController,
    StreamingController,
    UploadController,
    TranscodingController,
    QualityController,
  ],
  providers: [
    ConfigService,
    VideoService,
    S3Service,
    TranscodingService,
    CloudflareService,
    UploadService,
  ],
})
export class AppModule {}
