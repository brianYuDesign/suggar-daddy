import { Injectable, NotFoundException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { SUBSCRIPTION_EVENTS } from '@suggar-daddy/common';
import { CreateSubscriptionTierDto, UpdateSubscriptionTierDto } from './dto/subscription-tier.dto';

const TIER_KEY = (id: string) => `tier:${id}`;
const TIERS_CREATOR = (creatorId: string) => `tiers:creator:${creatorId}`;
const TIERS_ALL = 'tiers:all';

export interface SubscriptionTier {
  id: string;
  creatorId: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number | null;
  benefits: string[];
  isActive: boolean;
  stripePriceId: string | null;
  createdAt: string;
}

@Injectable()
export class SubscriptionTierService {
  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  private genId(): string {
    return `tier-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async create(createDto: CreateSubscriptionTierDto): Promise<SubscriptionTier> {
    const id = this.genId();
    const now = new Date().toISOString();
    const tier: SubscriptionTier = {
      id,
      creatorId: createDto.creatorId,
      name: createDto.name,
      description: createDto.description ?? null,
      priceMonthly: createDto.priceMonthly,
      priceYearly: createDto.priceYearly ?? null,
      benefits: createDto.benefits || [],
      isActive: true,
      stripePriceId: createDto.stripePriceId ?? null,
      createdAt: now,
    };
    await this.redis.set(TIER_KEY(id), JSON.stringify(tier));
    await this.redis.lPush(TIERS_CREATOR(createDto.creatorId), id);
    await this.redis.sAdd(TIERS_ALL, id);
    await this.kafkaProducer.sendEvent(SUBSCRIPTION_EVENTS.TIER_CREATED, {
      tierId: id,
      creatorId: createDto.creatorId,
      name: createDto.name,
      description: createDto.description,
      priceMonthly: createDto.priceMonthly,
      priceYearly: createDto.priceYearly,
      benefits: createDto.benefits,
      stripePriceId: createDto.stripePriceId,
    });
    return tier;
  }

  async findAll(): Promise<SubscriptionTier[]> {
    const ids = await this.redis.sMembers(TIERS_ALL);
    const keys = ids.map((id) => TIER_KEY(id));
    const values = await this.redis.mget(...keys);
    const out = values
      .filter(Boolean)
      .map((raw) => JSON.parse(raw!))
      .filter((t) => t.isActive !== false);
    return out.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  async findByCreator(creatorId: string): Promise<SubscriptionTier[]> {
    const ids = await this.redis.lRange(TIERS_CREATOR(creatorId), 0, -1);
    const keys = ids.map((id) => TIER_KEY(id));
    const values = await this.redis.mget(...keys);
    const out = values
      .filter(Boolean)
      .map((raw) => JSON.parse(raw!))
      .filter((t) => t.isActive !== false);
    return out.sort((a, b) => (a.priceMonthly - b.priceMonthly));
  }

  async findOne(id: string): Promise<SubscriptionTier> {
    const raw = await this.redis.get(TIER_KEY(id));
    if (!raw) {
      throw new NotFoundException(`Subscription tier with ID ${id} not found`);
    }
    return JSON.parse(raw);
  }

  async update(id: string, updateDto: UpdateSubscriptionTierDto): Promise<SubscriptionTier> {
    const tier = await this.findOne(id);
    Object.assign(tier, updateDto);
    await this.redis.set(TIER_KEY(id), JSON.stringify(tier));
    await this.kafkaProducer.sendEvent(SUBSCRIPTION_EVENTS.TIER_UPDATED, {
      tierId: id,
      ...updateDto,
      updatedAt: new Date().toISOString(),
    });
    return tier;
  }

  async remove(id: string): Promise<void> {
    const tier = await this.findOne(id);
    tier.isActive = false;
    await this.redis.set(TIER_KEY(id), JSON.stringify(tier));
  }
}
