import type { ApiClient } from './client';
import type { UserProfileDto, UpdateProfileDto, CursorPaginatedResponse } from './types';

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

/** Backend FollowerDto shape */
interface BackendFollowerDto {
  id: string;
  displayName: string;
  avatarUrl?: string;
  userType: string;
  permissionRole: string;
}

/** Backend RecommendedCreatorDto shape */
interface BackendRecommendedCreatorDto {
  id: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  followerCount: number;
  userType: string;
  permissionRole: string;
}

function mapFollowerToUserCard(f: BackendFollowerDto): UserCard {
  return {
    userId: f.id,
    username: f.displayName,
    displayName: f.displayName,
    avatarUrl: f.avatarUrl,
    role: (f.permissionRole?.toUpperCase() || 'SUBSCRIBER') as UserCard['role'],
  };
}

function mapRecommendedToUserCard(r: BackendRecommendedCreatorDto): UserCard {
  return {
    userId: r.id,
    username: r.displayName,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl,
    bio: r.bio,
    role: (r.permissionRole?.toUpperCase() || 'CREATOR') as UserCard['role'],
  };
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
  async searchUsers(query: string, limit = 20): Promise<UserCard[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const raw = await this.client.get<BackendFollowerDto[]>(`/api/users/search?${params}`);
    return (raw || []).map(mapFollowerToUserCard);
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
  async getRecommendedCreators(limit = 10): Promise<UserCard[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    const raw = await this.client.get<BackendRecommendedCreatorDto[]>(`/api/users/recommended?${params}`);
    return (raw || []).map(mapRecommendedToUserCard);
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
  async getFollowers(userId: string, cursor?: string): Promise<CursorPaginatedResponse<UserCard>> {
    const page = cursor ? parseInt(cursor, 10) : 1;
    const limit = 20;
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    const raw = await this.client.get<{ data: BackendFollowerDto[]; total: number }>(
      `/api/users/${userId}/followers?${params}`
    );
    const data = (raw.data || []).map(mapFollowerToUserCard);
    const hasMore = page * limit < raw.total;
    return { data, hasMore, cursor: hasMore ? String(page + 1) : undefined, total: raw.total };
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
  async getFollowing(userId: string, cursor?: string): Promise<CursorPaginatedResponse<UserCard>> {
    const page = cursor ? parseInt(cursor, 10) : 1;
    const limit = 20;
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    const raw = await this.client.get<{ data: BackendFollowerDto[]; total: number }>(
      `/api/users/${userId}/following?${params}`
    );
    const data = (raw.data || []).map(mapFollowerToUserCard);
    const hasMore = page * limit < raw.total;
    return { data, hasMore, cursor: hasMore ? String(page + 1) : undefined, total: raw.total };
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

  /**
   * 追蹤用戶
   * @param targetId - 目標用戶 ID
   */
  followUser(targetId: string): Promise<{ success: boolean }> {
    return this.client.post<{ success: boolean }>(`/api/users/follow/${targetId}`);
  }

  /**
   * 取消追蹤用戶
   * @param targetId - 目標用戶 ID
   */
  unfollowUser(targetId: string): Promise<{ success: boolean }> {
    return this.client.delete<{ success: boolean }>(`/api/users/follow/${targetId}`);
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
