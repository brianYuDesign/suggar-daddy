import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Stripe from 'stripe';
import { Subscription, SubscriptionStatus, BillingCycle } from '../entities/subscription.entity';
import { CreateSubscriptionDto, UpdateSubscriptionDto, CancelSubscriptionDto } from '../dtos/subscription.dto';
import { ConfigService } from './config.service';

// 模擬的價格計劃
const PLANS: Record<string, { monthly: number; yearly: number; name: string }> = {
  'premium': { monthly: 9.99, yearly: 99.9, name: 'Premium' },
  'plus': { monthly: 4.99, yearly: 49.9, name: 'Plus' },
  'basic': { monthly: 1.99, yearly: 19.9, name: 'Basic' },
};

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private stripe: Stripe.Stripe;

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe.Stripe(this.configService.getStripeApiKey(), {
      apiVersion: this.configService.getStripeApiVersion() as any,
    });
  }

  /**
   * 創建訂閱
   */
  async createSubscription(dto: CreateSubscriptionDto) {
    this.logger.log(`Creating subscription for user ${dto.userId}, plan ${dto.planId}`);

    try {
      // 檢查計劃是否存在
      if (!PLANS[dto.planId]) {
        throw new BadRequestException(`Plan ${dto.planId} not found`);
      }

      const plan = PLANS[dto.planId];
      const amount = dto.billingCycle === BillingCycle.MONTHLY ? plan.monthly : plan.yearly;

      // 創建或獲取 Stripe 客戶
      let stripeCustomerId: string;
      const existingSub = await this.subscriptionRepository.findOneBy({ userId: dto.userId });
      
      if (existingSub?.stripeCustomerId) {
        stripeCustomerId = existingSub.stripeCustomerId;
      } else {
        const customer = await this.stripe.customers.create({
          metadata: { userId: dto.userId },
        });
        stripeCustomerId = customer.id;
      }

      // 在 Stripe 創建訂閱
      const stripeSubscription = await this.stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: plan.name,
              },
              recurring: {
                interval: dto.billingCycle === BillingCycle.MONTHLY ? 'month' : 'year',
              },
              unit_amount: Math.round(amount * 100),
            },
          },
        ],
        payment_method: dto.stripePaymentMethodId,
        off_session: true,
        default_payment_method: dto.stripePaymentMethodId,
      });

      // 在數據庫保存訂閱
      const subscription = this.subscriptionRepository.create({
        userId: dto.userId,
        planId: dto.planId,
        billingCycle: dto.billingCycle,
        amount: amount,
        currency: 'USD',
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: stripeCustomerId,
        startDate: new Date(),
        nextBillingDate: new Date(stripeSubscription.current_period_end * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        autoRenew: true,
        status: SubscriptionStatus.ACTIVE,
        metadata: dto.metadata,
      });

      const savedSubscription = await this.subscriptionRepository.save(subscription);
      this.logger.log(`Subscription created: ${savedSubscription.id}`);

      return {
        id: savedSubscription.id,
        userId: savedSubscription.userId,
        planId: savedSubscription.planId,
        status: savedSubscription.status,
        amount: savedSubscription.amount,
        nextBillingDate: savedSubscription.nextBillingDate,
      };
    } catch (error) {
      this.logger.error(`Subscription creation failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 升級或降級訂閱
   */
  async updateSubscription(subscriptionId: string, dto: UpdateSubscriptionDto) {
    this.logger.log(`Updating subscription ${subscriptionId}`);

    try {
      const subscription = await this.subscriptionRepository.findOneBy({ id: subscriptionId });
      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      if (subscription.status !== SubscriptionStatus.ACTIVE) {
        throw new BadRequestException('Only active subscriptions can be updated');
      }

      // 如果更改計劃
      if (dto.planId && dto.planId !== subscription.planId) {
        const newPlan = PLANS[dto.planId];
        if (!newPlan) {
          throw new BadRequestException(`Plan ${dto.planId} not found`);
        }

        const newAmount = dto.billingCycle || subscription.billingCycle === BillingCycle.MONTHLY
          ? newPlan.monthly
          : newPlan.yearly;

        // 更新 Stripe 訂閱
        await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          items: [
            {
              id: (await this.stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)).items.data[0].id,
              price_data: {
                currency: 'usd',
                product_data: {
                  name: newPlan.name,
                },
                recurring: {
                  interval: subscription.billingCycle === BillingCycle.MONTHLY ? 'month' : 'year',
                },
                unit_amount: Math.round(newAmount * 100),
              },
            },
          ],
        });

        subscription.planId = dto.planId;
        subscription.amount = newAmount;
      }

      // 如果更改計費週期
      if (dto.billingCycle && dto.billingCycle !== subscription.billingCycle) {
        const plan = PLANS[subscription.planId];
        const newAmount = dto.billingCycle === BillingCycle.MONTHLY ? plan.monthly : plan.yearly;

        subscription.billingCycle = dto.billingCycle;
        subscription.amount = newAmount;
      }

      const updated = await this.subscriptionRepository.save(subscription);
      this.logger.log(`Subscription updated: ${subscriptionId}`);

      return updated;
    } catch (error) {
      this.logger.error(`Subscription update failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 取消訂閱
   */
  async cancelSubscription(dto: CancelSubscriptionDto) {
    this.logger.log(`Cancelling subscription ${dto.subscriptionId}`);

    try {
      const subscription = await this.subscriptionRepository.findOneBy({ id: dto.subscriptionId });
      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      if (subscription.status === SubscriptionStatus.CANCELLED) {
        throw new BadRequestException('Subscription is already cancelled');
      }

      // 在 Stripe 取消訂閱
      await this.stripe.subscriptions.del(subscription.stripeSubscriptionId);

      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.cancelledAt = new Date();
      subscription.cancelReason = dto.reason;
      subscription.autoRenew = false;

      const updated = await this.subscriptionRepository.save(subscription);
      this.logger.log(`Subscription cancelled: ${dto.subscriptionId}`);

      return {
        id: updated.id,
        status: updated.status,
        cancelledAt: updated.cancelledAt,
      };
    } catch (error) {
      this.logger.error(`Subscription cancellation failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 暫停訂閱
   */
  async pauseSubscription(subscriptionId: string) {
    this.logger.log(`Pausing subscription ${subscriptionId}`);

    const subscription = await this.subscriptionRepository.findOneBy({ id: subscriptionId });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.status = SubscriptionStatus.PAUSED;
    subscription.autoRenew = false;
    const updated = await this.subscriptionRepository.save(subscription);

    return updated;
  }

  /**
   * 恢復訂閱
   */
  async resumeSubscription(subscriptionId: string) {
    this.logger.log(`Resuming subscription ${subscriptionId}`);

    const subscription = await this.subscriptionRepository.findOneBy({ id: subscriptionId });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.autoRenew = true;
    const updated = await this.subscriptionRepository.save(subscription);

    return updated;
  }

  /**
   * 獲取訂閱詳情
   */
  async getSubscription(subscriptionId: string) {
    const subscription = await this.subscriptionRepository.findOneBy({ id: subscriptionId });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    return subscription;
  }

  /**
   * 獲取用戶的訂閱
   */
  async getUserSubscription(userId: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return subscription;
  }

  /**
   * 獲取所有用戶的訂閱（分頁）
   */
  async getAllSubscriptions(limit: number = 20, offset: number = 0) {
    const [subscriptions, total] = await this.subscriptionRepository.findAndCount({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      subscriptions,
      total,
      limit,
      offset,
    };
  }

  /**
   * 自動續費處理（由 webhook 調用）
   */
  async handleRenewal(stripeSubscriptionId: string) {
    this.logger.log(`Processing renewal for subscription ${stripeSubscriptionId}`);

    const subscription = await this.subscriptionRepository.findOneBy({
      stripeSubscriptionId,
    });

    if (!subscription) {
      this.logger.warn(`Subscription not found for stripe id ${stripeSubscriptionId}`);
      return;
    }

    subscription.lastRenewalDate = new Date();
    subscription.renewalCount += 1;

    // 計算下一個計費日期
    const nextDate = new Date(subscription.currentPeriodEnd);
    if (subscription.billingCycle === BillingCycle.MONTHLY) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }

    subscription.nextBillingDate = nextDate;
    subscription.currentPeriodEnd = nextDate;

    await this.subscriptionRepository.save(subscription);
    this.logger.log(`Renewal processed: ${subscription.id}`);
  }
}
