import { Injectable, NotFoundException } from '@nestjs/common';
import { StripeService } from '@suggar-daddy/common';
import { TransactionService } from '../transaction.service';

@Injectable()
export class StripePaymentService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly stripeService: StripeService,
  ) {}

  /** 建立 PPV 支付意圖；成功後由 webhook 建立 postPurchase */
  async purchasePost(
    userId: string,
    postId: string,
    amount: number,
    stripeCustomerId: string,
  ) {
    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount,
      'usd',
      stripeCustomerId,
      { userId, postId, type: 'post_purchase' },
    );
    const transaction = await this.transactionService.create({
      userId,
      type: 'ppv',
      amount,
      stripePaymentId: paymentIntent.id,
      relatedEntityId: postId,
      relatedEntityType: 'post',
    });
    return {
      transaction,
      clientSecret: paymentIntent.client_secret,
    };
  }

  /** 建立打賞支付意圖；成功後由 webhook 建立 tip */
  async tipCreator(
    userId: string,
    creatorId: string,
    amount: number,
    stripeCustomerId: string,
    message?: string,
  ) {
    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount,
      'usd',
      stripeCustomerId,
      { userId, creatorId, type: 'tip' },
    );
    const transaction = await this.transactionService.create({
      userId,
      type: 'tip',
      amount,
      stripePaymentId: paymentIntent.id,
      relatedEntityId: creatorId,
      relatedEntityType: 'creator',
    });
    return {
      transaction,
      clientSecret: paymentIntent.client_secret,
    };
  }

  async getTransaction(transactionId: string, userId: string) {
    const transaction = await this.transactionService.findOne(transactionId);
    if (transaction.userId !== userId) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }
}
