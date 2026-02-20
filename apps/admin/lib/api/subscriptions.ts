import { api } from './client';

// Subscriptions API

export interface Subscription {
  id: string;
  creatorId: string;
  userId: string;
  planName: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'paused' | 'cancelled';
  startDate: string;
  endDate?: string;
  cancelledAt?: string;
  nextBillingDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionRequest {
  creatorId: string;
  planName: string;
  price: number;
  currency?: string;
  billingCycle?: 'monthly' | 'yearly';
}

export interface UpdateSubscriptionRequest {
  planName?: string;
  price?: number;
  currency?: string;
  billingCycle?: 'monthly' | 'yearly';
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  issuedAt: string;
  dueDate?: string;
  paidAt?: string;
  invoiceNumber: string;
  downloadUrl?: string;
  createdAt: string;
}

export const subscriptionsApi = {
  /**
   * 獲取用戶的訂閱列表
   * @param userId - 用戶 ID
   * @returns 訂閱列表
   */
  getSubscriptions: async (
    userId?: string
  ): Promise<Subscription[]> => {
    const url = userId
      ? `/subscriptions?userId=${userId}`
      : '/subscriptions';
    return api.get(url);
  },

  /**
   * 獲取創作者的訂閱計劃
   * @param creatorId - 創作者 ID
   * @returns 訂閱計劃列表
   */
  getCreatorPlans: async (creatorId: string): Promise<SubscriptionPlan[]> => {
    return api.get(`/creators/${creatorId}/subscription-plans`);
  },

  /**
   * 創建訂閱
   * @param data - 訂閱數據
   * @returns 創建的訂閱
   */
  createSubscription: async (
    data: CreateSubscriptionRequest
  ): Promise<Subscription> => {
    return api.post('/subscriptions', data);
  },

  /**
   * 取消訂閱
   * @param subscriptionId - 訂閱 ID
   * @returns 成功消息
   */
  cancelSubscription: async (
    subscriptionId: string
  ): Promise<{ message: string }> => {
    return api.delete(`/subscriptions/${subscriptionId}`);
  },

  /**
   * 暫停訂閱
   * @param subscriptionId - 訂閱 ID
   * @returns 更新後的訂閱
   */
  pauseSubscription: async (subscriptionId: string): Promise<Subscription> => {
    return api.post(`/subscriptions/${subscriptionId}/pause`);
  },

  /**
   * 恢復訂閱
   * @param subscriptionId - 訂閱 ID
   * @returns 更新後的訂閱
   */
  resumeSubscription: async (
    subscriptionId: string
  ): Promise<Subscription> => {
    return api.post(`/subscriptions/${subscriptionId}/resume`);
  },

  /**
   * 更新訂閱計劃（創作者）
   * @param subscriptionId - 訂閱 ID
   * @param data - 更新數據
   * @returns 更新後的訂閱
   */
  updateSubscription: async (
    subscriptionId: string,
    data: UpdateSubscriptionRequest
  ): Promise<Subscription> => {
    return api.put(`/subscriptions/${subscriptionId}`, data);
  },

  /**
   * 獲取發票列表
   * @param creatorId - 創作者 ID
   * @param page - 頁碼
   * @param limit - 每頁數量
   * @returns 發票列表
   */
  getInvoices: async (
    creatorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    invoices: Invoice[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    };
  }> => {
    return api.get(
      `/creators/${creatorId}/invoices?page=${page}&limit=${limit}`
    );
  },

  /**
   * 獲取單個發票
   * @param invoiceId - 發票 ID
   * @returns 發票詳情
   */
  getInvoice: async (invoiceId: string): Promise<Invoice> => {
    return api.get(`/invoices/${invoiceId}`);
  },

  /**
   * 下載發票
   * @param invoiceId - 發票 ID
   * @returns 下載 URL
   */
  downloadInvoice: async (invoiceId: string): Promise<{ url: string }> => {
    return api.get(`/invoices/${invoiceId}/download`);
  },

  /**
   * 獲取訂閱統計
   * @param creatorId - 創作者 ID
   * @returns 訂閱統計
   */
  getSubscriptionStats: async (
    creatorId: string
  ): Promise<{
    totalSubscribers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    avgSubscriptionValue: number;
    monthlyRecurringRevenue: number;
    churnRate: number;
  }> => {
    return api.get(`/creators/${creatorId}/subscription-stats`);
  },
};

// Analytics API

export interface Analytic {
  id: string;
  creatorId: string;
  date: string;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  newSubscribers: number;
  revenue: number;
  createdAt: string;
}

export interface AnalyticsData {
  period: string;
  startDate: string;
  endDate: string;
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  totalNewSubscribers: number;
  totalRevenue: number;
  daily: Analytic[];
  topContents: Array<{
    id: string;
    title: string;
    views: number;
    revenue: number;
  }>;
}

export const analyticsApi = {
  /**
   * 獲取分析數據
   * @param creatorId - 創作者 ID
   * @param period - 時間段（day, week, month, year）
   * @param startDate - 開始日期
   * @param endDate - 結束日期
   * @returns 分析數據
   */
  getAnalytics: async (
    creatorId: string,
    period: string = 'month',
    startDate?: string,
    endDate?: string
  ): Promise<AnalyticsData> => {
    const params = new URLSearchParams({
      period,
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    });
    return api.get(`/creators/${creatorId}/analytics?${params.toString()}`);
  },

  /**
   * 獲取實時統計
   * @param creatorId - 創作者 ID
   * @returns 實時統計
   */
  getRealTimeStats: async (
    creatorId: string
  ): Promise<{
    activeViewers: number;
    viewsLast24h: number;
    viewsLast7d: number;
    viewsLast30d: number;
  }> => {
    return api.get(`/creators/${creatorId}/analytics/realtime`);
  },

  /**
   * 獲取內容統計
   * @param creatorId - 創作者 ID
   * @returns 各內容的統計
   */
  getContentAnalytics: async (
    creatorId: string
  ): Promise<Array<{
    id: string;
    title: string;
    views: number;
    likes: number;
    shares: number;
    revenue: number;
    engagementRate: number;
  }>> => {
    return api.get(`/creators/${creatorId}/analytics/contents`);
  },

  /**
   * 獲取觀眾分析
   * @param creatorId - 創作者 ID
   * @returns 觀眾分析
   */
  getAudienceAnalytics: async (
    creatorId: string
  ): Promise<{
    totalAudience: number;
    newAudience: number;
    returningAudience: number;
    demographics: {
      age: Record<string, number>;
      gender: Record<string, number>;
      location: Record<string, number>;
    };
    topLocations: Array<{ country: string; count: number }>;
  }> => {
    return api.get(`/creators/${creatorId}/analytics/audience`);
  },

  /**
   * 匯出分析報告
   * @param creatorId - 創作者 ID
   * @param format - 格式（csv, pdf, excel）
   * @param period - 時間段
   * @returns 下載 URL
   */
  exportAnalytics: async (
    creatorId: string,
    format: 'csv' | 'pdf' | 'excel' = 'pdf',
    period: string = 'month'
  ): Promise<{ url: string; filename: string }> => {
    return api.post(
      `/creators/${creatorId}/analytics/export`,
      { format, period }
    );
  },
};

const apiModules = {
  subscriptionsApi,
  analyticsApi,
};

export default apiModules;
