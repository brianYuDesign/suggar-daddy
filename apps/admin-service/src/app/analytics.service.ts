/**
 * 數據分析服務
 * 提供 DAU/MAU、創作者營收排行、熱門內容、訂閱流失率等分析功能
 * 分析結果快取於 Redis，設定 TTL 避免頻繁重算
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PostEntity,
  TipEntity,
  SubscriptionEntity,
  UserEntity,
} from '@suggar-daddy/database';
import { RedisService } from '@suggar-daddy/redis';

/** Redis 快取 TTL（秒） */
const ANALYTICS_CACHE_TTL = 300; // 5 分鐘

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(PostEntity)
    private readonly postRepo: Repository<PostEntity>,
    @InjectRepository(TipEntity)
    private readonly tipRepo: Repository<TipEntity>,
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepo: Repository<SubscriptionEntity>,
    private readonly redisService: RedisService,
  ) {}

  /** 計算 DAU/MAU，從 Redis 中的用戶登入時間戳記計算 */
  async getDauMau(days: number) {
    const cacheKey = 'analytics:dau_mau:' + days;
    const cached = await this.redisService.get(cacheKey);
    if (cached) { return JSON.parse(cached); }

    const today = new Date().toISOString().split('T')[0];
    const dauCount = await this.getDauCount('analytics:dau:' + today);
    const mauCount = await this.getMauCount();

    const dailyDau: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = await this.getDauCount('analytics:dau:' + dateStr);
      dailyDau.unshift({ date: dateStr, count });
    }

    const result = {
      dau: dauCount,
      mau: mauCount,
      dauMauRatio: mauCount > 0 ? Math.round((dauCount / mauCount) * 10000) / 100 : 0,
      dailyDau,
      calculatedAt: new Date().toISOString(),
    };

    await this.redisService.setex(cacheKey, ANALYTICS_CACHE_TTL, JSON.stringify(result));
    return result;
  }

  /** 創作者營收排行 */
  async getCreatorRevenueRanking(limit: number) {
    const cacheKey = 'analytics:creator_revenue:' + limit;
    const cached = await this.redisService.get(cacheKey);
    if (cached) { return JSON.parse(cached); }

    const ranking = await this.tipRepo
      .createQueryBuilder('tip')
      .select('tip.toUserId', 'creatorId')
      .addSelect('SUM(tip.amount)', 'totalRevenue')
      .addSelect('COUNT(*)', 'tipCount')
      .groupBy('tip.toUserId')
      .orderBy('totalRevenue', 'DESC')
      .limit(limit)
      .getRawMany();

    const result = [];
    for (const r of ranking) {
      const user = await this.userRepo.findOne({ where: { id: r.creatorId } });
      result.push({
        creatorId: r.creatorId,
        displayName: user?.displayName || '未知用戶',
        totalRevenue: Math.round(Number(r.totalRevenue) * 100) / 100,
        tipCount: parseInt(r.tipCount, 10),
      });
    }

    await this.redisService.setex(cacheKey, ANALYTICS_CACHE_TTL, JSON.stringify(result));
    return result;
  }

  /** 熱門內容排行，依互動數排序 */
  async getPopularContent(limit: number) {
    const cacheKey = 'analytics:popular_content:' + limit;
    const cached = await this.redisService.get(cacheKey);
    if (cached) { return JSON.parse(cached); }

    const posts = await this.postRepo
      .createQueryBuilder('post')
      .select([
        'post.id', 'post.creatorId', 'post.contentType', 'post.caption',
        'post.visibility', 'post.likeCount', 'post.commentCount', 'post.createdAt',
      ])
      .addSelect('(post.likeCount + post.commentCount)', 'engagement')
      .orderBy('engagement', 'DESC')
      .take(limit)
      .getMany();

    const result = posts.map((p) => ({
      postId: p.id,
      creatorId: p.creatorId,
      contentType: p.contentType,
      caption: p.caption,
      visibility: p.visibility,
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      engagement: p.likeCount + p.commentCount,
      createdAt: p.createdAt,
    }));

    await this.redisService.setex(cacheKey, ANALYTICS_CACHE_TTL, JSON.stringify(result));
    return result;
  }

  /** 計算訂閱流失率 */
  async getSubscriptionChurnRate(period: string) {
    const cacheKey = 'analytics:churn_rate:' + period;
    const cached = await this.redisService.get(cacheKey);
    if (cached) { return JSON.parse(cached); }

    const now = new Date();
    const periodStart = new Date();
    switch (period) {
      case 'week': periodStart.setDate(now.getDate() - 7); break;
      case 'month': periodStart.setMonth(now.getMonth() - 1); break;
      case 'quarter': periodStart.setMonth(now.getMonth() - 3); break;
      default: periodStart.setMonth(now.getMonth() - 1);
    }

    const activeAtStart = await this.subscriptionRepo
      .createQueryBuilder('sub')
      .where('sub.createdAt <= :periodStart', { periodStart })
      .andWhere('(sub.cancelledAt IS NULL OR sub.cancelledAt > :periodStart)', { periodStart })
      .getCount();

    const cancelledDuring = await this.subscriptionRepo
      .createQueryBuilder('sub')
      .where('sub.cancelledAt >= :periodStart', { periodStart })
      .andWhere('sub.cancelledAt <= :now', { now })
      .getCount();

    const newDuring = await this.subscriptionRepo
      .createQueryBuilder('sub')
      .where('sub.createdAt >= :periodStart', { periodStart })
      .andWhere('sub.createdAt <= :now', { now })
      .getCount();

    const currentActive = await this.subscriptionRepo.count({ where: { status: 'active' } });

    const churnRate = activeAtStart > 0
      ? Math.round((cancelledDuring / activeAtStart) * 10000) / 100 : 0;

    const result = {
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      activeAtStart, cancelledDuring, newDuring, currentActive, churnRate,
    };

    await this.redisService.setex(cacheKey, ANALYTICS_CACHE_TTL, JSON.stringify(result));
    return result;
  }

  // ---- 私有方法 ----

  /** 取得指定日期的 DAU 數量 */
  private async getDauCount(key: string): Promise<number> {
    try {
      const client = this.redisService.getClient();
      const count = await client.scard(key);
      return count || 0;
    } catch {
      return 0;
    }
  }

  /** 取得 MAU 數量（過去 30 天不重複活躍用戶） */
  private async getMauCount(): Promise<number> {
    try {
      const client = this.redisService.getClient();
      const keys: string[] = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        keys.push('analytics:dau:' + dateStr);
      }
      if (keys.length === 0) return 0;
      const tempKey = 'analytics:mau:temp';
      await client.sunionstore(tempKey, ...keys);
      const count = await client.scard(tempKey);
      await client.del(tempKey);
      return count || 0;
    } catch {
      return 0;
    }
  }
}
