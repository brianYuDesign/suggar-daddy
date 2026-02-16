import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import {
  StripeModule as CommonStripeModule,
  EnvConfigModule,
  AppConfigService,
  CircuitBreakerModule,
} from "@suggar-daddy/common";
import { AuthModule } from "@suggar-daddy/auth";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";
import { PostPurchaseController } from "./post-purchase.controller";
import { PostPurchaseService } from "./post-purchase.service";
import { TipController } from "./tip.controller";
import { TipService } from "./tip.service";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";
import { StripeWebhookController } from "./stripe/stripe-webhook.controller";
import { StripeWebhookService } from "./stripe/stripe-webhook.service";
import { StripePaymentService } from "./stripe/stripe-payment.service";
import { DmPurchaseController } from "./dm-purchase.controller";
import { DmPurchaseService } from "./dm-purchase.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    EnvConfigModule,
    AuthModule,
    RedisModule.forRoot(),
    CircuitBreakerModule,
    KafkaModule.forRootAsync({
      useFactory: (config: AppConfigService) => ({
        clientId: config.kafkaClientId,
        brokers: config.kafkaBrokers,
        groupId: config.kafkaGroupId,
      }),
      inject: [AppConfigService],
    }),
    CommonStripeModule,
  ],
  controllers: [
    AppController,
    TransactionController,
    PostPurchaseController,
    TipController,
    WalletController,
    StripeWebhookController,
    DmPurchaseController,
  ],
  providers: [
    AppService,
    TransactionService,
    PostPurchaseService,
    TipService,
    WalletService,
    StripeWebhookService,
    StripePaymentService,
    DmPurchaseService,
  ],
})
export class AppModule {}
