import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { MEDIA_EVENTS } from '@suggar-daddy/common';

const MEDIA_KEY = (id: string) => `media:${id}`;
const MEDIA_USER = (userId: string) => `media:user:${userId}`;

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
  }): Promise<any> {
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

  async findAll(): Promise<any[]> {
    const keys = await this.redis.keys('media:media-*');
    const out: any[] = [];
    for (const key of keys) {
      const raw = await this.redis.get(key);
      if (raw) out.push(JSON.parse(raw));
    }
    return out.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  async findByUser(userId: string): Promise<any[]> {
    const ids = await this.redis.lRange(MEDIA_USER(userId), 0, -1);
    const out: any[] = [];
    for (const id of ids) {
      const raw = await this.redis.get(MEDIA_KEY(id));
      if (raw) out.push(JSON.parse(raw));
    }
    return out.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  async findOne(id: string): Promise<any> {
    const raw = await this.redis.get(MEDIA_KEY(id));
    if (!raw) {
      throw new NotFoundException(`Media ${id} not found`);
    }
    return JSON.parse(raw);
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
