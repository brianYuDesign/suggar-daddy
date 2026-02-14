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
    
    // ✅ 優化：使用 pipeline 批量執行 Redis 命令
    const timestamp = new Date(now).getTime();
    await Promise.all([
      // 存儲媒體記錄
      this.redis.set(MEDIA_KEY(id), JSON.stringify(media)),
      // 添加到用戶媒體列表
      this.redis.lPush(MEDIA_USER(payload.userId), id),
      // ✅ 新增：添加到全局索引（使用 sorted set）
      this.redis.zAdd('media:index:all', { score: timestamp, member: id }),
    ]);
    
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
    // ⚠️ 警告：findAll 使用全局索引來避免 SCAN
    // ✅ 優化方案：使用 Redis Sorted Set 作為全局媒體索引
    const MEDIA_INDEX = 'media:index:all';
    
    // 先檢查索引是否存在
    const indexExists = await this.redis.exists(MEDIA_INDEX);
    
    if (!indexExists) {
      // 如果索引不存在，需要重建（應該在啟動時或遷移腳本中完成）
      this.logger.warn('Media index does not exist, rebuilding...');
      await this.rebuildMediaIndex();
    }
    
    // 使用 ZREVRANGE 從索引獲取分頁數據（按創建時間倒序）
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    
    const mediaIds = await this.redis.zRevRange(MEDIA_INDEX, start, end);
    
    if (mediaIds.length === 0) {
      const total = await this.redis.zCard(MEDIA_INDEX);
      return { data: [], total, page, limit };
    }
    
    // 批量獲取媒體詳情
    const keys = mediaIds.map((id) => MEDIA_KEY(id));
    const values = await this.redis.mget(...keys);
    
    const data: Media[] = [];
    for (const raw of values) {
      if (raw) {
        data.push(JSON.parse(raw));
      }
    }
    
    // 獲取總數
    const total = await this.redis.zCard(MEDIA_INDEX);
    
    return { 
      data: data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)), 
      total, 
      page, 
      limit 
    };
  }

  /** 重建媒體全局索引（應在啟動時或遷移時調用） */
  private async rebuildMediaIndex(): Promise<void> {
    const MEDIA_INDEX = 'media:index:all';
    this.logger.log('Rebuilding media index...');
    
    // 使用 SCAN 獲取所有媒體 key
    const keys = await this.redis.scan('media:media-*');
    
    if (keys.length === 0) {
      this.logger.log('No media found to index');
      return;
    }
    
    // 批量獲取所有媒體
    const values = await this.redis.mget(...keys);
    
    // 構建索引：使用創建時間戳作為分數
    const indexData: Array<{ score: number; member: string }> = [];
    for (const raw of values) {
      if (raw) {
        const media: Media = JSON.parse(raw);
        const timestamp = new Date(media.createdAt).getTime();
        indexData.push({ score: timestamp, member: media.id });
      }
    }
    
    // 批量寫入索引
    if (indexData.length > 0) {
      await this.redis.zAdd(MEDIA_INDEX, ...indexData);
      this.logger.log(`Media index rebuilt with ${indexData.length} entries`);
    }
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
    
    // ✅ 優化：批量刪除所有相關數據
    await Promise.all([
      // 刪除媒體記錄
      this.redis.del(MEDIA_KEY(id)),
      // ✅ 從全局索引中移除
      this.redis.zRem('media:index:all', id),
      // 從用戶列表中移除
      this.redis.lRem(MEDIA_USER(media.userId), 0, id),
    ]);
    
    await this.kafkaProducer.sendEvent(MEDIA_EVENTS.MEDIA_DELETED, {
      mediaId: id,
      userId: media.userId,
      deletedAt: new Date().toISOString(),
    });
    this.logger.log(`media deleted id=${id}`);
  }
}
