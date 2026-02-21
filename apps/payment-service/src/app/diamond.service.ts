import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { DIAMOND_EVENTS, InjectLogger } from '@suggar-daddy/common';

// ── Redis key helpers ────────────────────────────────────────────
const DIAMOND_KEY = (userId: string) => `diamond:${userId}`;
const DIAMOND_HISTORY = (userId: string) => `diamond:history:${userId}`;
const DIAMOND_CONFIG = 'diamond:config';

export interface DiamondBalance {
  balance: number;
  totalPurchased: number;
  totalSpent: number;
  totalReceived: number;
  totalConverted: number;
  updatedAt: string;
}

export interface DiamondTransaction {
  id: string;
  type: 'purchase' | 'spend' | 'credit' | 'transfer_in' | 'transfer_out' | 'conversion';
  amount: number;
  referenceId?: string;
  referenceType?: string;
  description: string;
  createdAt: string;
}

export interface DiamondConfig {
  superLikeCost: number;
  boostCost: number;
  boostDurationMinutes: number;
  conversionRate: number; // diamonds per 1 USD
  platformFeeRate: number; // 0.2 = 20%
  minConversionDiamonds: number;
}

const DEFAULT_CONFIG: DiamondConfig = {
  superLikeCost: 50,
  boostCost: 150,
  boostDurationMinutes: 30,
  conversionRate: 100, // 100 diamonds = $1
  platformFeeRate: 0.2,
  minConversionDiamonds: 500,
};

@Injectable()
export class DiamondService {
  @InjectLogger() private readonly logger!: Logger;

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  private genId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  // ── Lua Scripts ────────────────────────────────────────────────

  /** Atomic spend: check balance >= cost, then deduct */
  private readonly spendDiamondsScript = `
    local key = KEYS[1]
    local amount = tonumber(ARGV[1])
    local now = ARGV[2]

    local raw = redis.call('GET', key)
    if not raw then
      return cjson.encode({ err = 'NO_BALANCE' })
    end

    local data = cjson.decode(raw)
    if data.balance < amount then
      return cjson.encode({ err = 'INSUFFICIENT', balance = data.balance })
    end

    data.balance = data.balance - amount
    data.totalSpent = data.totalSpent + amount
    data.updatedAt = now
    redis.call('SET', key, cjson.encode(data))
    return cjson.encode({ ok = true, balance = data.balance })
  `;

  /** Atomic credit: add diamonds to balance */
  private readonly creditDiamondsScript = `
    local key = KEYS[1]
    local amount = tonumber(ARGV[1])
    local creditType = ARGV[2]
    local now = ARGV[3]
    local userId = ARGV[4]

    local raw = redis.call('GET', key)
    local data

    if not raw then
      data = {
        balance = 0,
        totalPurchased = 0,
        totalSpent = 0,
        totalReceived = 0,
        totalConverted = 0,
        updatedAt = now
      }
    else
      data = cjson.decode(raw)
    end

    data.balance = data.balance + amount
    if creditType == 'purchase' then
      data.totalPurchased = data.totalPurchased + amount
    elseif creditType == 'received' then
      data.totalReceived = data.totalReceived + amount
    end
    data.updatedAt = now
    redis.call('SET', key, cjson.encode(data))
    return cjson.encode({ ok = true, balance = data.balance })
  `;

  /** Atomic transfer: deduct from sender + credit to receiver */
  private readonly transferDiamondsScript = `
    local fromKey = KEYS[1]
    local toKey = KEYS[2]
    local amount = tonumber(ARGV[1])
    local now = ARGV[2]

    local fromRaw = redis.call('GET', fromKey)
    if not fromRaw then
      return cjson.encode({ err = 'NO_BALANCE' })
    end

    local fromData = cjson.decode(fromRaw)
    if fromData.balance < amount then
      return cjson.encode({ err = 'INSUFFICIENT', balance = fromData.balance })
    end

    -- Deduct from sender
    fromData.balance = fromData.balance - amount
    fromData.totalSpent = fromData.totalSpent + amount
    fromData.updatedAt = now
    redis.call('SET', fromKey, cjson.encode(fromData))

    -- Credit to receiver
    local toRaw = redis.call('GET', toKey)
    local toData
    if not toRaw then
      toData = {
        balance = 0,
        totalPurchased = 0,
        totalSpent = 0,
        totalReceived = 0,
        totalConverted = 0,
        updatedAt = now
      }
    else
      toData = cjson.decode(toRaw)
    end

    toData.balance = toData.balance + amount
    toData.totalReceived = toData.totalReceived + amount
    toData.updatedAt = now
    redis.call('SET', toKey, cjson.encode(toData))

    return cjson.encode({ ok = true, fromBalance = fromData.balance, toBalance = toData.balance })
  `;

