import type { ApiClient } from './client';
import type { UserProfileDto, UpdateProfileDto } from '@suggar-daddy/dto';

export interface ReportDto {
  targetType: 'user' | 'post' | 'comment';
  targetId: string;
  reason: string;
  description?: string;
}

/**
 * 用戶卡片（精簡資訊）
 */
export interface UserCard {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  isVerified?: boolean;
  role: 'ADMIN' | 'CREATOR' | 'SUBSCRIBER';
}

/**
 * 創建用戶 DTO (Admin only)
 */
export interface CreateUserDto {
  email: string;
  username: string;
  password: string;
  role?: 'ADMIN' | 'CREATOR' | 'SUBSCRIBER';
  displayName?: string;
}

/**
 * Cursor-based 分頁回應
 */
export interface CursorPaginatedResponse<T> {
  data: T[];
  cursor?: string;
  hasMore: boolean;
}

/**
 * 追蹤狀態
 */
export interface FollowStatus {
  isFollowing: boolean;
  isFollowedBy: boolean;
}

export class UsersApi {
  constructor(private readonly client: ApiClient) {}

  // ==================== 現有 API ====================

  getProfile(userId: string): Promise<UserProfileDto> {
    return this.client.get<UserProfileDto>(`/api/users/profile/${userId}`);
  }

  getMe(): Promise<UserProfileDto> {
    return this.client.get<UserProfileDto>('/api/users/me');
  }

  updateProfile(dto: UpdateProfileDto): Promise<UserProfileDto> {
    return this.client.put<UserProfileDto>('/api/users/profile', dto);
  }

  blockUser(targetId: string): Promise<{ success: boolean }> {
    return this.client.post<{ success: boolean }>(`/api/users/block/${targetId}`);
  }

  unblockUser(targetId: string): Promise<{ success: boolean }> {
    return this.client.delete<{ success: boolean }>(`/api/users/block/${targetId}`);
  }

  getBlockedUsers(): Promise<string[]> {
    return this.client.get<string[]>('/api/users/blocked');
  }

  report(dto: ReportDto): Promise<{ id: string }> {
    return this.client.post<{ id: string }>('/api/users/report', dto);
  }

  // ==================== P0 核心功能 ====================

  /**
   * 搜尋用戶
   * @param query - 搜尋關鍵字（用戶名、顯示名稱）
   * @param limit - 結果數量限制（預設 20）
   * @returns 用戶卡片列表
   * @example
   * ```typescript
   * const users = await usersApi.searchUsers('john', 10);
   * ```
   */
  searchUsers(query: string, limit = 20): Promise<UserCard[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    return this.client.get<UserCard[]>(`/api/users/search?${params}`);
  }

  /**
   * 取得推薦創作者
   * @param limit - 推薦數量（預設 10）
   * @returns 推薦創作者列表
   * @example
   * ```typescript
   * const creators = await usersApi.getRecommendedCreators(5);
   * ```
   */
  getRecommendedCreators(limit = 10): Promise<UserCard[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    return this.client.get<UserCard[]>(`/api/users/recommended?${params}`);
  }

  /**
   * 取得粉絲列表（追蹤我的人）
   * @param userId - 用戶 ID
   * @param cursor - 分頁游標（可選）
   * @returns 粉絲列表（Cursor-based 分頁）
   * @example
   * ```typescript
   * const result = await usersApi.getFollowers('user123');
   * // 取得下一頁
   * const nextPage = await usersApi.getFollowers('user123', result.cursor);
   * ```
   */
  getFollowers(userId: string, cursor?: string): Promise<CursorPaginatedResponse<UserCard>> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    return this.client.get<CursorPaginatedResponse<UserCard>>(
      `/api/users/${userId}/followers?${params}`
    );
  }

  /**
   * 取得追蹤列表（我追蹤的人）
   * @param userId - 用戶 ID
   * @param cursor - 分頁游標（可選）
   * @returns 追蹤列表（Cursor-based 分頁）
   * @example
   * ```typescript
   * const result = await usersApi.getFollowing('user123');
   * // 取得下一頁
   * const nextPage = await usersApi.getFollowing('user123', result.cursor);
   * ```
   */
  getFollowing(userId: string, cursor?: string): Promise<CursorPaginatedResponse<UserCard>> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    return this.client.get<CursorPaginatedResponse<UserCard>>(
      `/api/users/${userId}/following?${params}`
    );
  }

  /**
   * 取得與目標用戶的追蹤狀態
   * @param targetId - 目標用戶 ID
   * @returns 雙向追蹤狀態
   * @example
   * ```typescript
   * const status = await usersApi.getFollowStatus('target-user-id');
   * if (status.isFollowing) {
   *   console.log('我追蹤了這個人');
   * }
   * if (status.isFollowedBy) {
   *   console.log('這個人追蹤了我');
   * }
   * ```
   */
  getFollowStatus(targetId: string): Promise<FollowStatus> {
    return this.client.get<FollowStatus>(`/api/users/follow/${targetId}/status`);
  }

  // ==================== P1 進階功能 ====================

  /**
   * 批量查詢用戶卡片
   * @param userIds - 用戶 ID 列表
   * @returns 用戶卡片列表
   * @example
   * ```typescript
   * const users = await usersApi.getUserCardsByIds([
   *   'user1', 'user2', 'user3'
   * ]);
   * ```
   */
  getUserCardsByIds(userIds: string[]): Promise<UserCard[]> {
    return this.client.post<UserCard[]>('/api/users/cards/by-ids', { userIds });
  }

  /**
   * 創建用戶（僅限管理員）
   * @param dto - 創建用戶 DTO
   * @returns 完整的用戶資料
   * @example
   * ```typescript
   * const user = await usersApi.createUser({
   *   email: 'user@example.com',
   *   username: 'johndoe',
   *   password: 'securePassword123',
   *   role: 'CREATOR',
   *   displayName: 'John Doe'
   * });
   * ```
   */
  createUser(dto: CreateUserDto): Promise<UserProfileDto> {
    return this.client.post<UserProfileDto>('/api/users', dto);
  }

  /**
   * 設定 DM 價格（僅限創作者）
   * @param price - DM 單次價格（美分）
   * @returns 操作結果
   * @example
   * ```typescript
   * // 設定 DM 價格為 $5.99
   * await usersApi.setDmPrice(599);
   * 
   * // 設為免費（0 或 null）
   * await usersApi.setDmPrice(0);
   * ```
   */
  setDmPrice(price: number): Promise<{ success: boolean }> {
    return this.client.put<{ success: boolean }>('/api/users/settings/dm-price', {
      dmPrice: price,
    });
  }
}
