/**
 * 訂閱管理服務
 * 提供訂閱列表、統計、方案管理等功能
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  SubscriptionEntity,
  SubscriptionTierEntity,
  UserEntity,
} from '@suggar-daddy/database';

@Injectable()
export class SubscriptionManagementService {
  private readonly logger = new Logger(SubscriptionManagementService.name);

  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepo: Repository<SubscriptionEntity>,
    @InjectRepository(SubscriptionTierEntity)
    private readonly tierRepo: Repository<SubscriptionTierEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /** 分頁查詢訂閱列表 */
  async listSubscriptions(page: number, limit: number, status?: string) {
    const qb = this.subscriptionRepo.createQueryBuilder('sub');
    if (status) {
      qb.where('sub.status = :status', { status });
    }
    qb.orderBy('sub.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [subs, total] = await qb.getManyAndCount();

    const userIds = [...new Set(subs.flatMap((s) => [s.subscriberId, s.creatorId]))];
    const users = userIds.length > 0
      ? await this.userRepo
          .createQueryBuilder('u')
          .select(['u.id', 'u.email', 'u.displayName', 'u.avatarUrl'])
          .whereInIds(userIds)
          .getMany()
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const tierIds = [...new Set(subs.map((s) => s.tierId))];
    const tiers = tierIds.length > 0
      ? await this.tierRepo.findBy({ id: In(tierIds) })
      : [];
    const tierMap = new Map(tiers.map((t) => [t.id, t]));

    const data = subs.map((s) => {
      const subscriber = userMap.get(s.subscriberId);
      const creator = userMap.get(s.creatorId);
      const tier = tierMap.get(s.tierId);
      return {
        id: s.id,
        status: s.status,
        createdAt: s.createdAt,
        cancelledAt: s.cancelledAt,
        currentPeriodEnd: s.currentPeriodEnd,
        subscriber: subscriber
          ? { id: subscriber.id, email: subscriber.email, displayName: subscriber.displayName, avatarUrl: subscriber.avatarUrl }
          : null,
        creator: creator
          ? { id: creator.id, email: creator.email, displayName: creator.displayName, avatarUrl: creator.avatarUrl }
          : null,
        tier: tier
          ? { id: tier.id, name: tier.name, priceMonthly: Number(tier.priceMonthly) }
          : null,
      };
    });

    return { data, total, page, limit };
  }

  /** 取得訂閱統計 */
  async getSubscriptionStats() {
    const totalActive = await this.subscriptionRepo.count({ where: { status: 'active' } });
    const totalCancelled = await this.subscriptionRepo.count({ where: { status: 'cancelled' } });
    const totalExpired = await this.subscriptionRepo.count({ where: { status: 'expired' } });
    const total = await this.subscriptionRepo.count();

    const mrrResult = await this.tierRepo
      .createQueryBuilder('tier')
      .innerJoin(SubscriptionEntity, 'sub', 'sub.tierId = tier.id AND sub.status = :status', { status: 'active' })
      .select('SUM(tier.priceMonthly)', 'mrr')
      .getRawOne();

    return {
      totalActive,
      totalCancelled,
      totalExpired,
      total,
      mrr: Math.round((Number(mrrResult?.mrr) || 0) * 100) / 100,
    };
  }

  /** 分頁查詢方案列表 */
  async listTiers(page: number, limit: number, creatorId?: string) {
    const qb = this.tierRepo.createQueryBuilder('tier');
    if (creatorId) {
      qb.where('tier.creatorId = :creatorId', { creatorId });
    }
    qb.orderBy('tier.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [tiers, total] = await qb.getManyAndCount();

    const creatorIds = [...new Set(tiers.map((t) => t.creatorId))];
    const users = creatorIds.length > 0
      ? await this.userRepo
          .createQueryBuilder('u')
          .select(['u.id', 'u.email', 'u.displayName'])
          .whereInIds(creatorIds)
          .getMany()
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Count active subscribers per tier
    const subCounts = await this.subscriptionRepo
      .createQueryBuilder('sub')
      .select('sub.tierId', 'tierId')
      .addSelect('COUNT(*)', 'count')
      .where('sub.status = :status', { status: 'active' })
      .groupBy('sub.tierId')
      .getRawMany();
    const subCountMap = new Map(subCounts.map((s) => [s.tierId, parseInt(s.count, 10)]));

    const data = tiers.map((t) => {
      const creator = userMap.get(t.creatorId);
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        priceMonthly: Number(t.priceMonthly),
        priceYearly: t.priceYearly ? Number(t.priceYearly) : null,
        benefits: t.benefits,
        isActive: t.isActive,
        createdAt: t.createdAt,
        activeSubscribers: subCountMap.get(t.id) || 0,
        creator: creator
          ? { id: creator.id, email: creator.email, displayName: creator.displayName }
          : null,
      };
    });

    return { data, total, page, limit };
  }

  /** 切換方案啟用狀態 */
  async toggleTierActive(tierId: string) {
    const tier = await this.tierRepo.findOne({ where: { id: tierId } });
    if (!tier) {
      throw new NotFoundException('Subscription tier not found');
    }
    tier.isActive = !tier.isActive;
    await this.tierRepo.save(tier);
    return { success: true, message: `Tier ${tier.isActive ? 'activated' : 'deactivated'}`, isActive: tier.isActive };
  }
}
