import { api } from './client';

// Types
export interface Creator {
  id: string;
  userId: string;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  avatar?: string;
  banner?: string;
  website?: string;
  socialLinks: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
  };
  isVerified: boolean;
  followers: number;
  totalViews: number;
  totalEarnings: number;
  joinDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorProfile extends Creator {
  contents: Array<{
    id: string;
    title: string;
    views: number;
    likes: number;
    revenue: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'upload' | 'publish' | 'comment' | 'subscriber';
    description: string;
    timestamp: string;
  }>;
  stats: {
    totalContents: number;
    publishedContents: number;
    draftContents: number;
    totalSubscribers: number;
    monthlyRevenue: number;
  };
}

export interface UpdateCreatorRequest {
  displayName?: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
  };
}

export interface CreatorSettings {
  id: string;
  creatorId: string;
  subscriptionEnabled: boolean;
  commentsEnabled: boolean;
  sharingEnabled: boolean;
  monetizationEnabled: boolean;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  defaultPremiumPrice: number;
  currency: string;
  updatedAt: string;
}

// Creators API
export const creatorsApi = {
  /**
   * 獲取創作者資料
   * @param creatorId - 創作者 ID
   * @returns 創作者詳細信息
   */
  getCreator: async (creatorId: string): Promise<CreatorProfile> => {
    return api.get(`/creators/${creatorId}`);
  },

  /**
   * 獲取創作者簡洁信息
   * @param creatorId - 創作者 ID
   * @returns 創作者基本信息
   */
  getCreatorInfo: async (creatorId: string): Promise<Creator> => {
    return api.get(`/creators/${creatorId}/info`);
  },

  /**
   * 更新創作者資料
   * @param creatorId - 創作者 ID
   * @param data - 更新數據
   * @returns 更新後的創作者信息
   */
  updateCreator: async (
    creatorId: string,
    data: UpdateCreatorRequest
  ): Promise<Creator> => {
    return api.put(`/creators/${creatorId}`, data);
  },

  /**
   * 獲取創作者設置
   * @param creatorId - 創作者 ID
   * @returns 創作者設置
   */
  getSettings: async (creatorId: string): Promise<CreatorSettings> => {
    return api.get(`/creators/${creatorId}/settings`);
  },

  /**
   * 更新創作者設置
   * @param creatorId - 創作者 ID
   * @param settings - 設置數據
   * @returns 更新後的設置
   */
  updateSettings: async (
    creatorId: string,
    settings: Partial<CreatorSettings>
  ): Promise<CreatorSettings> => {
    return api.put(`/creators/${creatorId}/settings`, settings);
  },

  /**
   * 獲取創作者粉絲列表
   * @param creatorId - 創作者 ID
   * @param page - 頁碼
   * @param limit - 每頁數量
   * @returns 粉絲列表
   */
  getFollowers: async (
    creatorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    followers: Array<{
      id: string;
      username: string;
      displayName: string;
      avatar?: string;
      followedAt: string;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    };
  }> => {
    return api.get(
      `/creators/${creatorId}/followers?page=${page}&limit=${limit}`
    );
  },

  /**
   * 檢查當前用戶是否追蹤該創作者
   * @param creatorId - 創作者 ID
   * @returns 追蹤狀態
   */
  isFollowing: async (creatorId: string): Promise<{ following: boolean }> => {
    return api.get(`/creators/${creatorId}/following-status`);
  },

  /**
   * 獲取創作者的內容
   * @param creatorId - 創作者 ID
   * @param page - 頁碼
   * @param limit - 每頁數量
   * @param status - 內容狀態（all, published, draft）
   * @returns 內容列表
   */
  getContents: async (
    creatorId: string,
    page: number = 1,
    limit: number = 20,
    status: 'all' | 'published' | 'draft' = 'published'
  ): Promise<{
    contents: Array<{
      id: string;
      title: string;
      thumbnail?: string;
      views: number;
      likes: number;
      revenue: number;
      status: string;
      createdAt: string;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    };
  }> => {
    return api.get(
      `/creators/${creatorId}/contents?page=${page}&limit=${limit}&status=${status}`
    );
  },

  /**
   * 搜索創作者
   * @param query - 搜索關鍵詞
   * @param limit - 返回數量
   * @returns 搜索結果
   */
  searchCreators: async (
    query: string,
    limit: number = 10
  ): Promise<Creator[]> => {
    return api.get(
      `/creators/search?query=${encodeURIComponent(query)}&limit=${limit}`
    );
  },

  /**
   * 獲取熱門創作者
   * @param limit - 返回數量
   * @returns 熱門創作者列表
   */
  getTrendingCreators: async (limit: number = 10): Promise<Creator[]> => {
    return api.get(`/creators/trending?limit=${limit}`);
  },

  /**
   * 獲取推薦創作者
   * @param limit - 返回數量
   * @returns 推薦創作者列表
   */
  getRecommendedCreators: async (limit: number = 10): Promise<Creator[]> => {
    return api.get(`/creators/recommended?limit=${limit}`);
  },

  /**
   * 檢查用戶名是否可用
   * @param username - 用戶名
   * @returns 可用性
   */
  checkUsernameAvailability: async (
    username: string
  ): Promise<{ available: boolean; message: string }> => {
    return api.get(
      `/creators/check-username/${encodeURIComponent(username)}`
    );
  },

  /**
   * 驗證創作者身份
   * @param creatorId - 創作者 ID
   * @returns 成功消息
   */
  verifyCreator: async (
    creatorId: string
  ): Promise<{ message: string }> => {
    return api.post(`/creators/${creatorId}/verify`);
  },
};

export default creatorsApi;
