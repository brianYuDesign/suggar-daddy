import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import {
  JwtAuthGuard,
  RolesGuard,
  JwtStrategy,
  EnvConfigModule,
  AppConfigService,
} from "@suggar-daddy/common";
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
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
