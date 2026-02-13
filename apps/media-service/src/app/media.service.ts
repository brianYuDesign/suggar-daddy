import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { MEDIA_EVENTS } from '@suggar-daddy/common';
import { PaginatedResponse } from '@suggar-daddy/dto';

const MEDIA_KEY = (id: string) => `media:${id}`;
const MEDIA_USER = (userId: string) => `media:user:${userId}`;

export interface Media {
  id: string;
  userId: string;
  fileType: string;
  originalUrl: string;
  thumbnailUrl: string | null;
  processedUrl: string | null;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  processingStatus: string;
  metadata: object | null;
  createdAt: string;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  private genId(): string {
    return `media-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async create(payload: {
    userId: string;
    fileType?: string;
    originalUrl: string;
    thumbnailUrl?: string;
    fileName: string;
    mimeType?: string;
    fileSize?: number;
    width?: number;
    height?: number;
    duration?: number;
    processingStatus?: string;
    metadata?: object;
  }): Promise<Media> {
    const id = this.genId();
    const now = new Date().toISOString();
    const media = {
      id,
      userId: payload.userId,
      fileType: payload.fileType || 'image',
      originalUrl: payload.originalUrl,
      thumbnailUrl: payload.thumbnailUrl ?? null,
      processedUrl: null,
      fileName: payload.fileName,
      mimeType: payload.mimeType ?? null,
      fileSize: payload.fileSize ?? null,
      width: payload.width ?? null,
      height: payload.height ?? null,
      duration: payload.duration ?? null,
      processingStatus: payload.processingStatus || 'completed',
      metadata: payload.metadata ?? null,
      createdAt: now,
    };
    await this.redis.set(MEDIA_KEY(id), JSON.stringify(media));
    await this.redis.lPush(MEDIA_USER(payload.userId), id);
    await this.kafkaProducer.sendEvent(MEDIA_EVENTS.MEDIA_UPLOADED, {
      mediaId: id,
      userId: payload.userId,
      storageUrl: payload.originalUrl,
      mimeType: payload.mimeType,
      fileSize: payload.fileSize,
    });
    this.logger.log(`media created id=${id} userId=${payload.userId}`);
    return media;
  }

  async findAll(page = 1, limit = 20): Promise<PaginatedResponse<Media>> {
    // SCAN does not support native pagination — fetch all then slice
    const keys = await this.redis.scan('media:media-*');
    if (keys.length === 0) return { data: [], total: 0, page, limit };
    const values = await this.redis.mget(...keys);
    const all: Media[] = [];
    for (const raw of values) {
      if (raw) all.push(JSON.parse(raw));
    }
    all.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    const skip = (page - 1) * limit;
    return { data: all.slice(skip, skip + limit), total: all.length, page, limit };
  }

  async findByUser(userId: string, page = 1, limit = 20): Promise<PaginatedResponse<Media>> {
    const key = MEDIA_USER(userId);
    const total = await this.redis.lLen(key);
    const skip = (page - 1) * limit;
    const ids = await this.redis.lRange(key, skip, skip + limit - 1);
    if (ids.length === 0) return { data: [], total, page, limit };
    const keys = ids.map((id) => MEDIA_KEY(id));
    const values = await this.redis.mget(...keys);
    const data: Media[] = [];
    for (const raw of values) {
      if (raw) data.push(JSON.parse(raw));
    }
    return { data: data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)), total, page, limit };
  }

  async findOne(id: string): Promise<Media> {
    const raw = await this.redis.get(MEDIA_KEY(id));
    if (!raw) {
      throw new NotFoundException(`Media ${id} not found`);
    }
    return JSON.parse(raw);
  }

  async updateFields(
    id: string,
    fields: Partial<Pick<Media, 'thumbnailUrl' | 'processedUrl' | 'processingStatus' | 'metadata'>>,
  ): Promise<Media> {
    const media = await this.findOne(id);
    const updated = { ...media, ...fields };
    await this.redis.set(MEDIA_KEY(id), JSON.stringify(updated));
    this.logger.log(`media updated id=${id}`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const media = await this.findOne(id);
    await this.redis.del(MEDIA_KEY(id));
    await this.kafkaProducer.sendEvent(MEDIA_EVENTS.MEDIA_DELETED, {
      mediaId: id,
      userId: media.userId,
      deletedAt: new Date().toISOString(),
    });
    this.logger.log(`media deleted id=${id}`);
  }
}
