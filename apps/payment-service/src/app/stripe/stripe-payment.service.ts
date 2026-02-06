import { Injectable, NotFoundException } from '@nestjs/common';
import { StripeService } from '@suggar-daddy/common';
import { TransactionService } from '../transaction.service';
import { PostPurchaseService } from '../post-purchase.service';
import { TipService } from '../tip.service';

@Injectable()
export class StripePaymentService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly postPurchaseService: PostPurchaseService,
    private readonly tipService: TipService,
    private readonly stripeService: StripeService,
  ) {}

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
    const postPurchase = await this.postPurchaseService.create({
      postId,
      buyerId: userId,
      amount,
      stripePaymentId: paymentIntent.id,
    });
    return {
      transaction,
      postPurchase,
      clientSecret: paymentIntent.client_secret,
    };
  }

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
    const tip = await this.tipService.create({
      fromUserId: userId,
      toUserId: creatorId,
      amount,
      message,
      stripePaymentId: paymentIntent.id,
    });
    return {
      transaction,
      tip,
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
