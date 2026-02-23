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

export interface PaginatedMessagesResponse {
  messages: MessageDto[];
  nextCursor?: string;
  hasMore: boolean;
}

export class MessagingApi {
  constructor(private readonly client: ApiClient) {}

  /**
   * 取得對話列表
   */
  getConversations() {
    return this.client.get<ConversationDto[]>('/api/messaging/conversations');
  }

  /**
   * 取得對話訊息（支援 offset-based 分頁）
   * @param conversationId - 對話 ID
   * @param options - 分頁選項
   */
  async getMessages(
    conversationId: string,
    options?: { cursor?: string; limit?: number },
  ): Promise<PaginatedMessagesResponse> {
    const params: Record<string, string> = {};
    if (options?.cursor) params.cursor = options.cursor;
    if (options?.limit) params.limit = String(options.limit);
    return this.client.get<PaginatedMessagesResponse>(
      `/api/messaging/conversations/${conversationId}/messages`,
      { params: Object.keys(params).length > 0 ? params : undefined },
    );
  }

  /**
   * 發送一對一訊息
   * @param dto - 訊息內容
   */
  sendMessage(dto: SendMessageDto) {
    return this.client.post<MessageDto>('/api/messaging/send', dto);
  }

  /**
   * 使用鑽石解鎖聊天門檻（免費訊息用完後）
   * @param conversationId - 對話 ID
   * @returns 解鎖結果，包含鑽石花費
   */
  unlockChat(conversationId: string) {
    return this.client.post<{ unlocked: boolean; diamondCost: number }>(
      `/api/messaging/conversations/${conversationId}/unlock-chat`,
      {}
    );
  }

  /**
   * 使用鑽石解鎖 DM 權限（付費私訊創作者）
   * @param conversationId - 對話 ID
   * @returns 解鎖結果，包含鑽石花費
   */
  unlockDm(conversationId: string) {
    return this.client.post<{ unlocked: boolean; diamondCost: number }>(
      `/api/messaging/conversations/${conversationId}/unlock-dm`,
      {}
    );
  }

  /**
   * 取得聊天狀態（是否需要鑽石解鎖）
   */
  getChatStatus(conversationId: string) {
    return this.client.get<{
      canSend: boolean;
      gate?: {
        type: 'DM_DIAMOND_GATE' | 'CHAT_DIAMOND_GATE';
        diamondCost: number;
        message: string;
        threshold?: number;
        sentCount?: number;
      };
    }>(`/api/messaging/conversations/${conversationId}/chat-status`);
  }

  /**
   * 標記訊息已讀
   */
  markAsRead(conversationId: string, messageId: string) {
    return this.client.post<{ success: boolean }>(
      `/api/messaging/conversations/${conversationId}/read`,
      { messageId }
    );
  }

  /**
   * 取得對話已讀回執
   */
  getReadReceipts(conversationId: string) {
    return this.client.get<Record<string, { messageId: string; readAt: string }>>(
      `/api/messaging/conversations/${conversationId}/read-receipts`
    );
  }

  /**
   * 取得用戶在線狀態
   */
  getOnlineStatus(userIds: string[]) {
    return this.client.get<Record<string, boolean>>(
      `/api/messaging/online-status`,
      { params: { userIds: userIds.join(',') } }
    );
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
  async getBroadcasts(cursor?: string): Promise<CursorPaginatedResponse<BroadcastDto>> {
    const page = cursor ? parseInt(cursor, 10) : 1;
    const params: Record<string, string> = { page: String(page), limit: '20' };
    const raw = await this.client.get<{
      data: BroadcastDto[];
      total: number;
      page: number;
      limit: number;
    }>('/api/messaging/broadcasts', { params });
    const hasMore = raw.page * raw.limit < raw.total;
    return { data: raw.data || [], hasMore, cursor: hasMore ? String(raw.page + 1) : undefined };
  }
}
