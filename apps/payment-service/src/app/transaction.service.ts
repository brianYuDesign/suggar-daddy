import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { PAYMENT_EVENTS, StripeService } from '@suggar-daddy/common';
import { PaginatedResponse } from '@suggar-daddy/dto';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';

const TX_KEY = (id: string): string => `transaction:${id}`;
const TX_USER = (userId: string): string => `transactions:user:${userId}`;
const TX_STRIPE = (stripeId: string): string => `transaction:stripe:${stripeId}`;
const TX_ALL_BY_TIME = 'transactions:all:by-time'; // Sorted Set for time-based pagination

export interface Transaction {
  id: string;
  userId: string;
  type: 'subscription' | 'ppv' | 'tip';
  amount: number;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  stripePaymentId: string | null;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

@Injectable()
export class TransactionService {
  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly stripeService: StripeService,
  ) {}

  private genId(): string {
    return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async create(createDto: CreateTransactionDto & { stripePaymentId?: string }): Promise<Transaction> {
    const id = this.genId();
    const now = new Date().toISOString();
    const tx: Transaction = {
      id,
      userId: createDto.userId,
      type: (createDto.type || 'subscription') as Transaction['type'],
      amount: createDto.amount,
      status: 'pending',
      stripePaymentId: createDto.stripePaymentId ?? null,
      relatedEntityId: createDto.relatedEntityId ?? null,
      relatedEntityType: createDto.relatedEntityType ?? null,
      metadata: (createDto.metadata as Record<string, unknown>) ?? null,
      createdAt: now,
    };

    // Use pipeline for atomic batch write
    const pipeline = this.redis.getClient().pipeline();
    pipeline.set(TX_KEY(id), JSON.stringify(tx));
    pipeline.lpush(TX_USER(createDto.userId), id);
    // Add to sorted set for efficient time-based pagination
    pipeline.zadd(TX_ALL_BY_TIME, Date.now(), id);
    if (tx.stripePaymentId) {
      pipeline.set(TX_STRIPE(tx.stripePaymentId), id);
    }
    await pipeline.exec();

    return tx;
  }

  async findAll(page = 1, limit = 20): Promise<PaginatedResponse<Transaction>> {
    // Use Sorted Set for efficient pagination (O(log N + M) instead of O(N))
    const skip = (page - 1) * limit;
    const client = this.redis.getClient();

    // Get transaction IDs from sorted set (reverse order - newest first)
    const ids = await client.zrevrange(TX_ALL_BY_TIME, skip, skip + limit - 1);
    const total = await client.zcard(TX_ALL_BY_TIME);

    if (ids.length === 0) {
      return { data: [], total, page, limit };
    }

    // Batch fetch transaction data
    const keys = ids.map((id) => TX_KEY(id));
    const values = await this.redis.mget(...keys);
    const data = values
      .filter(Boolean)
      .map((raw) => JSON.parse(raw!));

    return { data, total, page, limit };
  }

  async findByUser(userId: string, page = 1, limit = 20): Promise<PaginatedResponse<Transaction>> {
    const key = TX_USER(userId);
    const total = await this.redis.lLen(key);
    const skip = (page - 1) * limit;
    const ids = await this.redis.lRange(key, skip, skip + limit - 1);
    const keys = ids.map((id) => TX_KEY(id));
    const values = await this.redis.mget(...keys);
    const data = values.filter(Boolean).map((raw) => JSON.parse(raw!));
    return { data: data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)), total, page, limit };
  }

  async findOne(id: string): Promise<Transaction> {
    const raw = await this.redis.get(TX_KEY(id));
    if (!raw) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }
    return JSON.parse(raw);
  }

  async findByStripePaymentId(stripePaymentId: string): Promise<Transaction | null> {
    const id = await this.redis.get(TX_STRIPE(stripePaymentId));
    if (!id) return null;
    return this.findOne(id);
  }

  async update(id: string, updateDto: UpdateTransactionDto): Promise<Transaction> {
    const tx = await this.findOne(id);
    Object.assign(tx, updateDto);
    await this.redis.set(TX_KEY(id), JSON.stringify(tx));
    if (tx.status === 'succeeded') {
      await this.kafkaProducer.sendEvent(PAYMENT_EVENTS.PAYMENT_COMPLETED, {
        transactionId: id,
        userId: tx.userId,
        amount: tx.amount,
        type: tx.type,
        metadata: tx.metadata,
      });
    }
    return tx;
  }

  async refund(id: string, reason?: string, amount?: number): Promise<Transaction> {
    const tx = await this.findOne(id);

    if (tx.status === 'refunded') {
      throw new BadRequestException('Transaction has already been refunded');
    }

    if (tx.status !== 'succeeded') {
      throw new BadRequestException(
        `Cannot refund a transaction with status "${tx.status}". Only succeeded transactions can be refunded.`,
      );
    }

    if (amount !== undefined && amount > tx.amount) {
      throw new BadRequestException(
        `Refund amount (${amount}) cannot exceed the transaction amount (${tx.amount})`,
      );
    }

    // Call Stripe refund if the transaction has a stripePaymentId
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

    const refundedAmount = amount ?? tx.amount;

    // Update transaction status
    tx.status = 'refunded';
    tx.metadata = {
      ...(tx.metadata || {}),
      refundedAt: new Date().toISOString(),
      refundedAmount,
      refundReason: reason || null,
      stripeRefundId,
    };
    await this.redis.set(TX_KEY(id), JSON.stringify(tx));

    // Emit Kafka event
    await this.kafkaProducer.sendEvent(PAYMENT_EVENTS.PAYMENT_REFUNDED, {
      transactionId: id,
      userId: tx.userId,
      amount: tx.amount,
      refundedAmount,
      stripeRefundId,
      reason: reason || null,
      refundedAt: new Date().toISOString(),
    });

    return tx;
  }
}
