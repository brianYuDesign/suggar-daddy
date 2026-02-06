import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeService } from '@suggar-daddy/common';
import { Transaction } from '../entities/transaction.entity';
import { PostPurchase } from '../entities/post-purchase.entity';
import { Tip } from '../entities/tip.entity';

@Injectable()
export class StripePaymentService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(PostPurchase)
    private postPurchaseRepo: Repository<PostPurchase>,
    @InjectRepository(Tip)
    private tipRepo: Repository<Tip>,
    private stripeService: StripeService,
  ) {}

  // One-time post purchase
  async purchasePost(
    userId: string,
    postId: string,
    amount: number,
    stripeCustomerId: string,
  ) {
    // Create payment intent
    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount,
      'usd',
      stripeCustomerId,
      {
        userId,
        postId,
        type: 'post_purchase',
      }
    );

    // Create transaction record
    const transaction = this.transactionRepo.create({
      userId,
      amount,
      currency: 'usd',
      type: 'post_purchase',
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id,
    });
    await this.transactionRepo.save(transaction);

    // Create post purchase record
    const postPurchase = this.postPurchaseRepo.create({
      userId,
      postId,
      transactionId: transaction.id,
      amount,
    });
    await this.postPurchaseRepo.save(postPurchase);

    return {
      transaction,
      postPurchase,
      clientSecret: paymentIntent.client_secret,
    };
  }

  // Tip creator
  async tipCreator(
    userId: string,
    creatorId: string,
    amount: number,
    stripeCustomerId: string,
    message?: string,
  ) {
    // Create payment intent
    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount,
      'usd',
      stripeCustomerId,
      {
        userId,
        creatorId,
        type: 'tip',
      }
    );

    // Create transaction record
    const transaction = this.transactionRepo.create({
      userId,
      amount,
      currency: 'usd',
      type: 'tip',
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id,
    });
    await this.transactionRepo.save(transaction);

    // Create tip record
    const tip = this.tipRepo.create({
      senderId: userId,
      receiverId: creatorId,
      transactionId: transaction.id,
      amount,
      message,
    });
    await this.tipRepo.save(tip);

    return {
      transaction,
      tip,
      clientSecret: paymentIntent.client_secret,
    };
  }

  // Get transaction status
  async getTransaction(transactionId: string, userId: string) {
    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId, userId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }
}