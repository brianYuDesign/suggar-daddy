import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import {
  StripeModule as CommonStripeModule,
  JwtStrategy,
  EnvConfigModule,
  AppConfigService,
} from "@suggar-daddy/common";
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
    CommonStripeModule,
  ],
  controllers: [
    AppController,
    TransactionController,
    PostPurchaseController,
    TipController,
    WalletController,
    StripeWebhookController,
  ],
  providers: [
    AppService,
    TransactionService,
    PostPurchaseService,
    TipService,
    WalletService,
    StripeWebhookService,
    StripePaymentService,
    JwtStrategy,
  ],
})
export class AppModule {}
