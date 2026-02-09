import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import type {
  SendNotificationDto,
  NotificationItemDto,
} from '@suggar-daddy/dto';

const NOTIF_KEY = (id: string) => `notification:${id}`;
const USER_NOTIFS = (userId: string) => `user:${userId}:notifications`;

interface StoredNotification extends NotificationItemDto {
  userId: string;
  createdAt: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async send(dto: SendNotificationDto): Promise<NotificationItemDto> {
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
    await this.redis.set(NOTIF_KEY(id), JSON.stringify(item));
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
    const list: StoredNotification[] = [];
    for (const id of ids) {
      const raw = await this.redis.get(NOTIF_KEY(id));
      if (raw) {
        const n = JSON.parse(raw) as StoredNotification;
        if (unreadOnly && n.read) continue;
        list.push(n);
      }
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

  async markRead(userId: string, id: string): Promise<{ success: boolean }> {
    const raw = await this.redis.get(NOTIF_KEY(id));
    if (!raw) return { success: false };
    const item = JSON.parse(raw) as StoredNotification;
    if (item.userId !== userId) return { success: false };
    item.read = true;
    await this.redis.set(NOTIF_KEY(id), JSON.stringify(item));
    this.logger.log(`markRead userId=${userId} id=${id}`);
    return { success: true };
  }
}
