import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { PAYMENT_EVENTS } from '@suggar-daddy/common';

const WALLET_KEY = (userId: string) => `wallet:${userId}`;
const WALLET_HISTORY = (userId: string) => `wallet:history:${userId}`;
const WITHDRAWAL_KEY = (id: string) => `withdrawal:${id}`;
const WITHDRAWALS_USER = (userId: string) => `withdrawals:user:${userId}`;
const WITHDRAWALS_PENDING = 'withdrawals:pending';

// Platform fee: 20% (similar to OnlyFans)
const PLATFORM_FEE_RATE = 0.2;
const MIN_WITHDRAWAL_AMOUNT = 20;

interface WalletRecord {
  userId: string;
  balance: number;          // available for withdrawal
  pendingBalance: number;   // earnings not yet cleared
  totalEarnings: number;    // lifetime earnings
  totalWithdrawn: number;   // lifetime withdrawn
  updatedAt: string;
}

interface WalletTransaction {
  id: string;
  userId: string;
  type: 'tip_received' | 'subscription_received' | 'ppv_received' | 'withdrawal' | 'platform_fee';
  amount: number;
  netAmount: number;      // after platform fee
  referenceId?: string;   // tip/subscription/transaction ID
  description: string;
  createdAt: string;
}

interface WithdrawalRecord {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  payoutMethod: string;    // 'bank_transfer' | 'stripe_payout'
  payoutDetails?: string;  // masked account info
  requestedAt: string;
  processedAt?: string;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  private genId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  // ── Wallet Balance ──────────────────────────────────────────────

  async getWallet(userId: string): Promise<WalletRecord> {
    const raw = await this.redis.get(WALLET_KEY(userId));
    if (raw) return JSON.parse(raw);

    // Initialize wallet if not exists
    const wallet: WalletRecord = {
      userId,
      balance: 0,
      pendingBalance: 0,
      totalEarnings: 0,
      totalWithdrawn: 0,
      updatedAt: new Date().toISOString(),
    };
    await this.redis.set(WALLET_KEY(userId), JSON.stringify(wallet));
    return wallet;
  }

  async creditWallet(
    userId: string,
    grossAmount: number,
    type: 'tip_received' | 'subscription_received' | 'ppv_received',
    referenceId?: string,
  ): Promise<WalletRecord> {
    const wallet = await this.getWallet(userId);
    const platformFee = Math.round(grossAmount * PLATFORM_FEE_RATE * 100) / 100;
    const netAmount = Math.round((grossAmount - platformFee) * 100) / 100;

    wallet.balance += netAmount;
    wallet.totalEarnings += netAmount;
    wallet.updatedAt = new Date().toISOString();
    await this.redis.set(WALLET_KEY(userId), JSON.stringify(wallet));

    // Record transaction
    const txId = this.genId('wt');
    const walletTx: WalletTransaction = {
      id: txId,
      userId,
      type,
      amount: grossAmount,
      netAmount,
      referenceId,
      description: `${type.replace('_', ' ')} - gross $${grossAmount}, fee $${platformFee}`,
      createdAt: new Date().toISOString(),
    };
    await this.redis.lPush(WALLET_HISTORY(userId), JSON.stringify(walletTx));

    this.logger.log(`wallet credited userId=${userId} type=${type} gross=${grossAmount} net=${netAmount}`);

    await this.kafkaProducer.sendEvent(PAYMENT_EVENTS.WALLET_CREDITED, {
      userId,
      type,
      grossAmount,
      netAmount,
      platformFee,
      referenceId,
      creditedAt: walletTx.createdAt,
    });

    return wallet;
  }

  async getWalletHistory(userId: string, limit = 50): Promise<WalletTransaction[]> {
    const list = await this.redis.lRange(WALLET_HISTORY(userId), 0, limit - 1);
    return list.map((s) => JSON.parse(s));
  }

  async getEarningsSummary(userId: string): Promise<{
    wallet: WalletRecord;
    recentTransactions: WalletTransaction[];
    pendingWithdrawals: WithdrawalRecord[];
  }> {
    const wallet = await this.getWallet(userId);
    const recentTransactions = await this.getWalletHistory(userId, 20);
    const withdrawalIds = await this.redis.lRange(WITHDRAWALS_USER(userId), 0, -1);
    const pendingWithdrawals: WithdrawalRecord[] = [];
    for (const id of withdrawalIds) {
      const raw = await this.redis.get(WITHDRAWAL_KEY(id));
      if (raw) {
        const w = JSON.parse(raw) as WithdrawalRecord;
        if (w.status === 'pending' || w.status === 'processing') {
          pendingWithdrawals.push(w);
        }
      }
    }
    return { wallet, recentTransactions, pendingWithdrawals };
  }

  // ── Withdrawal ──────────────────────────────────────────────────

