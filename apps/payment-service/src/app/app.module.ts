import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { getDatabaseConfig } from '@suggar-daddy/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { PostPurchaseController } from './post-purchase.controller';
import { PostPurchaseService } from './post-purchase.service';
import { TipController } from './tip.controller';
import { TipService } from './tip.service';
import { Transaction } from './entities/transaction.entity';
import { PostPurchase } from './entities/post-purchase.entity';
import { Tip } from './entities/tip.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(
      getDatabaseConfig([Transaction, PostPurchase, Tip])
    ),
    TypeOrmModule.forFeature([Transaction, PostPurchase, Tip]),
  ],
  controllers: [
    AppController,
    TransactionController,
    PostPurchaseController,
    TipController,
  ],
  providers: [
    AppService,
    TransactionService,
    PostPurchaseService,
    TipService,
  ],
})
export class AppModule {}