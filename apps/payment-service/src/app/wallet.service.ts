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

  /**
   * Lua script for atomic wallet credit operation
   * Returns: { wallet: WalletRecord, created: boolean }
   */
  private readonly creditWalletScript = `
    local walletKey = KEYS[1]
    local netAmount = tonumber(ARGV[1])
    local updatedAt = ARGV[2]

    local walletData = redis.call('GET', walletKey)
    local wallet
    local created = false

    if not walletData then
      -- Initialize new wallet
      wallet = {
        userId = ARGV[3],
        balance = netAmount,
        pendingBalance = 0,
        totalEarnings = netAmount,
        totalWithdrawn = 0,
        updatedAt = updatedAt
      }
      created = true
    else
      wallet = cjson.decode(walletData)
      wallet.balance = wallet.balance + netAmount
      wallet.totalEarnings = wallet.totalEarnings + netAmount
      wallet.updatedAt = updatedAt
    end

    redis.call('SET', walletKey, cjson.encode(wallet))
    return { cjson.encode(wallet), created and 1 or 0 }
  `;

  /**
   * Lua script for atomic withdrawal deduction
   * Returns: { success: boolean, wallet?: WalletRecord, error?: string }
   */
  private readonly deductWithdrawalScript = `
    local walletKey = KEYS[1]
    local amount = tonumber(ARGV[1])
    local updatedAt = ARGV[2]

    local walletData = redis.call('GET', walletKey)
    if not walletData then
      return { err = 'WALLET_NOT_FOUND' }
    end

    local wallet = cjson.decode(walletData)
    if wallet.balance < amount then
      return { err = 'INSUFFICIENT_BALANCE', balance = wallet.balance }
    end

    wallet.balance = wallet.balance - amount
    wallet.updatedAt = updatedAt
    redis.call('SET', walletKey, cjson.encode(wallet))

    return { ok = cjson.encode(wallet) }
  `;

  /**
   * Lua script for atomic balance refund (on withdrawal rejection)
   */
  private readonly refundBalanceScript = `
    local walletKey = KEYS[1]
    local amount = tonumber(ARGV[1])
    local updatedAt = ARGV[2]

    local walletData = redis.call('GET', walletKey)
    if not walletData then
      return { err = 'WALLET_NOT_FOUND' }
    end

    local wallet = cjson.decode(walletData)
    wallet.balance = wallet.balance + amount
    wallet.updatedAt = updatedAt
    redis.call('SET', walletKey, cjson.encode(wallet))

    return { ok = cjson.encode(wallet) }
  `;

  /**
   * Lua script for atomic totalWithdrawn update
   */
  private readonly updateWithdrawnScript = `
    local walletKey = KEYS[1]
    local amount = tonumber(ARGV[1])
    local updatedAt = ARGV[2]

    local walletData = redis.call('GET', walletKey)
    if not walletData then
      return { err = 'WALLET_NOT_FOUND' }
    end

    local wallet = cjson.decode(walletData)
    wallet.totalWithdrawn = wallet.totalWithdrawn + amount
    wallet.updatedAt = updatedAt
    redis.call('SET', walletKey, cjson.encode(wallet))

    return { ok = cjson.encode(wallet) }
  `;

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
    const platformFee = Math.round(grossAmount * PLATFORM_FEE_RATE * 100) / 100;
    const netAmount = Math.round((grossAmount - platformFee) * 100) / 100;
    const now = new Date().toISOString();

    // Atomic wallet credit using Lua script
    const result = await this.redis.getClient().eval(
      this.creditWalletScript,
      1,
      WALLET_KEY(userId),
      netAmount.toString(),
      now,
      userId,
    ) as [string, number];

    const wallet: WalletRecord = JSON.parse(result[0]);

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
      createdAt: now,
    };
    await this.redis.lPush(WALLET_HISTORY(userId), JSON.stringify(walletTx));

    this.logger.log(`wallet credited userId=${userId} type=${type} gross=${grossAmount} net=${netAmount}`);

    // Fire-and-forget Kafka event (non-blocking)
    this.kafkaProducer.sendEvent(PAYMENT_EVENTS.WALLET_CREDITED, {
      userId,
      type,
      grossAmount,
      netAmount,
      platformFee,
      referenceId,
      creditedAt: walletTx.createdAt,
    }).catch(err => {
      this.logger.error('Failed to send WALLET_CREDITED event', err);
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
    const wdKeys = withdrawalIds.map((id) => WITHDRAWAL_KEY(id));
    const wdValues = await this.redis.mget(...wdKeys);
    const pendingWithdrawals: WithdrawalRecord[] = wdValues
      .filter(Boolean)
      .map((raw) => JSON.parse(raw!) as WithdrawalRecord)
      .filter((w) => w.status === 'pending' || w.status === 'processing');
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

    const now = new Date().toISOString();

    // Atomic balance deduction using Lua script
    const result = await this.redis.getClient().eval(
      this.deductWithdrawalScript,
      1,
      WALLET_KEY(userId),
      amount.toString(),
      now,
    ) as { err?: string; balance?: number; ok?: string };

    if (result.err === 'WALLET_NOT_FOUND') {
      throw new NotFoundException('Wallet not found');
    }

    if (result.err === 'INSUFFICIENT_BALANCE') {
      throw new BadRequestException(
        `Insufficient balance. Available: $${result.balance?.toFixed(2) || '0.00'}, Requested: $${amount.toFixed(2)}`
      );
    }

    // Wallet balance successfully deducted (result.ok contains updated wallet JSON)

    const id = this.genId('wd');
    const withdrawal: WithdrawalRecord = {
      id,
      userId,
      amount,
      status: 'pending',
      payoutMethod,
      payoutDetails,
      requestedAt: now,
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
      createdAt: now,
    };
    await this.redis.lPush(WALLET_HISTORY(userId), JSON.stringify(walletTx));

    this.logger.log(`withdrawal requested userId=${userId} amount=${amount} id=${id}`);

    // Fire-and-forget Kafka event (non-blocking)
    this.kafkaProducer.sendEvent(PAYMENT_EVENTS.WITHDRAWAL_REQUESTED, {
      withdrawalId: id,
      userId,
      amount,
      payoutMethod,
      requestedAt: withdrawal.requestedAt,
    }).catch(err => {
      this.logger.error('Failed to send WITHDRAWAL_REQUESTED event', err);
    });

    return withdrawal;
  }

  async getWithdrawals(userId: string): Promise<WithdrawalRecord[]> {
    const ids = await this.redis.lRange(WITHDRAWALS_USER(userId), 0, -1);
    const keys = ids.map((id) => WITHDRAWAL_KEY(id));
    const values = await this.redis.mget(...keys);
    const out = values.filter(Boolean).map((raw) => JSON.parse(raw!) as WithdrawalRecord);
    return out.sort((a, b) => (b.requestedAt > a.requestedAt ? 1 : -1));
  }

  // ── Admin: Process Withdrawals ──────────────────────────────────

  async getPendingWithdrawals(): Promise<WithdrawalRecord[]> {
    const ids = await this.redis.lRange(WITHDRAWALS_PENDING, 0, -1);
    const keys = ids.map((id) => WITHDRAWAL_KEY(id));
    const values = await this.redis.mget(...keys);
    const out = values
      .filter(Boolean)
      .map((raw) => JSON.parse(raw!) as WithdrawalRecord)
      .filter((w) => w.status === 'pending');
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

    const now = new Date().toISOString();

    if (action === 'reject') {
      // Atomic refund using Lua script
      const result = await this.redis.getClient().eval(
        this.refundBalanceScript,
        1,
        WALLET_KEY(withdrawal.userId),
        withdrawal.amount.toString(),
        now,
      ) as { err?: string; ok?: string };

      if (result.err === 'WALLET_NOT_FOUND') {
        throw new NotFoundException('Wallet not found');
      }

      withdrawal.status = 'rejected';
      withdrawal.processedAt = now;
      await this.redis.set(WITHDRAWAL_KEY(withdrawalId), JSON.stringify(withdrawal));
      this.logger.log(`withdrawal rejected id=${withdrawalId} userId=${withdrawal.userId}`);
    } else {
      withdrawal.status = 'completed';
      withdrawal.processedAt = now;
      await this.redis.set(WITHDRAWAL_KEY(withdrawalId), JSON.stringify(withdrawal));

      // Atomic update of totalWithdrawn using Lua script
      const result = await this.redis.getClient().eval(
        this.updateWithdrawnScript,
        1,
        WALLET_KEY(withdrawal.userId),
        withdrawal.amount.toString(),
        now,
      ) as { err?: string; ok?: string };

      if (result.err === 'WALLET_NOT_FOUND') {
        this.logger.error(`Wallet not found for user ${withdrawal.userId} during withdrawal completion`);
      }

      this.logger.log(`withdrawal completed id=${withdrawalId} userId=${withdrawal.userId} amount=${withdrawal.amount}`);

      // Fire-and-forget Kafka event (non-blocking)
      this.kafkaProducer.sendEvent(PAYMENT_EVENTS.WITHDRAWAL_COMPLETED, {
        withdrawalId,
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        completedAt: withdrawal.processedAt,
      }).catch(err => {
        this.logger.error('Failed to send WITHDRAWAL_COMPLETED event', err);
      });
    }

    return withdrawal;
  }
}
