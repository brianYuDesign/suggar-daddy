import type { ApiClient } from './client';
import type {
  SendMessageDto,
  MessageDto,
  ConversationDto,
  SendBroadcastDto,
  BroadcastResultDto,
  BroadcastDto,
  CursorPaginatedResponse,
} from './types';

export class MessagingApi {
  constructor(private readonly client: ApiClient) {}

  /**
   * 取得對話列表
   */
  getConversations() {
    return this.client.get<ConversationDto[]>('/api/messaging/conversations');
  }

  /**
   * 取得對話訊息（支援 cursor-based 分頁）
   * @param conversationId - 對話 ID
   * @param cursor - 分頁游標（可選）
   */
  getMessages(conversationId: string, cursor?: string) {
    const params = cursor ? { cursor } : undefined;
    return this.client.get<MessageDto[]>(
      `/api/messaging/conversations/${conversationId}/messages`,
      { params }
    );
  }

  /**
   * 發送一對一訊息
   * @param dto - 訊息內容
   */
  sendMessage(dto: SendMessageDto) {
    return this.client.post<MessageDto>('/api/messaging/messages', dto);
  }

  /**
   * 發送廣播訊息
   * @requires Role: CREATOR
   * @description 發送訊息給所有訂閱者或特定訂閱層級的訂閱者
   * @param message - 訊息內容
   * @param mediaIds - 媒體 ID 陣列（可選）
   * @param recipientFilter - 接收者篩選條件（預設：ALL_SUBSCRIBERS）
   * @param tierIds - 訂閱層級 ID 陣列（當 recipientFilter 為 TIER_SPECIFIC 時必填）
   * @returns 廣播結果，包含廣播 ID、接收者數量和狀態
   * @throws {UnauthorizedError} 當使用者不是 Creator
   * @throws {BadRequestError} 當參數不合法（如 TIER_SPECIFIC 但未提供 tierIds）
   * @example
   * ```typescript
   * // 發送給所有訂閱者
   * const result = await client.messaging.sendBroadcast({
   *   message: 'Hello everyone! 🎉',
   *   mediaIds: ['media-123'],
   * });
   * 
   * // 發送給特定訂閱層級
   * const result = await client.messaging.sendBroadcast({
   *   message: 'VIP exclusive content!',
   *   recipientFilter: 'TIER_SPECIFIC',
   *   tierIds: ['tier-vip-123'],
   * });
   * ```
   */
  sendBroadcast(dto: SendBroadcastDto) {
    return this.client.post<BroadcastResultDto>('/api/messaging/broadcast', dto);
  }

  /**
   * 取得廣播訊息列表
   * @requires Role: CREATOR
   * @description 取得自己發送的廣播訊息列表（支援 cursor-based 分頁）
   * @param cursor - 分頁游標（可選）
   * @returns 分頁的廣播訊息列表
   * @throws {UnauthorizedError} 當使用者不是 Creator
   * @example
   * ```typescript
   * // 取得第一頁
   * const page1 = await client.messaging.getBroadcasts();
   * console.log(`共 ${page1.data.length} 則廣播`);
   * 
   * // 取得下一頁
   * if (page1.hasMore && page1.cursor) {
   *   const page2 = await client.messaging.getBroadcasts(page1.cursor);
   * }
   * ```
   */
  getBroadcasts(cursor?: string) {
    const params = cursor ? { cursor } : undefined;
    return this.client.get<CursorPaginatedResponse<BroadcastDto>>(
      '/api/messaging/broadcasts',
      { params }
    );
  }
}