  async requestWithdrawal(
    userId: string,
    amount: number,
    payoutMethod: string,
    payoutDetails?: string,
  ): Promise<WithdrawalRecord> {
    if (amount < MIN_WITHDRAWAL_AMOUNT) {
      throw new BadRequestException(`Minimum withdrawal amount is $${MIN_WITHDRAWAL_AMOUNT}`);
    }

    const wallet = await this.getWallet(userId);
    if (wallet.balance < amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: $${wallet.balance.toFixed(2)}, Requested: $${amount.toFixed(2)}`
      );
    }

    // Deduct from balance immediately
    wallet.balance -= amount;
    wallet.updatedAt = new Date().toISOString();
    await this.redis.set(WALLET_KEY(userId), JSON.stringify(wallet));

    const id = this.genId('wd');
    const withdrawal: WithdrawalRecord = {
      id,
      userId,
      amount,
      status: 'pending',
      payoutMethod,
      payoutDetails,
      requestedAt: new Date().toISOString(),
    };

    await this.redis.set(WITHDRAWAL_KEY(id), JSON.stringify(withdrawal));
    await this.redis.lPush(WITHDRAWALS_USER(userId), id);
    await this.redis.lPush(WITHDRAWALS_PENDING, id);

    // Record in wallet history
    const walletTx: WalletTransaction = {
      id: this.genId('wt'),
      userId,
      type: 'withdrawal',
      amount,
      netAmount: -amount,
      referenceId: id,
      description: `Withdrawal request via ${payoutMethod} - $${amount.toFixed(2)}`,
      createdAt: new Date().toISOString(),
    };
    await this.redis.lPush(WALLET_HISTORY(userId), JSON.stringify(walletTx));

    this.logger.log(`withdrawal requested userId=${userId} amount=${amount} id=${id}`);

    await this.kafkaProducer.sendEvent(PAYMENT_EVENTS.WITHDRAWAL_REQUESTED, {
      withdrawalId: id,
      userId,
      amount,
      payoutMethod,
      requestedAt: withdrawal.requestedAt,
    });

    return withdrawal;
  }

  async getWithdrawals(userId: string): Promise<WithdrawalRecord[]> {
    const ids = await this.redis.lRange(WITHDRAWALS_USER(userId), 0, -1);
    const out: WithdrawalRecord[] = [];
    for (const id of ids) {
      const raw = await this.redis.get(WITHDRAWAL_KEY(id));
      if (raw) out.push(JSON.parse(raw));
    }
    return out.sort((a, b) => (b.requestedAt > a.requestedAt ? 1 : -1));
  }

  // ── Admin: Process Withdrawals ──────────────────────────────────

  async getPendingWithdrawals(): Promise<WithdrawalRecord[]> {
    const ids = await this.redis.lRange(WITHDRAWALS_PENDING, 0, -1);
    const out: WithdrawalRecord[] = [];
    for (const id of ids) {
      const raw = await this.redis.get(WITHDRAWAL_KEY(id));
      if (raw) {
        const w = JSON.parse(raw) as WithdrawalRecord;
        if (w.status === 'pending') out.push(w);
      }
    }
    return out.sort((a, b) => (a.requestedAt > b.requestedAt ? 1 : -1));
  }

  async processWithdrawal(
    withdrawalId: string,
    action: 'approve' | 'reject',
  ): Promise<WithdrawalRecord> {
    const raw = await this.redis.get(WITHDRAWAL_KEY(withdrawalId));
    if (!raw) {
      throw new NotFoundException(`Withdrawal not found: ${withdrawalId}`);
    }

    const withdrawal = JSON.parse(raw) as WithdrawalRecord;
    if (withdrawal.status !== 'pending') {
      throw new BadRequestException(`Withdrawal is already ${withdrawal.status}`);
    }

    if (action === 'reject') {
      // Refund balance
      const wallet = await this.getWallet(withdrawal.userId);
      wallet.balance += withdrawal.amount;
      wallet.updatedAt = new Date().toISOString();
      await this.redis.set(WALLET_KEY(withdrawal.userId), JSON.stringify(wallet));

      withdrawal.status = 'rejected';
      withdrawal.processedAt = new Date().toISOString();
      await this.redis.set(WITHDRAWAL_KEY(withdrawalId), JSON.stringify(withdrawal));
      this.logger.log(`withdrawal rejected id=${withdrawalId} userId=${withdrawal.userId}`);
    } else {
      withdrawal.status = 'completed';
      withdrawal.processedAt = new Date().toISOString();
      await this.redis.set(WITHDRAWAL_KEY(withdrawalId), JSON.stringify(withdrawal));

      // Update total withdrawn
      const wallet = await this.getWallet(withdrawal.userId);
      wallet.totalWithdrawn += withdrawal.amount;
      wallet.updatedAt = new Date().toISOString();
      await this.redis.set(WALLET_KEY(withdrawal.userId), JSON.stringify(wallet));

      this.logger.log(`withdrawal completed id=${withdrawalId} userId=${withdrawal.userId} amount=${withdrawal.amount}`);

      await this.kafkaProducer.sendEvent(PAYMENT_EVENTS.WITHDRAWAL_COMPLETED, {
        withdrawalId,
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        completedAt: withdrawal.processedAt,
      });
    }

    return withdrawal;
  }
}
