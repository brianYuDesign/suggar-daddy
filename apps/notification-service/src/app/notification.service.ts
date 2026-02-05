import { Injectable, Logger } from '@nestjs/common';
import type {
  SendNotificationDto,
  NotificationItemDto,
} from '@suggar-daddy/dto';

/**
 * 架構：可消費 Kafka matching.matched 等事件發送推播。
 * Phase 1：in-memory 儲存，僅做 API 與介面。
 */
interface StoredNotification extends NotificationItemDto {
  userId: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private notifications: StoredNotification[] = [];

  async send(dto: SendNotificationDto): Promise<NotificationItemDto> {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const item: StoredNotification = {
      id,
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      data: dto.data,
      read: false,
      createdAt: new Date(),
    };
    this.notifications.push(item);
    this.logger.log(`notification sent id=${id} userId=${dto.userId} type=${dto.type}`);
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      data: item.data,
      read: item.read,
      createdAt: item.createdAt,
    };
  }

  async list(
    userId: string,
    limit: number,
    unreadOnly: boolean
  ): Promise<NotificationItemDto[]> {
    let list = this.notifications.filter((n) => n.userId === userId);
    if (unreadOnly) {
      list = list.filter((n) => !n.read);
    }
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const slice = list.slice(0, limit);
    return slice.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      read: n.read,
      createdAt: n.createdAt,
    }));
  }

  async markRead(userId: string, id: string): Promise<{ success: boolean }> {
    const item = this.notifications.find(
      (n) => n.id === id && n.userId === userId
    );
    if (item) {
      item.read = true;
      this.logger.log(`markRead userId=${userId} id=${id}`);
      return { success: true };
    }
    return { success: false };
  }
}
