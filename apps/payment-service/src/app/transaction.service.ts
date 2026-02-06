import { Injectable, NotFoundException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { PAYMENT_EVENTS } from '@suggar-daddy/common';
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

  async findAll(): Promise<any[]> {
    const keys = await this.redis.keys('transaction:tx-*');
    const out: any[] = [];
    for (const key of keys) {
      const raw = await this.redis.get(key);
      if (raw) out.push(JSON.parse(raw));
    }
    return out.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).slice(0, 100);
  }

  async findByUser(userId: string): Promise<any[]> {
    const ids = await this.redis.lRange(TX_USER(userId), 0, -1);
    const out: any[] = [];
    for (const id of ids) {
      const raw = await this.redis.get(TX_KEY(id));
      if (raw) out.push(JSON.parse(raw));
    }
    return out.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
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
