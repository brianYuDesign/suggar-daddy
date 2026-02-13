/**
 * 提款管理服務
 * 查詢 Redis 中的提款紀錄，呼叫 payment-service 處理審核
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RedisService } from '@suggar-daddy/redis';
import { UserEntity } from '@suggar-daddy/database';
import { ConfigService } from '@nestjs/config';
import { safeJsonParse } from './safe-json-parse';

/** 提款紀錄結構（與 wallet.service.ts 的 WithdrawalRecord 對齊） */
interface WithdrawalRecord {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  payoutMethod: string;
  payoutDetails?: string;
  requestedAt: string;
  processedAt?: string;
}

/** 錢包紀錄結構 */
interface WalletRecord {
  balance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  updatedAt: string;
}

const WITHDRAWAL_KEY = (id: string) => `withdrawal:${id}`;
const WITHDRAWALS_PENDING = 'withdrawals:pending';

@Injectable()
export class WithdrawalManagementService {
  private readonly logger = new Logger(WithdrawalManagementService.name);
  private readonly paymentServiceUrl: string;

  constructor(
    private readonly redis: RedisService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly config: ConfigService,
  ) {
    this.paymentServiceUrl =
      this.config.get('PAYMENT_SERVICE_URL') || 'http://localhost:3007';
  }

