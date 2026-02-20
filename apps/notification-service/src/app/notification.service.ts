import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { InjectLogger } from '@suggar-daddy/common';
import type {
  InternalSendNotificationDto,
  NotificationItemDto,
} from '@suggar-daddy/dto';

const NOTIF_KEY = (id: string) => `notification:${id}`;
const USER_NOTIFS = (userId: string) => `user:${userId}:notifications`;

interface StoredNotification extends Omit<NotificationItemDto, 'createdAt'> {
  userId: string;
  createdAt: string;
}

@Injectable()
export class NotificationService {
  @InjectLogger() private readonly logger!: Logger;

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async send(dto: InternalSendNotificationDto): Promise<NotificationItemDto> {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const item: StoredNotification = {
      id,
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      data: dto.data,
      read: false,
      createdAt: now.toISOString(),
    };
    
    // ✅ 設定 TTL 為 7 天（604800 秒），避免 Redis 記憶體無限增長
    const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
    await this.redis.setex(NOTIF_KEY(id), TTL_SECONDS, JSON.stringify(item));
    await this.redis.lPush(USER_NOTIFS(dto.userId), id);
    
    this.logger.log(`notification sent id=${id} userId=${dto.userId} type=${dto.type}`);
    try {
      await this.kafkaProducer.sendEvent('notification.created', {
        notificationId: id,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        createdAt: item.createdAt,
      });
    } catch (e) {
      this.logger.warn('Kafka notification.created emit failed', e);
    }
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      data: item.data,
      read: item.read,
      createdAt: now,
    };
  }

  async list(
    userId: string,
    limit: number,
    unreadOnly: boolean
  ): Promise<NotificationItemDto[]> {
    const ids = await this.redis.lRange(USER_NOTIFS(userId), 0, limit - 1);
    
    if (ids.length === 0) return [];

    // ✅ 使用 MGET 批量查詢，避免 N+1 問題
    const keys = ids.map(id => NOTIF_KEY(id));
    const values = await this.redis.mget(...keys);

    const list: StoredNotification[] = [];
    for (const raw of values) {
      if (!raw) continue;
      
      const n = JSON.parse(raw) as StoredNotification;
      if (unreadOnly && n.read) continue;
      list.push(n);
    }
    
    if (unreadOnly) {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    const slice = list.slice(0, limit);
    return slice.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      read: n.read,
      createdAt: new Date(n.createdAt),
    }));
  }

  async markAllRead(userId: string): Promise<{ success: boolean }> {
    const ids = await this.redis.lRange(USER_NOTIFS(userId), 0, -1);
    if (ids.length === 0) return { success: true };

    const keys = ids.map(id => NOTIF_KEY(id));
    const values = await this.redis.mget(...keys);
    const TTL_SECONDS = 7 * 24 * 60 * 60;

    for (let i = 0; i < values.length; i++) {
      const raw = values[i];
      if (!raw) continue;
      const item = JSON.parse(raw) as StoredNotification;
      if (item.userId !== userId || item.read) continue;
      item.read = true;
      await this.redis.setex(NOTIF_KEY(ids[i]!), TTL_SECONDS, JSON.stringify(item));
    }

    this.logger.log(`markAllRead userId=${userId} count=${ids.length}`);
    return { success: true };
  }

  async markRead(userId: string, id: string): Promise<{ success: boolean }> {
    const raw = await this.redis.get(NOTIF_KEY(id));
    if (!raw) return { success: false };
    const item = JSON.parse(raw) as StoredNotification;
    if (item.userId !== userId) return { success: false };
    item.read = true;
    
    // ✅ 保持 TTL，更新內容時重新設定過期時間
    const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
    await this.redis.setex(NOTIF_KEY(id), TTL_SECONDS, JSON.stringify(item));
    
    this.logger.log(`markRead userId=${userId} id=${id}`);
    return { success: true };
  }
}
