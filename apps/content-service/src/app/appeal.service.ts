import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { MODERATION_EVENTS, InjectLogger } from '@suggar-daddy/common';

const APPEAL_KEY = (id: string) => `moderation:appeal:${id}`;
const APPEALS_BY_CONTENT = (contentId: string) => `moderation:appeals:content:${contentId}`;
const APPEALS_QUEUE = 'moderation:appeals:queue';

export interface ContentAppeal {
  id: string;
  contentId: string;
  contentType: 'post' | 'comment' | 'story' | 'bio';
  userId: string;
  reason: string;
  status: 'pending' | 'granted' | 'denied';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  resolutionNote?: string;
}

@Injectable()
export class AppealService {
  @InjectLogger() private readonly logger!: Logger;

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  private genId(): string {
    return `appeal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async submitAppeal(
    userId: string,
    contentId: string,
    contentType: ContentAppeal['contentType'],
    reason: string,
  ): Promise<ContentAppeal> {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Appeal reason is required');
    }

    // Check for existing pending appeal
    const existingIds = await this.redis.lRange(APPEALS_BY_CONTENT(contentId), 0, -1);
    if (existingIds.length > 0) {
      const existingKeys = existingIds.map((id) => APPEAL_KEY(id));
      const existingValues = await this.redis.mget(...existingKeys);
      for (const raw of existingValues) {
        if (!raw) continue;
        const existing = JSON.parse(raw) as ContentAppeal;
        if (existing.userId === userId && existing.status === 'pending') {
          throw new ConflictException('You already have a pending appeal for this content');
        }
      }
    }

    const id = this.genId();
    const appeal: ContentAppeal = {
      id,
      contentId,
      contentType,
      userId,
      reason: reason.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await this.redis.set(APPEAL_KEY(id), JSON.stringify(appeal));
    await this.redis.lPush(APPEALS_QUEUE, id);
    await this.redis.lPush(APPEALS_BY_CONTENT(contentId), id);

    this.logger.log(`appeal submitted id=${id} contentId=${contentId} userId=${userId}`);

    await this.kafkaProducer.sendEvent(MODERATION_EVENTS.APPEAL_SUBMITTED, {
      appealId: id,
      contentId,
      contentType,
      userId,
      reason: appeal.reason,
      submittedAt: appeal.createdAt,
    });

    return appeal;
  }

  async getAppealQueue(limit = 50): Promise<ContentAppeal[]> {
    const ids = await this.redis.lRange(APPEALS_QUEUE, 0, limit - 1);
    if (ids.length === 0) return [];

    const keys = ids.map((id) => APPEAL_KEY(id));
    const values = await this.redis.mget(...keys);
    return values
      .filter(Boolean)
      .map((raw) => JSON.parse(raw!) as ContentAppeal)
      .filter((appeal) => appeal.status === 'pending');
  }

  async getAppeal(appealId: string): Promise<ContentAppeal> {
    const raw = await this.redis.get(APPEAL_KEY(appealId));
    if (!raw) {
      throw new NotFoundException(`Appeal not found: ${appealId}`);
    }
    return JSON.parse(raw) as ContentAppeal;
  }

  async reviewAppeal(
    appealId: string,
    action: 'grant' | 'deny',
    reviewedBy: string,
    resolutionNote?: string,
  ): Promise<ContentAppeal> {
    const raw = await this.redis.get(APPEAL_KEY(appealId));
    if (!raw) {
      throw new NotFoundException(`Appeal not found: ${appealId}`);
    }

    const appeal = JSON.parse(raw) as ContentAppeal;
    if (appeal.status !== 'pending') {
      throw new BadRequestException(`Appeal is already ${appeal.status}`);
    }

    appeal.status = action === 'grant' ? 'granted' : 'denied';
    appeal.reviewedAt = new Date().toISOString();
    appeal.reviewedBy = reviewedBy;
    if (resolutionNote) {
      appeal.resolutionNote = resolutionNote.trim();
    }

    await this.redis.set(APPEAL_KEY(appealId), JSON.stringify(appeal));

    this.logger.log(`appeal reviewed id=${appealId} action=${action} reviewer=${reviewedBy}`);

    await this.kafkaProducer.sendEvent(MODERATION_EVENTS.APPEAL_RESOLVED, {
      appealId,
      contentId: appeal.contentId,
      contentType: appeal.contentType,
      action,
      reviewedBy,
      resolvedAt: appeal.reviewedAt,
    });

    return appeal;
  }

  async getAppealsByContent(contentId: string): Promise<ContentAppeal[]> {
    const ids = await this.redis.lRange(APPEALS_BY_CONTENT(contentId), 0, -1);
    if (ids.length === 0) return [];

    const keys = ids.map((id) => APPEAL_KEY(id));
    const values = await this.redis.mget(...keys);
    return values
      .filter(Boolean)
      .map((raw) => JSON.parse(raw!) as ContentAppeal)
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }
}
