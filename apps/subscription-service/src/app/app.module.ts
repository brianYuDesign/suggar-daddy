import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { getDatabaseConfig } from '@suggar-daddy/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SubscriptionTierController } from './subscription-tier.controller';
import { SubscriptionTierService } from './subscription-tier.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionTier } from './entities/subscription-tier.entity';
import { Subscription } from './entities/subscription.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(
      getDatabaseConfig([SubscriptionTier, Subscription])
    ),
    TypeOrmModule.forFeature([SubscriptionTier, Subscription]),
  ],
  controllers: [AppController, SubscriptionTierController, SubscriptionController],
  providers: [AppService, SubscriptionTierService, SubscriptionService],
})
export class AppModule {}