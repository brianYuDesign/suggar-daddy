import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { Transaction } from './entities/transaction.entity';
import { PostPurchase } from './entities/post-purchase.entity';
import { Tip } from './entities/tip.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, PostPurchase, Tip]),
  ],
  controllers: [AppController, TransactionController],
  providers: [AppService, TransactionService],
})
export class AppModule {}
