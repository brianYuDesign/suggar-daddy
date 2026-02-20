import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { BillingHistory } from '../entities/billing-history.entity';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from '../dtos/subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(BillingHistory)
    private billingRepository: Repository<BillingHistory>,
  ) {}

  async createSubscription(
    dto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    const plan = await this.planRepository.findOne({ where: { id: dto.planId } });
    if (!plan) {
      throw new Error('Plan not found');
    }

    const subscription = this.subscriptionRepository.create({
      userId: dto.userId,
      planId: dto.planId,
      status: 'active',
      startDate: new Date(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      monthlyPrice: plan.monthlyPrice,
      autoRenew: true,
    });

    return await this.subscriptionRepository.save(subscription);
  }

  async getSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    return subscription;
  }

  async getUserSubscription(userId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId, status: 'active' },
    });
    return subscription;
  }

  async updateSubscription(
    subscriptionId: string,
    dto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.getSubscription(subscriptionId);
    
    if (dto.status) {
      subscription.status = dto.status;
      if (dto.status === 'paused') {
        subscription.pausedAt = new Date();
      }
    }
    
    if (dto.autoRenew !== undefined) {
      subscription.autoRenew = dto.autoRenew;
    }

    return await this.subscriptionRepository.save(subscription);
  }

  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(subscriptionId);
    subscription.status = 'cancelled';
    subscription.endDate = new Date();
    return await this.subscriptionRepository.save(subscription);
  }

  async pauseSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(subscriptionId);
    subscription.status = 'paused';
    subscription.pausedAt = new Date();
    return await this.subscriptionRepository.save(subscription);
  }

  async resumeSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(subscriptionId);
    subscription.status = 'active';
    subscription.pausedAt = null;
    return await this.subscriptionRepository.save(subscription);
  }

  async getBillingHistory(
    subscriptionId: string,
    limit = 20,
  ): Promise<BillingHistory[]> {
    return await this.billingRepository.find({
      where: { subscriptionId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async recordBilling(
    subscriptionId: string,
    userId: string,
    amount: number,
    type = 'charge',
  ): Promise<BillingHistory> {
    const billing = this.billingRepository.create({
      subscriptionId,
      userId,
      amount,
      type,
      status: 'success',
    });
    return await this.billingRepository.save(billing);
  }

  async getAllPlans(): Promise<SubscriptionPlan[]> {
    return await this.planRepository.find({ where: { active: true } });
  }

  async getPlan(planId: string): Promise<SubscriptionPlan> {
    const plan = await this.planRepository.findOne({ where: { id: planId } });
    if (!plan) {
      throw new Error('Plan not found');
    }
    return plan;
  }
}
