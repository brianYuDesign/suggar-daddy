import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@suggar-daddy/redis';
import { KafkaModule } from '@suggar-daddy/kafka';
import { UploadModule } from '@suggar-daddy/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { UploadController } from './upload/upload.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    RedisModule.forRoot(),
    KafkaModule.forRoot({
      clientId: 'media-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      groupId: 'media-service-group',
    }),
    UploadModule.forRoot(),
  ],
  controllers: [AppController, MediaController, UploadController],
  providers: [AppService, MediaService],
})
export class AppModule {}