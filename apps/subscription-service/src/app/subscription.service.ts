import { Injectable, NotFoundException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { SUBSCRIPTION_EVENTS } from '@suggar-daddy/common';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto/subscription.dto';

const SUB_KEY = (id: string) => `subscription:${id}`;
const SUBS_SUBSCRIBER = (subscriberId: string) => `subscriptions:subscriber:${subscriberId}`;
const SUBS_CREATOR = (creatorId: string) => `subscriptions:creator:${creatorId}`;

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  private genId(): string {
    return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async create(createDto: CreateSubscriptionDto): Promise<any> {
    const id = this.genId();
    const now = new Date().toISOString();
    const startDate = createDto.startDate || now;
    const sub = {
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

  async findAll(): Promise<any[]> {
    const keys = await this.redis.keys('subscription:sub-*');
    const out: any[] = [];
    for (const key of keys) {
      const raw = await this.redis.get(key);
      if (raw) out.push(JSON.parse(raw));
    }
    return out.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  async findBySubscriber(subscriberId: string): Promise<any[]> {
    const ids = await this.redis.lRange(SUBS_SUBSCRIBER(subscriberId), 0, -1);
    const out: any[] = [];
    for (const id of ids) {
      const raw = await this.redis.get(SUB_KEY(id));
      if (raw) {
        const s = JSON.parse(raw);
        if (s.status === 'active') out.push(s);
      }
    }
    return out.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  async findByCreator(creatorId: string): Promise<any[]> {
    const ids = await this.redis.lRange(SUBS_CREATOR(creatorId), 0, -1);
    const out: any[] = [];
    for (const id of ids) {
      const raw = await this.redis.get(SUB_KEY(id));
      if (raw) {
        const s = JSON.parse(raw);
        if (s.status === 'active') out.push(s);
      }
    }
    return out.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  async findOne(id: string): Promise<any> {
    const raw = await this.redis.get(SUB_KEY(id));
    if (!raw) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }
    return JSON.parse(raw);
  }

  async update(id: string, updateDto: UpdateSubscriptionDto): Promise<any> {
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

  async cancel(id: string): Promise<any> {
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
}
