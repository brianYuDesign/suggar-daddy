import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@suggar-daddy/redis';
import { KafkaModule } from '@suggar-daddy/kafka';
import { StripeModule as CommonStripeModule } from '@suggar-daddy/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { PostPurchaseController } from './post-purchase.controller';
import { PostPurchaseService } from './post-purchase.service';
import { TipController } from './tip.controller';
import { TipService } from './tip.service';
import { StripeWebhookController } from './stripe/stripe-webhook.controller';
import { StripeWebhookService } from './stripe/stripe-webhook.service';
import { StripePaymentService } from './stripe/stripe-payment.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    RedisModule.forRoot(),
    KafkaModule.forRoot({
      clientId: 'payment-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      groupId: 'payment-service-group',
    }),
    CommonStripeModule,
  ],
  controllers: [
    AppController,
    TransactionController,
    PostPurchaseController,
    TipController,
    StripeWebhookController,
  ],
  providers: [
    AppService,
    TransactionService,
    PostPurchaseService,
    TipService,
    StripeWebhookService,
    StripePaymentService,
  ],
})
export class AppModule {}