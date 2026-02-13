import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import {
  JwtAuthGuard,
  RolesGuard,
  EnvConfigModule,
  AppConfigService,
} from "@suggar-daddy/common";
import { AuthModule } from "@suggar-daddy/auth";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { SubscriptionTierController } from "./subscription-tier.controller";
import { SubscriptionTierService } from "./subscription-tier.service";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionService } from "./subscription.service";
import { StripeModule } from "./stripe/stripe.module";
import { PaymentEventConsumer } from "./events/payment-event.consumer";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    EnvConfigModule,
    AuthModule,
    RedisModule.forRoot(),
    KafkaModule.forRootAsync({
      useFactory: (config: AppConfigService) => ({
        clientId: config.kafkaClientId,
        brokers: config.kafkaBrokers,
        groupId: config.kafkaGroupId,
      }),
      inject: [AppConfigService],
    }),
    StripeModule,
  ],
  controllers: [
    AppController,
    SubscriptionTierController,
    SubscriptionController,
  ],
  providers: [
    AppService,
    SubscriptionTierService,
    SubscriptionService,
    PaymentEventConsumer,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
