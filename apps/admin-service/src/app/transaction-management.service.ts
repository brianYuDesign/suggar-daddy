/**
 * 交易管理服務
 * 提供交易列表、詳情查詢功能
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity, UserEntity } from '@suggar-daddy/database';
import { StripeService, PAYMENT_EVENTS } from '@suggar-daddy/common';
import { KafkaProducerService } from '@suggar-daddy/kafka';

@Injectable()
export class TransactionManagementService {
  private readonly logger = new Logger(TransactionManagementService.name);

  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly stripeService: StripeService,
    private readonly kafkaProducer: KafkaProducerService,
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

  /** 退款交易 */
  async refundTransaction(id: string, reason?: string, amount?: number) {
    const tx = await this.transactionRepo.findOne({ where: { id } });
    if (!tx) {
      throw new BadRequestException(`Transaction ${id} not found`);
    }

    if (tx.status === 'refunded') {
      throw new BadRequestException('Transaction has already been refunded');
    }

    if (tx.status !== 'succeeded') {
      throw new BadRequestException(
        `Cannot refund a transaction with status "${tx.status}". Only succeeded transactions can be refunded.`,
      );
    }

    const refundedAmount = amount ?? Number(tx.amount);

    if (amount !== undefined && amount > Number(tx.amount)) {
      throw new BadRequestException(
        `Refund amount (${amount}) cannot exceed the transaction amount (${tx.amount})`,
      );
    }

    // Call Stripe refund if applicable
    let stripeRefundId: string | null = null;
    if (tx.stripePaymentId && this.stripeService.isConfigured()) {
      try {
        const refund = await this.stripeService.createRefund(
          tx.stripePaymentId,
          amount,
          reason,
        );
        stripeRefundId = refund.id;
      } catch (err) {
        throw new BadRequestException(
          `Stripe refund failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Update transaction in DB
    tx.status = 'refunded';
    tx.metadata = {
      ...((tx.metadata as Record<string, unknown>) || {}),
      refundedAt: new Date().toISOString(),
      refundedAmount,
      refundReason: reason || null,
      stripeRefundId,
    };
    await this.transactionRepo.save(tx);

    // Emit Kafka event
    await this.kafkaProducer.sendEvent(PAYMENT_EVENTS.PAYMENT_REFUNDED, {
      transactionId: id,
      userId: tx.userId,
      amount: Number(tx.amount),
      refundedAmount,
      stripeRefundId,
      reason: reason || null,
      refundedAt: new Date().toISOString(),
    });

    this.logger.log(`Transaction ${id} refunded (amount: ${refundedAmount})`);
    return { id: tx.id, status: tx.status, refundedAmount, stripeRefundId };
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