  /** Atomic conversion: deduct diamonds for cash conversion */
  private readonly convertDiamondsScript = `
    local key = KEYS[1]
    local amount = tonumber(ARGV[1])
    local now = ARGV[2]

    local raw = redis.call('GET', key)
    if not raw then
      return cjson.encode({ err = 'NO_BALANCE' })
    end

    local data = cjson.decode(raw)
    if data.balance < amount then
      return cjson.encode({ err = 'INSUFFICIENT', balance = data.balance })
    end

    data.balance = data.balance - amount
    data.totalConverted = data.totalConverted + amount
    data.updatedAt = now
    redis.call('SET', key, cjson.encode(data))
    return cjson.encode({ ok = true, balance = data.balance })
  `;

  // ── Public Methods ─────────────────────────────────────────────

  async getBalance(userId: string): Promise<DiamondBalance> {
    const raw = await this.redis.get(DIAMOND_KEY(userId));
    if (raw) return JSON.parse(raw);
    return {
      balance: 0,
      totalPurchased: 0,
      totalSpent: 0,
      totalReceived: 0,
      totalConverted: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  async getDiamondHistory(userId: string, limit = 50): Promise<DiamondTransaction[]> {
    const list = await this.redis.lRange(DIAMOND_HISTORY(userId), 0, limit - 1);
    return list.map((s) => JSON.parse(s));
  }

  async getConfig(): Promise<DiamondConfig> {
    const raw = await this.redis.get(DIAMOND_CONFIG);
    if (raw) return JSON.parse(raw);
    // Initialize default config
    await this.redis.set(DIAMOND_CONFIG, JSON.stringify(DEFAULT_CONFIG));
    return DEFAULT_CONFIG;
  }

  async spendDiamonds(
    userId: string,
    amount: number,
    referenceType: string,
    referenceId?: string,
    description?: string,
  ): Promise<{ balance: number }> {
    const now = new Date().toISOString();
    const result = await this.redis.getClient().eval(
      this.spendDiamondsScript, 1, DIAMOND_KEY(userId), amount.toString(), now,
    ) as string;
    const parsed = JSON.parse(result);

    if (parsed.err === 'NO_BALANCE') {
      throw new BadRequestException('No diamond balance found. Please purchase diamonds first.');
    }
    if (parsed.err === 'INSUFFICIENT') {
      throw new BadRequestException(
        `Insufficient diamonds. You have ${parsed.balance}, but need ${amount}.`
      );
    }

    // Record transaction history
    const tx: DiamondTransaction = {
      id: this.genId('dt'),
      type: 'spend',
      amount: -amount,
      referenceId,
      referenceType,
      description: description || `Spent ${amount} diamonds on ${referenceType}`,
      createdAt: now,
    };
    await this.redis.lPush(DIAMOND_HISTORY(userId), JSON.stringify(tx));

    this.kafkaProducer.sendEvent(DIAMOND_EVENTS.DIAMOND_SPENT, {
      userId, amount, referenceType, referenceId, spentAt: now,
    }).catch(err => this.logger.error('Failed to send DIAMOND_SPENT event', err));

    return { balance: parsed.balance };
  }

  async creditDiamonds(
    userId: string,
    amount: number,
    creditType: 'purchase' | 'received',
    referenceId?: string,
    referenceType?: string,
    description?: string,
  ): Promise<{ balance: number }> {
    const now = new Date().toISOString();
    const result = await this.redis.getClient().eval(
      this.creditDiamondsScript, 1, DIAMOND_KEY(userId),
      amount.toString(), creditType, now, userId,
    ) as string;
    const parsed = JSON.parse(result);

    const tx: DiamondTransaction = {
      id: this.genId('dt'),
      type: creditType === 'purchase' ? 'purchase' : 'credit',
      amount,
      referenceId,
      referenceType,
      description: description || `Credited ${amount} diamonds (${creditType})`,
      createdAt: now,
    };
    await this.redis.lPush(DIAMOND_HISTORY(userId), JSON.stringify(tx));

    this.kafkaProducer.sendEvent(DIAMOND_EVENTS.DIAMOND_CREDITED, {
      userId, amount, creditType, referenceId, creditedAt: now,
    }).catch(err => this.logger.error('Failed to send DIAMOND_CREDITED event', err));

    return { balance: parsed.balance };
  }

  async transferDiamonds(
    fromUserId: string,
    toUserId: string,
    amount: number,
    referenceType?: string,
    referenceId?: string,
    description?: string,
  ): Promise<{ fromBalance: number; toBalance: number }> {
    const now = new Date().toISOString();
    const result = await this.redis.getClient().eval(
      this.transferDiamondsScript, 2,
      DIAMOND_KEY(fromUserId), DIAMOND_KEY(toUserId),
      amount.toString(), now,
    ) as string;
    const parsed = JSON.parse(result);

    if (parsed.err === 'NO_BALANCE') {
      throw new BadRequestException('No diamond balance found. Please purchase diamonds first.');
    }
    if (parsed.err === 'INSUFFICIENT') {
      throw new BadRequestException(
        `Insufficient diamonds. You have ${parsed.balance}, but need ${amount}.`
      );
    }

    // Record both sides
    const senderTx: DiamondTransaction = {
      id: this.genId('dt'),
      type: 'transfer_out',
      amount: -amount,
      referenceId: referenceId || toUserId,
      referenceType: referenceType || 'transfer',
      description: description || `Sent ${amount} diamonds`,
      createdAt: now,
    };
    const receiverTx: DiamondTransaction = {
      id: this.genId('dt'),
      type: 'transfer_in',
      amount,
      referenceId: referenceId || fromUserId,
      referenceType: referenceType || 'transfer',
      description: description || `Received ${amount} diamonds`,
      createdAt: now,
    };

    await Promise.all([
      this.redis.lPush(DIAMOND_HISTORY(fromUserId), JSON.stringify(senderTx)),
      this.redis.lPush(DIAMOND_HISTORY(toUserId), JSON.stringify(receiverTx)),
    ]);

    return { fromBalance: parsed.fromBalance, toBalance: parsed.toBalance };
  }

  // ── Spending Helpers (used by tip/ppv/dm/matching) ──────────────

  async spendOnTip(
    fromUserId: string,
    toUserId: string,
    amount: number,
    postId?: string,
    message?: string,
  ): Promise<{ tipId: string; fromBalance: number; toBalance: number }> {
    const result = await this.transferDiamonds(
      fromUserId, toUserId, amount,
      'tip', postId || toUserId,
      message ? `Tip: ${message}` : `Tipped ${amount} diamonds`,
    );

    const tipId = this.genId('tip');
    return { tipId, ...result };
  }

  async spendOnPostPurchase(
    buyerId: string,
    postId: string,
    ppvPrice: number,
    creatorId: string,
  ): Promise<{ purchaseId: string; buyerBalance: number }> {
    const result = await this.transferDiamonds(
      buyerId, creatorId, ppvPrice,
      'ppv', postId,
      `Unlocked post ${postId} for ${ppvPrice} diamonds`,
    );

    const purchaseId = this.genId('ppv');
    return { purchaseId, buyerBalance: result.fromBalance };
  }

  async spendOnDmUnlock(
    buyerId: string,
    creatorId: string,
    dmPrice: number,
  ): Promise<{ purchaseId: string; buyerBalance: number }> {
    const result = await this.transferDiamonds(
      buyerId, creatorId, dmPrice,
      'dm_unlock', creatorId,
      `Unlocked DM with creator for ${dmPrice} diamonds`,
    );

    const purchaseId = this.genId('dmp');
    return { purchaseId, buyerBalance: result.fromBalance };
  }

  async spendOnSuperLike(userId: string): Promise<{ balance: number; cost: number }> {
    const config = await this.getConfig();
    const result = await this.spendDiamonds(
      userId, config.superLikeCost,
      'super_like', undefined,
      `Super Like (${config.superLikeCost} diamonds)`,
    );
    return { balance: result.balance, cost: config.superLikeCost };
  }

  async spendOnBoost(userId: string): Promise<{ balance: number; cost: number; expiresAt: string }> {
    const config = await this.getConfig();
    const result = await this.spendDiamonds(
      userId, config.boostCost,
      'boost', undefined,
      `Profile Boost (${config.boostCost} diamonds)`,
    );

    const expiresAt = new Date(Date.now() + config.boostDurationMinutes * 60 * 1000).toISOString();
    return { balance: result.balance, cost: config.boostCost, expiresAt };
  }

  async adminAdjustBalance(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<{ success: boolean; newBalance: number }> {
    if (amount > 0) {
      const result = await this.creditDiamonds(
        userId, amount, 'purchase', undefined, 'admin_adjust',
        `Admin adjustment: ${reason}`,
      );
      return { success: true, newBalance: result.balance };
    } else if (amount < 0) {
      const result = await this.spendDiamonds(
        userId, Math.abs(amount), 'admin_adjust', undefined,
        `Admin adjustment: ${reason}`,
      );
      return { success: true, newBalance: result.balance };
    }

    const balance = await this.getBalance(userId);
    return { success: true, newBalance: balance.balance };
  }

  async updateConfig(
    dto: Partial<{
      superLikeCost: number;
      boostCost: number;
      boostDurationMinutes: number;
      conversionRate: number;
      platformFeeRate: number;
      minConversionDiamonds: number;
    }>,
  ): Promise<DiamondConfig> {
    const current = await this.getConfig();
    const updated: DiamondConfig = { ...current, ...dto };
    await this.redis.set(DIAMOND_CONFIG, JSON.stringify(updated));
    return updated;
  }

  async convertDiamondsToCash(
    userId: string,
    diamondAmount: number,
  ): Promise<{ cashAmount: number; remainingDiamonds: number }> {
    const config = await this.getConfig();

    if (diamondAmount < config.minConversionDiamonds) {
      throw new BadRequestException(
        `Minimum conversion is ${config.minConversionDiamonds} diamonds`,
      );
    }

    const now = new Date().toISOString();
    const result = await this.redis.getClient().eval(
      this.convertDiamondsScript, 1, DIAMOND_KEY(userId),
      diamondAmount.toString(), now,
    ) as string;
    const parsed = JSON.parse(result);

    if (parsed.err === 'NO_BALANCE') {
      throw new BadRequestException('No diamond balance found');
    }
    if (parsed.err === 'INSUFFICIENT') {
      throw new BadRequestException(
        `Insufficient diamonds. You have ${parsed.balance}, need ${diamondAmount}.`
      );
    }

    // Calculate cash: diamonds / conversionRate * (1 - platformFee)
    const grossCash = diamondAmount / config.conversionRate;
    const cashAmount = Math.round(grossCash * (1 - config.platformFeeRate) * 100) / 100;

    const tx: DiamondTransaction = {
      id: this.genId('dt'),
      type: 'conversion',
      amount: -diamondAmount,
      referenceType: 'cash_conversion',
      description: `Converted ${diamondAmount} diamonds to $${cashAmount.toFixed(2)}`,
      createdAt: now,
    };
    await this.redis.lPush(DIAMOND_HISTORY(userId), JSON.stringify(tx));

    this.kafkaProducer.sendEvent(DIAMOND_EVENTS.DIAMOND_CONVERTED, {
      userId, diamondAmount, cashAmount, convertedAt: now,
    }).catch(err => this.logger.error('Failed to send DIAMOND_CONVERTED event', err));

    return { cashAmount, remainingDiamonds: parsed.balance };
  }
}
