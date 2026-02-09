import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RedisModule } from '@suggar-daddy/redis';
import { KafkaModule } from '@suggar-daddy/kafka';
import { JwtStrategy } from '@suggar-daddy/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { SubscriptionServiceClient } from './subscription-service.client';
import { PostPurchaseConsumer } from './events/post-purchase.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-jwt-secret-key',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
    RedisModule.forRoot(),
    KafkaModule.forRoot({
      clientId: 'content-service',
      brokers: (process.env['KAFKA_BROKERS'] || 'localhost:9092').split(','),
      groupId: 'content-service-group',
    }),
  ],
  controllers: [AppController, PostController],
  providers: [AppService, PostService, SubscriptionServiceClient, JwtStrategy, PostPurchaseConsumer],
})
export class AppModule {}