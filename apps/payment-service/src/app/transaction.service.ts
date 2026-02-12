import { Injectable, NotFoundException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { PAYMENT_EVENTS } from '@suggar-daddy/common';
import { PaginatedResponse } from '@suggar-daddy/dto';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';

const TX_KEY = (id: string) => `transaction:${id}`;
const TX_USER = (userId: string) => `transactions:user:${userId}`;
const TX_STRIPE = (stripeId: string) => `transaction:stripe:${stripeId}`;

@Injectable()
export class TransactionService {
  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  private genId(): string {
    return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async create(createDto: CreateTransactionDto & { stripePaymentId?: string }): Promise<any> {
    const id = this.genId();
    const now = new Date().toISOString();
    const tx = {
      id,
      userId: createDto.userId,
      type: createDto.type || 'subscription',
      amount: createDto.amount,
      status: 'pending',
      stripePaymentId: createDto.stripePaymentId ?? null,
      relatedEntityId: createDto.relatedEntityId ?? null,
      relatedEntityType: createDto.relatedEntityType ?? null,
      metadata: createDto.metadata ?? null,
      createdAt: now,
    };
    await this.redis.set(TX_KEY(id), JSON.stringify(tx));
    await this.redis.lPush(TX_USER(createDto.userId), id);
    if (tx.stripePaymentId) {
      await this.redis.set(TX_STRIPE(tx.stripePaymentId), id);
    }
    return tx;
  }

  async findAll(page = 1, limit = 20): Promise<PaginatedResponse<any>> {
    // SCAN does not support native pagination — fetch all then slice
    const scannedKeys = await this.redis.scan('transaction:tx-*');
    const values = await this.redis.mget(...scannedKeys);
    const all = values.filter(Boolean).map((raw) => JSON.parse(raw!));
    all.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    const skip = (page - 1) * limit;
    return { data: all.slice(skip, skip + limit), total: all.length, page, limit };
  }

  async findByUser(userId: string, page = 1, limit = 20): Promise<PaginatedResponse<any>> {
    const key = TX_USER(userId);
    const total = await this.redis.lLen(key);
    const skip = (page - 1) * limit;
    const ids = await this.redis.lRange(key, skip, skip + limit - 1);
    const keys = ids.map((id) => TX_KEY(id));
    const values = await this.redis.mget(...keys);
    const data = values.filter(Boolean).map((raw) => JSON.parse(raw!));
    return { data: data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)), total, page, limit };
  }

  async findOne(id: string): Promise<any> {
    const raw = await this.redis.get(TX_KEY(id));
    if (!raw) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }
    return JSON.parse(raw);
  }

  async findByStripePaymentId(stripePaymentId: string): Promise<any | null> {
    const id = await this.redis.get(TX_STRIPE(stripePaymentId));
    if (!id) return null;
    return this.findOne(id);
  }

  async update(id: string, updateDto: UpdateTransactionDto): Promise<any> {
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
}
