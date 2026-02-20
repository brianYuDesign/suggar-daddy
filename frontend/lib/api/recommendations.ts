import { api } from './client';

// Types
export interface Recommendation {
  id: string;
  contentId: string;
  title: string;
  description: string;
  thumbnail?: string;
  tags: string[];
  creatorId: string;
  creatorName: string;
  score: number;
  reason: string;
  isSubscribed: boolean;
  createdAt: string;
}

export interface RecommendationsResponse {
  userId: string;
  count: number;
  cacheHit: boolean;
  generatedAt: string;
  recommendations: Recommendation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface InteractionRequest {
  userId: string;
  contentId: string;
  interactionType: 'view' | 'like' | 'share' | 'comment' | 'skip';
}

export interface RatingRequest {
  userId: string;
  contentId: string;
  rating: number; // 1-5
}

export interface GetRecommendationsRequest {
  userId: string;
  limit?: number;
  offset?: number;
  filter?: 'all' | 'subscribed' | 'trending' | 'new';
}

// Recommendations API
export const recommendationsApi = {
  /**
   * 獲取用戶推薦
   * @param params - 請求參數
   * @returns 推薦列表
   */
  getRecommendations: async (
    params: GetRecommendationsRequest
  ): Promise<RecommendationsResponse> => {
    const { userId, limit = 20, offset = 0, filter } = params;
    const queryParams = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      ...(filter && { filter }),
    });
    return api.get(`/recommendations/${userId}?${queryParams.toString()}`);
  },

  /**
   * 記錄用戶互動（視圖、點讚、分享等）
   * @param interaction - 互動信息
   * @returns 成功消息
   */
  recordInteraction: async (
    interaction: InteractionRequest
  ): Promise<{ message: string }> => {
    return api.post('/recommendations/interactions', interaction);
  },

  /**
   * 評分內容
   * @param rating - 評分信息
   * @returns 成功消息
   */
  rateContent: async (
    rating: RatingRequest
  ): Promise<{ message: string }> => {
    return api.post('/recommendations/rate', rating);
  },

  /**
   * 訂閱創作者
   * @param creatorId - 創作者 ID
   * @returns 成功消息
   */
  subscribeCreator: async (creatorId: string): Promise<{ message: string }> => {
    return api.post(`/creators/${creatorId}/subscribe`);
  },

  /**
   * 取消訂閱創作者
   * @param creatorId - 創作者 ID
   * @returns 成功消息
   */
  unsubscribeCreator: async (
    creatorId: string
  ): Promise<{ message: string }> => {
    return api.delete(`/creators/${creatorId}/subscribe`);
  },

  /**
   * 獲取推薦理由
   * @param contentId - 內容 ID
   * @returns 推薦理由
   */
  getRecommendationReason: async (
    contentId: string
  ): Promise<{ reason: string }> => {
    return api.get(`/recommendations/${contentId}/reason`);
  },

  /**
   * 獲取推薦統計
   * @param userId - 用戶 ID
   * @returns 推薦統計數據
   */
  getRecommendationStats: async (
    userId: string
  ): Promise<{
    totalRecommendations: number;
    averageScore: number;
    interactionRate: number;
    lastUpdated: string;
  }> => {
    return api.get(`/recommendations/${userId}/stats`);
  },
};

export default recommendationsApi;
