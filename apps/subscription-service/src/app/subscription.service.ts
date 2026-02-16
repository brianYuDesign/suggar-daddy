import { Injectable, NotFoundException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { SUBSCRIPTION_EVENTS } from '@suggar-daddy/common';
import { PaginatedResponse } from '@suggar-daddy/dto';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto/subscription.dto';

const SUB_KEY = (id: string) => `subscription:${id}`;
const SUBS_SUBSCRIBER = (subscriberId: string) => `subscriptions:subscriber:${subscriberId}`;
const SUBS_CREATOR = (creatorId: string) => `subscriptions:creator:${creatorId}`;
/** Active subscription index: Set of active tier IDs for a subscriber→creator pair */
const ACTIVE_SUB_INDEX = (subscriberId: string, creatorId: string) =>
  `sub:active:${subscriberId}:${creatorId}`;
/** Set of all subscription IDs (avoids SCAN on subscription:sub-* keyspace) */
const SUBS_ALL = 'subscriptions:all';

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
    // Maintain active subscription index for O(1) hasActiveSubscription checks
    await this.redis.sAdd(
      ACTIVE_SUB_INDEX(createDto.subscriberId, createDto.creatorId),
      createDto.tierId,
    );
    // Maintain global subscription index (avoids SCAN)
    await this.redis.sAdd(SUBS_ALL, id);
    await this.kafkaProducer.sendEvent(SUBSCRIPTION_EVENTS.SUBSCRIPTION_CREATED, {
      subscriptionId: id,
      subscriberId: createDto.subscriberId,
      creatorId: createDto.creatorId,
      tierId: createDto.tierId,
      startDate,
    });
    return sub;
  }

  async findAll(page = 1, limit = 100): Promise<PaginatedResponse<Subscription>> {
    // ⚠️ 警告：findAll 仍需使用 SCAN，但添加分頁限制
    // 建議：生產環境應避免使用此方法，或使用專門的索引
    const scannedKeys = await this.redis.scan('subscription:sub-*');
    
    if (scannedKeys.length === 0) {
      return { data: [], total: 0, page, limit };
    }
    
    const values = await this.redis.mget(...scannedKeys);
    const allSubscriptions = values
      .filter(Boolean)
      .map((raw) => JSON.parse(raw!))
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    
    // 應用分頁
    const start = (page - 1) * limit;
    const paginated = allSubscriptions.slice(start, start + limit);
    
    return {
      data: paginated,
      total: allSubscriptions.length,
      page,
      limit,
    };
  }

  async findBySubscriber(subscriberId: string, page = 1, limit = 20): Promise<PaginatedResponse<Subscription>> {
    // ✅ 優化：使用 Redis List 的範圍查詢實現真正的分頁
    // 計算起始和結束索引
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    
    // ✅ 只取當前頁需要的 ID，避免全表掃描
    const ids = await this.redis.lRange(SUBS_SUBSCRIBER(subscriberId), start, end);
    
    if (ids.length === 0) {
      const total = await this.redis.lLen(SUBS_SUBSCRIBER(subscriberId));
      return { data: [], total, page, limit };
    }
    
    // ✅ 批量獲取訂閱詳情
    const keys = ids.map((id) => SUB_KEY(id));
    const values = await this.redis.mget(...keys);
    
    // 解析並過濾 active 訂閱
    const now = new Date().toISOString();
    const subscriptions = values
      .filter(Boolean)
      .map((raw) => JSON.parse(raw!))
      .filter((s) => {
        // 檢查訂閱是否仍然有效
        const isActive = s.status === 'active';
        const notExpired = !s.currentPeriodEnd || s.currentPeriodEnd >= now;
        return isActive && notExpired;
      });
    
    // 排序（最新的在前）
    subscriptions.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    
    // 獲取總數（需要精確計算，因為有過期過濾）
    const total = await this.redis.lLen(SUBS_SUBSCRIBER(subscriberId));
    
    return { 
      data: subscriptions, 
      total, 
      page, 
      limit 
    };
  }

  async findByCreator(creatorId: string, page = 1, limit = 20): Promise<PaginatedResponse<Subscription>> {
    // ✅ 優化：使用 Redis List 的範圍查詢實現真正的分頁
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    
    // ✅ 只取當前頁需要的 ID
    const ids = await this.redis.lRange(SUBS_CREATOR(creatorId), start, end);
    
    if (ids.length === 0) {
      const total = await this.redis.lLen(SUBS_CREATOR(creatorId));
      return { data: [], total, page, limit };
    }
    
    // ✅ 批量獲取訂閱詳情
    const keys = ids.map((id) => SUB_KEY(id));
    const values = await this.redis.mget(...keys);
    
    // 解析並過濾 active 訂閱
    const now = new Date().toISOString();
    const subscriptions = values
      .filter(Boolean)
      .map((raw) => JSON.parse(raw!))
      .filter((s) => {
        const isActive = s.status === 'active';
        const notExpired = !s.currentPeriodEnd || s.currentPeriodEnd >= now;
        return isActive && notExpired;
      });
    
    // 排序
    subscriptions.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    
    // 獲取總數
    const total = await this.redis.lLen(SUBS_CREATOR(creatorId));
    
    return { 
      data: subscriptions, 
      total, 
      page, 
      limit 
    };
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
    // Remove from active subscription index
    await this.redis.sRem(
      ACTIVE_SUB_INDEX(sub.subscriberId, sub.creatorId),
      sub.tierId,
    );
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
    const indexKey = ACTIVE_SUB_INDEX(subscriberId, creatorId);
    if (tierId) {
      // O(1) check for specific tier
      return this.redis.sIsMember(indexKey, tierId);
    }
    // O(1) check for any active subscription
    const count = await this.redis.sCard(indexKey);
    return count > 0;
  }
}
