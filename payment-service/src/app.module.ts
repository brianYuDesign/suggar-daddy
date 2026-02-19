import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// 服務
import { ConfigService } from './services/config.service';
import { PaymentService } from './services/payment.service';
import { SubscriptionService } from './services/subscription.service';
import { InvoiceService } from './services/invoice.service';
import { WebhookService } from './services/webhook.service';

// 控制器
import { PaymentController, SubscriptionController, InvoiceController, WebhookController } from './controllers/payment.controller';

// Entity
import { Payment } from './entities/payment.entity';
import { Subscription } from './entities/subscription.entity';
import { Invoice } from './entities/invoice.entity';
import { WebhookEvent } from './entities/webhook-event.entity';

// 中間件
import { WebhookMiddleware } from './middleware/webhook.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.getDatabaseUrl(),
        entities: [Payment, Subscription, Invoice, WebhookEvent],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
      }),
    }),
    TypeOrmModule.forFeature([Payment, Subscription, Invoice, WebhookEvent]),
  ],
  controllers: [PaymentController, SubscriptionController, InvoiceController, WebhookController],
  providers: [
    ConfigService,
    PaymentService,
    SubscriptionService,
    InvoiceService,
    WebhookService,
  ],
  exports: [ConfigService, PaymentService, SubscriptionService, InvoiceService, WebhookService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(WebhookMiddleware).forRoutes('api/v1/webhooks/stripe');
  }
}
