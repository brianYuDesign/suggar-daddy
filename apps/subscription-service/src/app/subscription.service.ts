import { Injectable, NotFoundException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { SUBSCRIPTION_EVENTS } from '@suggar-daddy/common';
import { PaginatedResponse } from '@suggar-daddy/dto';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto/subscription.dto';

const SUB_KEY = (id: string) => `subscription:${id}`;
const SUBS_SUBSCRIBER = (subscriberId: string) => `subscriptions:subscriber:${subscriberId}`;
const SUBS_CREATOR = (creatorId: string) => `subscriptions:creator:${creatorId}`;

export interface Subscription {
  id: string;
  subscriberId: string;
  creatorId: string;
  tierId: string;
  status: 'active' | 'cancelled' | 'expired';
  stripeSubscriptionId: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  createdAt: string;
  cancelledAt: string | null;
}

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  private genId(): string {
    return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async create(createDto: CreateSubscriptionDto): Promise<Subscription> {
    const id = this.genId();
    const now = new Date().toISOString();
    const startDate = createDto.startDate || now;
    const sub: Subscription = {
      id,
      subscriberId: createDto.subscriberId,
      creatorId: createDto.creatorId,
      tierId: createDto.tierId,
      status: 'active',
      stripeSubscriptionId: createDto.stripeSubscriptionId ?? null,
      currentPeriodStart: startDate,
      currentPeriodEnd: createDto.currentPeriodEnd ?? null,
      createdAt: now,
      cancelledAt: null,
    };
    await this.redis.set(SUB_KEY(id), JSON.stringify(sub));
    await this.redis.lPush(SUBS_SUBSCRIBER(createDto.subscriberId), id);
    await this.redis.lPush(SUBS_CREATOR(createDto.creatorId), id);
    await this.kafkaProducer.sendEvent(SUBSCRIPTION_EVENTS.SUBSCRIPTION_CREATED, {
      subscriptionId: id,
      subscriberId: createDto.subscriberId,
      creatorId: createDto.creatorId,
      tierId: createDto.tierId,
      startDate,
    });
    return sub;
  }

  async findAll(): Promise<Subscription[]> {
    const scannedKeys = await this.redis.scan('subscription:sub-*');
    const values = await this.redis.mget(...scannedKeys);
    const out = values.filter(Boolean).map((raw) => JSON.parse(raw!));
    return out.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  async findBySubscriber(subscriberId: string, page = 1, limit = 20): Promise<PaginatedResponse<Subscription>> {
    // Must fetch all and filter by status — can't paginate at Redis level
    const ids = await this.redis.lRange(SUBS_SUBSCRIBER(subscriberId), 0, -1);
    const keys = ids.map((id) => SUB_KEY(id));
    const values = await this.redis.mget(...keys);
    const active = values
      .filter(Boolean)
      .map((raw) => JSON.parse(raw!))
      .filter((s) => s.status === 'active');
    active.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    const skip = (page - 1) * limit;
    return { data: active.slice(skip, skip + limit), total: active.length, page, limit };
  }

  async findByCreator(creatorId: string, page = 1, limit = 20): Promise<PaginatedResponse<Subscription>> {
    const ids = await this.redis.lRange(SUBS_CREATOR(creatorId), 0, -1);
    const keys = ids.map((id) => SUB_KEY(id));
    const values = await this.redis.mget(...keys);
    const active = values
      .filter(Boolean)
      .map((raw) => JSON.parse(raw!))
      .filter((s) => s.status === 'active');
    active.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    const skip = (page - 1) * limit;
    return { data: active.slice(skip, skip + limit), total: active.length, page, limit };
  }

  async findOne(id: string): Promise<Subscription> {
    const raw = await this.redis.get(SUB_KEY(id));
    if (!raw) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }
    return JSON.parse(raw);
  }

  async update(id: string, updateDto: UpdateSubscriptionDto): Promise<Subscription> {
    const sub = await this.findOne(id);
    Object.assign(sub, updateDto);
    await this.redis.set(SUB_KEY(id), JSON.stringify(sub));
    await this.kafkaProducer.sendEvent(SUBSCRIPTION_EVENTS.SUBSCRIPTION_UPDATED, {
      subscriptionId: id,
      ...updateDto,
      updatedAt: new Date().toISOString(),
    });
    return sub;
  }

  async cancel(id: string): Promise<Subscription> {
    const sub = await this.findOne(id);
    sub.status = 'cancelled';
    sub.cancelledAt = new Date().toISOString();
    await this.redis.set(SUB_KEY(id), JSON.stringify(sub));
    await this.kafkaProducer.sendEvent(SUBSCRIPTION_EVENTS.SUBSCRIPTION_CANCELLED, {
      subscriptionId: id,
      reason: 'user_cancelled',
      cancelledAt: sub.cancelledAt,
    });
    return sub;
  }

  /** 支付完成後延長訂閱週期（由 payment.completed 消費者呼叫） */
  async extendPeriod(subscriptionId: string, newPeriodEnd: string): Promise<Subscription> {
    const sub = await this.findOne(subscriptionId);
    if (sub.status !== 'active') return sub;
    sub.currentPeriodEnd = newPeriodEnd;
    await this.redis.set(SUB_KEY(subscriptionId), JSON.stringify(sub));
    await this.kafkaProducer.sendEvent(SUBSCRIPTION_EVENTS.SUBSCRIPTION_UPDATED, {
      subscriptionId,
      currentPeriodEnd: newPeriodEnd,
      updatedAt: new Date().toISOString(),
    });
    return sub;
  }

  /** 檢查訂閱者是否對創作者（及可選方案）有有效訂閱（供 content-service 訂閱牆可見性使用） */
  async hasActiveSubscription(
    subscriberId: string,
    creatorId: string,
    tierId?: string | null
  ): Promise<boolean> {
    const result = await this.findBySubscriber(subscriberId, 1, 10000);
    const now = new Date().toISOString();
    const active = result.data.filter(
      (s) =>
        s.creatorId === creatorId &&
        s.status === 'active' &&
        (!s.currentPeriodEnd || s.currentPeriodEnd >= now)
    );
    if (tierId) {
      return active.some((s) => s.tierId === tierId);
    }
    return active.length > 0;
  }
}
