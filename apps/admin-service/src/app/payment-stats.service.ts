/**
 * 支付統計服務
 * 提供營收報表、頂尖創作者排行、每日營收、支付概覽等功能
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  TransactionEntity,
  TipEntity,
  SubscriptionEntity,
} from '@suggar-daddy/database';
import { RedisService } from '@suggar-daddy/redis';

/** Redis 快取 TTL（秒） */
const PAYMENT_CACHE_TTL = 300; // 5 分鐘

@Injectable()
export class PaymentStatsService {
  private readonly logger = new Logger(PaymentStatsService.name);

  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
    @InjectRepository(TipEntity)
    private readonly tipRepo: Repository<TipEntity>,
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepo: Repository<SubscriptionEntity>,
    private readonly redisService: RedisService,
  ) {}

  /** 取得營收報表 */
  async getRevenueReport(startDate: string, endDate: string) {
    const cacheKey = `payment:revenue_report:${startDate}:${endDate}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) { try { return JSON.parse(cached); } catch { /* recompute */ } }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const transactions = await this.transactionRepo.find({
      where: { createdAt: Between(start, end), status: 'completed' },
    });
    const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const byType: Record<string, { count: number; amount: number }> = {};
    for (const t of transactions) {
      if (!byType[t.type]) { byType[t.type] = { count: 0, amount: 0 }; }
      byType[t.type].count++;
      byType[t.type].amount += Number(t.amount);
    }
    const result = {
      startDate, endDate,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      transactionCount: transactions.length,
      byType,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), PAYMENT_CACHE_TTL);
    return result;
  }

  /** 取得頂尖創作者排行（依營收） */
  async getTopCreators(limit: number) {
    const cacheKey = `payment:top_creators:${limit}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) { try { return JSON.parse(cached); } catch { /* recompute */ } }

    const tipRanking = await this.tipRepo
      .createQueryBuilder('tip')
      .select('tip.toUserId', 'creatorId')
      .addSelect('SUM(tip.amount)', 'tipRevenue')
      .addSelect('COUNT(*)', 'tipCount')
      .groupBy('tip.toUserId')
      .getRawMany();

    const subRanking = await this.subscriptionRepo
      .createQueryBuilder('sub')
      .select('sub.creatorId', 'creatorId')
      .addSelect('COUNT(*)', 'subscriberCount')
      .where('sub.status = :status', { status: 'active' })
      .groupBy('sub.creatorId')
      .getRawMany();

    const creatorMap: Record<string, { creatorId: string; tipRevenue: number; tipCount: number; subscriberCount: number }> = {};
    for (const t of tipRanking) {
      creatorMap[t.creatorId] = {
        creatorId: t.creatorId,
        tipRevenue: Number(t.tipRevenue) || 0,
        tipCount: parseInt(t.tipCount, 10) || 0,
        subscriberCount: 0,
      };
    }
    for (const s of subRanking) {
      if (!creatorMap[s.creatorId]) {
        creatorMap[s.creatorId] = { creatorId: s.creatorId, tipRevenue: 0, tipCount: 0, subscriberCount: 0 };
      }
      creatorMap[s.creatorId].subscriberCount = parseInt(s.subscriberCount, 10) || 0;
    }

    const result = Object.values(creatorMap)
      .sort((a, b) => b.tipRevenue - a.tipRevenue)
      .slice(0, limit);

    await this.redisService.set(cacheKey, JSON.stringify(result), PAYMENT_CACHE_TTL);
    return result;
  }

  /** 取得每日營收（過去 N 天） */
  async getDailyRevenue(days: number) {
    const cacheKey = `payment:daily_revenue:${days}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) { try { return JSON.parse(cached); } catch { /* recompute */ } }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    const dailyData = await this.transactionRepo
      .createQueryBuilder('tx')
      .select("DATE(tx.createdAt)", 'date')
      .addSelect('SUM(tx.amount)', 'revenue')
      .addSelect('COUNT(*)', 'count')
      .where('tx.createdAt >= :startDate', { startDate })
      .andWhere('tx.status = :status', { status: 'completed' })
      .groupBy("DATE(tx.createdAt)")
      .orderBy('date', 'ASC')
      .getRawMany();
    const result = dailyData.map((d) => ({
      date: d.date,
      revenue: Math.round(Number(d.revenue) * 100) / 100,
      count: parseInt(d.count, 10),
    }));

    await this.redisService.set(cacheKey, JSON.stringify(result), PAYMENT_CACHE_TTL);
    return result;
  }

  /** 取得支付概覽統計 */
  async getPaymentStats() {
    const cacheKey = 'payment:stats_overview';
    const cached = await this.redisService.get(cacheKey);
    if (cached) { try { return JSON.parse(cached); } catch { /* recompute */ } }

    const totalTransactions = await this.transactionRepo.count();
    const successfulTransactions = await this.transactionRepo.count({ where: { status: 'completed' } });
    const totalAmountResult = await this.transactionRepo
      .createQueryBuilder('tx').select('SUM(tx.amount)', 'total')
      .where('tx.status = :status', { status: 'completed' }).getRawOne();
    const totalAmount = Number(totalAmountResult?.total) || 0;
    const avgAmountResult = await this.transactionRepo
      .createQueryBuilder('tx').select('AVG(tx.amount)', 'avg')
      .where('tx.status = :status', { status: 'completed' }).getRawOne();
    const averageAmount = Number(avgAmountResult?.avg) || 0;
    const successRate = totalTransactions > 0
      ? Math.round((successfulTransactions / totalTransactions) * 10000) / 100 : 0;
    const result = {
      totalTransactions, successfulTransactions,
      totalAmount: Math.round(totalAmount * 100) / 100,
      averageAmount: Math.round(averageAmount * 100) / 100,
      successRate,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), PAYMENT_CACHE_TTL);
    return result;
  }
}
