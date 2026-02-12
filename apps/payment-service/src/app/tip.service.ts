import { Injectable, NotFoundException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { PAYMENT_EVENTS } from '@suggar-daddy/common';
import { PaginatedResponse } from '@suggar-daddy/dto';
import { CreateTipDto } from './dto/tip.dto';

const TIP_KEY = (id: string) => `tip:${id}`;
const TIPS_FROM = (userId: string) => `tips:from:${userId}`;
const TIPS_TO = (userId: string) => `tips:to:${userId}`;

export interface Tip {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  message: string | null;
  stripePaymentId: string | null;
  createdAt: string;
}

@Injectable()
export class TipService {
  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  private genId(): string {
    return `tip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async create(dto: CreateTipDto & { stripePaymentId?: string }): Promise<Tip> {
    const id = this.genId();
    const now = new Date().toISOString();
    const tip: Tip = {
      id,
      fromUserId: dto.fromUserId,
      toUserId: dto.toUserId,
      amount: dto.amount,
      message: dto.message ?? null,
      stripePaymentId: dto.stripePaymentId ?? null,
      createdAt: now,
    };
    await this.redis.set(TIP_KEY(id), JSON.stringify(tip));
    await this.redis.lPush(TIPS_FROM(dto.fromUserId), id);
    await this.redis.lPush(TIPS_TO(dto.toUserId), id);
    await this.kafkaProducer.sendEvent(PAYMENT_EVENTS.TIP_SENT, {
      senderId: dto.fromUserId,
      recipientId: dto.toUserId,
      amount: dto.amount,
      transactionId: id,
      sentAt: now,
    });
    return tip;
  }

  async findByFrom(userId: string, page = 1, limit = 20): Promise<PaginatedResponse<Tip>> {
    const key = TIPS_FROM(userId);
    const total = await this.redis.lLen(key);
    const skip = (page - 1) * limit;
    const ids = await this.redis.lRange(key, skip, skip + limit - 1);
    const keys = ids.map((id) => TIP_KEY(id));
    const values = await this.redis.mget(...keys);
    const data = values.filter(Boolean).map((raw) => JSON.parse(raw!));
    return { data: data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)), total, page, limit };
  }

  async findByTo(userId: string, page = 1, limit = 20): Promise<PaginatedResponse<Tip>> {
    const key = TIPS_TO(userId);
    const total = await this.redis.lLen(key);
    const skip = (page - 1) * limit;
    const ids = await this.redis.lRange(key, skip, skip + limit - 1);
    const keys = ids.map((id) => TIP_KEY(id));
    const values = await this.redis.mget(...keys);
    const data = values.filter(Boolean).map((raw) => JSON.parse(raw!));
    return { data: data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)), total, page, limit };
  }

  async findOne(id: string): Promise<Tip> {
    const raw = await this.redis.get(TIP_KEY(id));
    if (!raw) throw new NotFoundException(`Tip ${id} not found`);
    return JSON.parse(raw);
  }
}
