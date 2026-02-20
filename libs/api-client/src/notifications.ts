import type { ApiClient } from './client';
import type { 
  NotificationItemDto, 
  SendNotificationDto,
  NotificationResultDto,
} from './types';

export class NotificationsApi {
  constructor(private readonly client: ApiClient) {}

  /**
   * 取得所有通知
   * @description 取得當前使用者的所有通知
   * @returns 通知列表
   */
  getAll() {
    return this.client.get<NotificationItemDto[]>('/api/notifications/list');
  }

  /**
   * 標記通知為已讀
   * @param notificationId - 通知 ID
   */
  markAsRead(notificationId: string) {
    return this.client.post<void>(`/api/notifications/read/${notificationId}`);
  }

  /**
   * 標記所有通知為已讀
   * Note: backend has no bulk endpoint, so we fetch all and mark individually
   */
  async markAllAsRead(): Promise<void> {
    try {
      const notifications = await this.getAll();
      const unread = (notifications || []).filter(n => !n.read);
      await Promise.all(unread.map(n => this.markAsRead(n.id)));
    } catch {
      // Silently ignore — best-effort
    }
  }

  /**
   * 發送推播通知
   * @requires Role: ADMIN
   * @description Admin 發送系統推播通知給指定的使用者群組
   * @param dto - 通知內容和目標設定
   * @returns 推播結果，包含通知 ID、目標數量和狀態
   * @throws {UnauthorizedError} 當使用者不是 Admin
   * @throws {BadRequestError} 當參數不合法（如 SPECIFIC 但未提供 userIds）
   * @example
   * ```typescript
   * // 系統公告（所有使用者）
   * const result = await client.notifications.sendNotification({
   *   type: 'ANNOUNCEMENT',
   *   title: '系統維護通知',
   *   message: '系統將於今晚 23:00 - 01:00 進行維護',
   *   targetUsers: 'ALL',
   *   priority: 'HIGH',
   *   expiresAt: '2024-12-31T23:59:59Z',
   * });
   * 
   * // 創作者專屬通知
   * const result = await client.notifications.sendNotification({
   *   type: 'PROMOTION',
   *   title: '創作者分潤活動',
   *   message: '本月分潤提升 20%！',
   *   targetUsers: 'CREATORS',
   *   priority: 'NORMAL',
   *   actionUrl: '/creator/earnings',
   * });
   * 
   * // 特定使用者緊急通知
   * const result = await client.notifications.sendNotification({
   *   type: 'WARNING',
   *   title: '帳戶安全警告',
   *   message: '檢測到異常登入行為',
   *   targetUsers: 'SPECIFIC',
   *   userIds: ['user-123', 'user-456'],
   *   priority: 'URGENT',
   * });
   * ```
   */
  sendNotification(dto: SendNotificationDto) {
    return this.client.post<NotificationResultDto>('/api/notifications/send', dto);
  }
}
