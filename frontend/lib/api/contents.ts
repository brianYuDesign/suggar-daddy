import { api } from './client';

// Types
export interface Content {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  thumbnail?: string;
  tags: string[];
  category: string;
  status: 'draft' | 'published' | 'archived';
  views: number;
  likes: number;
  shares: number;
  comments: number;
  price?: number;
  isPremium: boolean;
  duration?: number;
  fileUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentFilters {
  status?: 'all' | 'draft' | 'published' | 'archived';
  category?: string;
  search?: string;
  tags?: string[];
  isPremium?: boolean;
  sortBy?: 'created' | 'updated' | 'views' | 'likes';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateContentRequest {
  title: string;
  description: string;
  thumbnail?: string;
  tags: string[];
  category: string;
  price?: number;
  isPremium: boolean;
  fileId?: string;
  status?: 'draft' | 'published';
}

export interface UpdateContentRequest {
  title?: string;
  description?: string;
  thumbnail?: string;
  tags?: string[];
  category?: string;
  price?: number;
  isPremium?: boolean;
  status?: 'draft' | 'published' | 'archived';
}

export interface ContentListResponse {
  contents: Content[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// Contents API
export const contentsApi = {
  /**
   * 獲取內容列表
   * @param filters - 篩選條件
   * @param page - 頁碼（默認 1）
   * @param limit - 每頁數量（默認 20）
   * @returns 內容列表
   */
  getContents: async (
    filters?: ContentFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<ContentListResponse> => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.category && { category: filters.category }),
      ...(filters?.search && { search: filters.search }),
      ...(filters?.tags && { tags: filters.tags.join(',') }),
      ...(filters?.isPremium !== undefined && {
        isPremium: String(filters.isPremium),
      }),
      ...(filters?.sortBy && { sortBy: filters.sortBy }),
      ...(filters?.sortOrder && { sortOrder: filters.sortOrder }),
    });
    return api.get(`/contents?${params.toString()}`);
  },

  /**
   * 獲取單個內容
   * @param contentId - 內容 ID
   * @returns 內容詳情
   */
  getContent: async (contentId: string): Promise<Content> => {
    return api.get(`/contents/${contentId}`);
  },

  /**
   * 創建內容
   * @param data - 內容數據
   * @returns 創建的內容
   */
  createContent: async (
    data: CreateContentRequest
  ): Promise<Content> => {
    return api.post('/contents', data);
  },

  /**
   * 更新內容
   * @param contentId - 內容 ID
   * @param data - 更新的內容數據
   * @returns 更新後的內容
   */
  updateContent: async (
    contentId: string,
    data: UpdateContentRequest
  ): Promise<Content> => {
    return api.put(`/contents/${contentId}`, data);
  },

  /**
   * 刪除內容
   * @param contentId - 內容 ID
   * @returns 成功消息
   */
  deleteContent: async (contentId: string): Promise<{ message: string }> => {
    return api.delete(`/contents/${contentId}`);
  },

  /**
   * 發佈內容
   * @param contentId - 內容 ID
   * @returns 更新後的內容
   */
  publishContent: async (contentId: string): Promise<Content> => {
    return api.post(`/contents/${contentId}/publish`);
  },

  /**
   * 存檔內容
   * @param contentId - 內容 ID
   * @returns 更新後的內容
   */
  archiveContent: async (contentId: string): Promise<Content> => {
    return api.post(`/contents/${contentId}/archive`);
  },

  /**
   * 獲取內容統計
   * @param contentId - 內容 ID
   * @returns 統計數據
   */
  getContentStats: async (
    contentId: string
  ): Promise<{
    views: number;
    likes: number;
    shares: number;
    comments: number;
    revenue?: number;
  }> => {
    return api.get(`/contents/${contentId}/stats`);
  },

  /**
   * 搜索內容
   * @param query - 搜索關鍵詞
   * @param limit - 返回數量
   * @returns 搜索結果
   */
  searchContents: async (
    query: string,
    limit: number = 10
  ): Promise<Content[]> => {
    return api.get(
      `/contents/search?query=${encodeURIComponent(query)}&limit=${limit}`
    );
  },

  /**
   * 批量操作內容
   * @param contentIds - 內容 ID 列表
   * @param action - 操作（delete, publish, archive）
   * @returns 成功消息
   */
  bulkUpdateContents: async (
    contentIds: string[],
    action: 'delete' | 'publish' | 'archive'
  ): Promise<{ message: string; count: number }> => {
    return api.post('/contents/bulk', { contentIds, action });
  },
};

export default contentsApi;
