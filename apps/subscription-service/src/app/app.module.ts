import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@suggar-daddy/redis';
import { KafkaModule } from '@suggar-daddy/kafka';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SubscriptionTierController } from './subscription-tier.controller';
import { SubscriptionTierService } from './subscription-tier.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { StripeModule } from './stripe/stripe.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
  providers: [AppService, SubscriptionTierService, SubscriptionService],
})
export class AppModule {}