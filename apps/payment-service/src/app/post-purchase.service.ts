import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { PAYMENT_EVENTS } from '@suggar-daddy/common';
import { CreatePostPurchaseDto } from './dto/post-purchase.dto';

const PURCHASE_KEY = (id: string) => `post-purchase:${id}`;
const PURCHASES_BUYER = (userId: string) => `post-purchases:buyer:${userId}`;
const PURCHASES_POST = (postId: string) => `post-purchases:post:${postId}`;
const PURCHASE_BY_BUYER_POST = (buyerId: string, postId: string) =>
  `post-purchase:by-buyer-post:${buyerId}:${postId}`;

@Injectable()
export class PostPurchaseService {
  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  private genId(): string {
    return `ppv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async create(dto: CreatePostPurchaseDto & { stripePaymentId?: string }): Promise<any> {
    const existingId = await this.redis.get(PURCHASE_BY_BUYER_POST(dto.buyerId, dto.postId));
    if (existingId) {
      const existingRaw = await this.redis.get(PURCHASE_KEY(existingId));
      if (existingRaw) {
        throw new ConflictException('You have already purchased this post');
      }
    }

    const id = this.genId();
    const now = new Date().toISOString();
    const purchase = {
      id,
      postId: dto.postId,
      buyerId: dto.buyerId,
      amount: dto.amount,
      stripePaymentId: dto.stripePaymentId ?? null,
      createdAt: now,
    };
    await this.redis.set(PURCHASE_KEY(id), JSON.stringify(purchase));
    await this.redis.set(PURCHASE_BY_BUYER_POST(dto.buyerId, dto.postId), id);
    await this.redis.lPush(PURCHASES_BUYER(dto.buyerId), id);
    await this.redis.lPush(PURCHASES_POST(dto.postId), id);
    await this.kafkaProducer.sendEvent(PAYMENT_EVENTS.POST_PURCHASED, {
      userId: dto.buyerId,
      postId: dto.postId,
      amount: dto.amount,
      transactionId: id,
      purchasedAt: now,
    });
    return purchase;
  }

  async findByBuyer(userId: string): Promise<any[]> {
    const ids = await this.redis.lRange(PURCHASES_BUYER(userId), 0, -1);
    const keys = ids.map((id) => PURCHASE_KEY(id));
    const values = await this.redis.mget(...keys);
    const out = values.filter(Boolean).map((raw) => JSON.parse(raw!));
    return out.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  async findOne(id: string): Promise<any> {
    const raw = await this.redis.get(PURCHASE_KEY(id));
    if (!raw) throw new NotFoundException(`Post purchase ${id} not found`);
    return JSON.parse(raw);
  }
}
