import type { ApiClient } from './client';
import type { NotificationItemDto } from '@suggar-daddy/dto';

export class NotificationsApi {
  constructor(private readonly client: ApiClient) {}

  getAll() {
    return this.client.get<NotificationItemDto[]>('/api/notifications');
  }

  markAsRead(notificationId: string) {
    return this.client.patch<void>(`/api/notifications/${notificationId}/read`);
  }

  markAllAsRead() {
    return this.client.patch<void>('/api/notifications/read-all');
  }
}
