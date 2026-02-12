/**
 * 交易管理服務
 * 提供交易列表、詳情查詢功能
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity, UserEntity } from '@suggar-daddy/database';

@Injectable()
export class TransactionManagementService {
  private readonly logger = new Logger(TransactionManagementService.name);

  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /** 分頁查詢交易列表 */
  async listTransactions(page: number, limit: number, type?: string, status?: string) {
    const qb = this.transactionRepo.createQueryBuilder('tx');
    if (type) {
      qb.andWhere('tx.type = :type', { type });
    }
    if (status) {
      qb.andWhere('tx.status = :status', { status });
    }
    qb.orderBy('tx.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [transactions, total] = await qb.getManyAndCount();

    const userIds = [...new Set(transactions.map((t) => t.userId))];
    const users = userIds.length > 0
      ? await this.userRepo
          .createQueryBuilder('u')
          .select(['u.id', 'u.email', 'u.displayName', 'u.avatarUrl'])
          .whereInIds(userIds)
          .getMany()
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = transactions.map((tx) => {
      const user = userMap.get(tx.userId);
      return {
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount),
        status: tx.status,
        stripePaymentId: tx.stripePaymentId,
        relatedEntityId: tx.relatedEntityId,
        relatedEntityType: tx.relatedEntityType,
        createdAt: tx.createdAt,
        user: user
          ? { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl }
          : null,
      };
    });

    return { data, total, page, limit };
  }

  /** 取得交易類型分佈統計 */
  async getTransactionTypeStats() {
    const byType = await this.transactionRepo
      .createQueryBuilder('tx')
      .select('tx.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(tx.amount)', 'totalAmount')
      .groupBy('tx.type')
      .getRawMany();

    const byStatus = await this.transactionRepo
      .createQueryBuilder('tx')
      .select('tx.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('tx.status')
      .getRawMany();

    return {
      byType: byType.map((t) => ({
        type: t.type,
        count: parseInt(t.count, 10),
        totalAmount: Math.round((Number(t.totalAmount) || 0) * 100) / 100,
      })),
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: parseInt(s.count, 10),
      })),
    };
  }
}
