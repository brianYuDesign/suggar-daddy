import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, SelectQueryBuilder } from 'typeorm';
import { Payment, PaymentStatus, PaymentMethod } from '../entities/payment.entity';

export type GroupByOption = 'day' | 'week' | 'month';

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  transactionCount: number;
  growthRate: number;
}

export interface PaymentMethodStats {
  method: string;
  count: number;
  amount: number;
}

export interface TransactionStats {
  totalRevenue: number;
  totalTransactions: number;
  successfulRate: number;
  averageAmount: number;
  byPaymentMethod: PaymentMethodStats[];
}

export interface RefundReason {
  reason: string;
  count: number;
}

export interface RefundAnalysis {
  totalRefunds: number;
  refundAmount: number;
  refundRate: number;
  byReason: RefundReason[];
}

export interface CreatorEarning {
  creatorId: string;
  totalEarnings: number;
  transactionCount: number;
  contentSales: number;
  subscriptionEarnings: number;
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  /**
   * 獲取營收報表
   */
  async getRevenueReport(
    startDate: Date,
    endDate: Date,
    groupBy: GroupByOption = 'day',
  ): Promise<RevenueDataPoint[]> {
    this.logger.log(`Generating revenue report from ${startDate} to ${endDate}, grouped by ${groupBy}`);

    const dateFormat = this.getDateFormat(groupBy);
    
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        `TO_CHAR(payment.createdAt, '${dateFormat}') as date`,
        'SUM(CASE WHEN payment.status = :succeeded THEN payment.amount ELSE 0 END) as revenue',
        'COUNT(CASE WHEN payment.status = :succeeded THEN 1 END) as "transactionCount"',
      ])
      .where('payment.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .setParameter('succeeded', PaymentStatus.SUCCEEDED)
      .groupBy(`TO_CHAR(payment.createdAt, '${dateFormat}')`)
      .orderBy('date', 'ASC');

    const results = await query.getRawMany();

    // 計算增長率
    const dataPoints: RevenueDataPoint[] = results.map((row, index) => {
      const revenue = parseFloat(row.revenue) || 0;
      const transactionCount = parseInt(row.transactionCount) || 0;
      
      let growthRate = 0;
      if (index > 0) {
        const prevRevenue = parseFloat(results[index - 1].revenue) || 0;
        if (prevRevenue > 0) {
          growthRate = ((revenue - prevRevenue) / prevRevenue) * 100;
        }
      }

      return {
        date: row.date,
        revenue,
        transactionCount,
        growthRate: Math.round(growthRate * 100) / 100,
      };
    });

    return dataPoints;
  }

  /**
   * 獲取交易統計
   */
  async getTransactionStats(
    startDate: Date,
    endDate: Date,
  ): Promise<TransactionStats> {
    this.logger.log(`Generating transaction stats from ${startDate} to ${endDate}`);

    // 總體統計
    const overallStats = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'SUM(CASE WHEN payment.status = :succeeded THEN payment.amount ELSE 0 END) as "totalRevenue"',
        'COUNT(*) as "totalTransactions"',
        'AVG(CASE WHEN payment.status = :succeeded THEN payment.amount END) as "averageAmount"',
        'COUNT(CASE WHEN payment.status = :succeeded THEN 1 END) as "successfulTransactions"',
      ])
      .where('payment.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .setParameter('succeeded', PaymentStatus.SUCCEEDED)
      .getRawOne();

    // 按支付方式分組統計
    const methodStats = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'payment.paymentMethod as method',
        'COUNT(*) as count',
        'SUM(CASE WHEN payment.status = :succeeded THEN payment.amount ELSE 0 END) as amount',
      ])
      .where('payment.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('payment.paymentMethod IS NOT NULL')
      .setParameter('succeeded', PaymentStatus.SUCCEEDED)
      .groupBy('payment.paymentMethod')
      .getRawMany();

    const totalTransactions = parseInt(overallStats.totalTransactions) || 0;
    const successfulTransactions = parseInt(overallStats.successfulTransactions) || 0;
    const successfulRate = totalTransactions > 0 
      ? (successfulTransactions / totalTransactions) * 100 
      : 0;

    const byPaymentMethod: PaymentMethodStats[] = methodStats.map((stat) => ({
      method: stat.method || 'unknown',
      count: parseInt(stat.count) || 0,
      amount: parseFloat(stat.amount) || 0,
    }));

    return {
      totalRevenue: parseFloat(overallStats.totalRevenue) || 0,
      totalTransactions,
      successfulRate: Math.round(successfulRate * 100) / 100,
      averageAmount: parseFloat(overallStats.averageAmount) || 0,
      byPaymentMethod,
    };
  }

  /**
   * 獲取退款分析
   */
  async getRefundAnalysis(
    startDate: Date,
    endDate: Date,
  ): Promise<RefundAnalysis> {
    this.logger.log(`Generating refund analysis from ${startDate} to ${endDate}`);

    // 總體退款統計
    const refundStats = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'COUNT(*) as "totalRefunds"',
        'SUM(payment.amount) as "refundAmount"',
      ])
      .where('payment.status = :refunded', { refunded: PaymentStatus.REFUNDED })
      .andWhere('payment.refundedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    // 總交易額（用於計算退款率）
    const totalRevenue = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :succeeded', { succeeded: PaymentStatus.SUCCEEDED })
      .andWhere('payment.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    // 按原因分組（從 metadata 中提取）
    const refundReasons = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        "COALESCE(payment.metadata->>'refundReason', '未指定') as reason",
        'COUNT(*) as count',
      ])
      .where('payment.status = :refunded', { refunded: PaymentStatus.REFUNDED })
      .andWhere('payment.refundedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy("payment.metadata->>'refundReason'")
      .getRawMany();

    const totalRefunds = parseInt(refundStats.totalRefunds) || 0;
    const refundAmount = parseFloat(refundStats.refundAmount) || 0;
    const totalRevenueAmount = parseFloat(totalRevenue.total) || 0;
    
    const refundRate = totalRevenueAmount > 0 
      ? (refundAmount / totalRevenueAmount) * 100 
      : 0;

    const byReason: RefundReason[] = refundReasons.map((r) => ({
      reason: r.reason,
      count: parseInt(r.count) || 0,
    }));

    return {
      totalRefunds,
      refundAmount,
      refundRate: Math.round(refundRate * 100) / 100,
      byReason: byReason.length > 0 ? byReason : [{ reason: '未指定', count: totalRefunds }],
    };
  }

  /**
   * 獲取創作者收益排行
   */
  async getCreatorEarnings(
    creatorId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ creators: CreatorEarning[]; total: number }> {
    this.logger.log(
      `Generating creator earnings report${creatorId ? ` for creator ${creatorId}` : ''}`
    );

    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'payment.metadata->>\'creatorId\' as "creatorId"',
        'SUM(CASE WHEN payment.status = :succeeded THEN payment.amount ELSE 0 END) as "totalEarnings"',
        'COUNT(CASE WHEN payment.status = :succeeded THEN 1 END) as "transactionCount"',
        'COUNT(CASE WHEN payment.contentId IS NOT NULL THEN 1 END) as "contentSales"',
      ])
      .where('payment.metadata->>\'creatorId\' IS NOT NULL')
      .andWhere('payment.status = :succeeded', { succeeded: PaymentStatus.SUCCEEDED })
      .groupBy('payment.metadata->>\'creatorId\'')
      .orderBy('"totalEarnings"', 'DESC');

    if (startDate && endDate) {
      queryBuilder.andWhere('payment.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (creatorId) {
      queryBuilder.andWhere('payment.metadata->>\'creatorId\' = :creatorId', { creatorId });
    }

    const total = await queryBuilder.getCount();

    const results = await queryBuilder
      .limit(limit)
      .offset(offset)
      .getRawMany();

    const creators: CreatorEarning[] = results.map((row) => ({
      creatorId: row.creatorId,
      totalEarnings: parseFloat(row.totalEarnings) || 0,
      transactionCount: parseInt(row.transactionCount) || 0,
      contentSales: parseInt(row.contentSales) || 0,
      subscriptionEarnings: 0, // 訂閱收益需要從 subscription 表計算
    }));

    return { creators, total };
  }

  /**
   * 獲取日期格式字符串
   */
  private getDateFormat(groupBy: GroupByOption): string {
    switch (groupBy) {
      case 'day':
        return 'YYYY-MM-DD';
      case 'week':
        return 'IYYY-IW'; // ISO year and week
      case 'month':
        return 'YYYY-MM';
      default:
        return 'YYYY-MM-DD';
    }
  }
}