  /**
   * 列出所有提款申請（分頁 + 狀態篩選）
   */
  async listWithdrawals(page: number, limit: number, status?: string) {
    // 1. 取得所有 pending 提款 ID
    const allIds = await this.redis.lRange(WITHDRAWALS_PENDING, 0, -1);

    // 也掃描已處理的（從每個 ID 直接讀取）
    const keys = allIds.map((id) => WITHDRAWAL_KEY(id));
    const rawValues = keys.length > 0 ? await this.redis.mget(...keys) : [];

    let withdrawals: WithdrawalRecord[] = rawValues
      .filter(Boolean)
      .map((raw) => safeJsonParse<WithdrawalRecord>(raw!, 'withdrawal'))
      .filter((w): w is WithdrawalRecord => w !== null);

    // 2. 狀態篩選
    if (status) {
      withdrawals = withdrawals.filter((w) => w.status === status);
    }

    // 3. 依時間排序（最新在前）
    withdrawals.sort(
      (a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
    );

    // 4. 分頁
    const total = withdrawals.length;
    const offset = (page - 1) * limit;
    const data = withdrawals.slice(offset, offset + limit);

    // 5. 附帶用戶資訊
    const userIds = [...new Set(data.map((w) => w.userId))];
    const users = userIds.length > 0
      ? await this.userRepo.findBy({ id: In(userIds) })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched = data.map((w) => {
      const user = userMap.get(w.userId);
      return {
        ...w,
        user: user
          ? {
              id: user.id,
              displayName: user.displayName,
              email: user.email,
              avatarUrl: user.avatarUrl,
            }
          : null,
      };
    });

    return { data: enriched, total, page, limit };
  }

  /**
   * 提款統計
   */
  async getWithdrawalStats() {
    const allIds = await this.redis.lRange(WITHDRAWALS_PENDING, 0, -1);
    const keys = allIds.map((id) => WITHDRAWAL_KEY(id));
    const rawValues = keys.length > 0 ? await this.redis.mget(...keys) : [];
    const withdrawals: WithdrawalRecord[] = rawValues
      .filter(Boolean)
      .map((raw) => safeJsonParse<WithdrawalRecord>(raw!, 'withdrawal'))
      .filter((w): w is WithdrawalRecord => w !== null);

    const pending = withdrawals.filter((w) => w.status === 'pending');
    const completed = withdrawals.filter((w) => w.status === 'completed');
    const rejected = withdrawals.filter((w) => w.status === 'rejected');

    const pendingAmount = pending.reduce((sum, w) => sum + w.amount, 0);
    const completedAmount = completed.reduce((sum, w) => sum + w.amount, 0);

    return {
      pendingCount: pending.length,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      completedCount: completed.length,
      completedAmount: Math.round(completedAmount * 100) / 100,
      rejectedCount: rejected.length,
      totalCount: withdrawals.length,
    };
  }

  /**
   * 單筆提款詳情
   */
  async getWithdrawalDetail(withdrawalId: string) {
    const raw = await this.redis.get(WITHDRAWAL_KEY(withdrawalId));
    if (!raw) {
      throw new NotFoundException(`Withdrawal not found: ${withdrawalId}`);
    }
    const withdrawal = safeJsonParse<WithdrawalRecord>(raw, 'withdrawal:' + withdrawalId);
    if (!withdrawal) {
      throw new NotFoundException(`Withdrawal data corrupted: ${withdrawalId}`);
    }

    // 附帶用戶資訊
    const user = await this.userRepo.findOneBy({ id: withdrawal.userId });

    // 附帶錢包資訊
    const walletRaw = await this.redis.get(`wallet:${withdrawal.userId}`);
    const wallet = walletRaw ? safeJsonParse<WalletRecord>(walletRaw, 'wallet:' + withdrawal.userId) : null;

    return {
      ...withdrawal,
      user: user
        ? {
            id: user.id,
            displayName: user.displayName,
            email: user.email,
            avatarUrl: user.avatarUrl,
            role: user.role,
          }
        : null,
      wallet: wallet
        ? {
            balance: wallet.balance,
            totalEarnings: wallet.totalEarnings,
            totalWithdrawn: wallet.totalWithdrawn,
          }
        : null,
    };
  }

  /**
   * 處理提款（批准/拒絕）
   * 直接操作 Redis（與 wallet.service 使用相同的 key 結構）
   */
  async processWithdrawal(
    withdrawalId: string,
    action: 'approve' | 'reject',
    reason?: string,
  ) {
    const raw = await this.redis.get(WITHDRAWAL_KEY(withdrawalId));
    if (!raw) {
      throw new NotFoundException(`Withdrawal not found: ${withdrawalId}`);
    }

    const withdrawal = safeJsonParse<WithdrawalRecord>(raw, 'withdrawal:' + withdrawalId);
    if (!withdrawal) {
      throw new NotFoundException(`Withdrawal data corrupted: ${withdrawalId}`);
    }
    if (withdrawal.status !== 'pending') {
      return {
        success: false,
        message: `Withdrawal is already ${withdrawal.status}`,
      };
    }

    if (action === 'reject') {
      // 退還餘額
      await this.updateWallet(withdrawal.userId, (wallet) => {
        wallet.balance += withdrawal.amount;
      });

      withdrawal.status = 'rejected';
      withdrawal.processedAt = new Date().toISOString();
      await this.redis.set(
        WITHDRAWAL_KEY(withdrawalId),
        JSON.stringify(withdrawal),
      );

      this.logger.log(
        `withdrawal rejected id=${withdrawalId} reason=${reason || 'none'}`,
      );
    } else {
      withdrawal.status = 'completed';
      withdrawal.processedAt = new Date().toISOString();
      await this.redis.set(
        WITHDRAWAL_KEY(withdrawalId),
        JSON.stringify(withdrawal),
      );

      // 更新已提領總額
      await this.updateWallet(withdrawal.userId, (wallet) => {
        wallet.totalWithdrawn += withdrawal.amount;
      });

      this.logger.log(
        `withdrawal approved id=${withdrawalId} amount=${withdrawal.amount}`,
      );
    }

    return {
      success: true,
      message: `Withdrawal ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      withdrawal,
    };
  }

  /** 安全讀取並更新錢包資料 */
  private async updateWallet(userId: string, updater: (wallet: WalletRecord) => void) {
    const walletRaw = await this.redis.get(`wallet:${userId}`);
    if (!walletRaw) return;

    const wallet = safeJsonParse<WalletRecord>(walletRaw, 'wallet:' + userId);
    if (!wallet) {
      this.logger.warn(`Wallet data corrupted for user ${userId}, skipping wallet update`);
      return;
    }

    updater(wallet);
    wallet.updatedAt = new Date().toISOString();
    await this.redis.set(`wallet:${userId}`, JSON.stringify(wallet));
  }
}
