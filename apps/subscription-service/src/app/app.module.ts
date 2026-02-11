import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RedisModule } from '@suggar-daddy/redis';
import { KafkaModule } from '@suggar-daddy/kafka';
import { JwtAuthGuard, RolesGuard, JwtStrategy } from '@suggar-daddy/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SubscriptionTierController } from './subscription-tier.controller';
import { SubscriptionTierService } from './subscription-tier.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { StripeModule } from './stripe/stripe.module';
import { PaymentEventConsumer } from './events/payment-event.consumer';

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
      clientId: 'subscription-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      groupId: 'subscription-service-group',
    }),
    StripeModule,
  ],
  controllers: [AppController, SubscriptionTierController, SubscriptionController],
  providers: [
    AppService,
    SubscriptionTierService,
    SubscriptionService,
    PaymentEventConsumer,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}