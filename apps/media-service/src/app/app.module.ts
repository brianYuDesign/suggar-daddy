import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RedisModule } from '@suggar-daddy/redis';
import { KafkaModule } from '@suggar-daddy/kafka';
import { UploadModule, JwtStrategy } from '@suggar-daddy/common';

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
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
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
  providers: [AppService, MediaService, JwtStrategy],
})
export class AppModule {}