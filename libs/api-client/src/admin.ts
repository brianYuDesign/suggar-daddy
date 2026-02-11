import type { ApiClient } from './client';

// ---- Response Types ----

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetail extends AdminUser {
  isDisabled: boolean;
}

export interface UserStats {
  totalUsers: number;
  byRole: Record<string, number>;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

export interface ReportRecord {
  id: string;
  postId: string;
  reporterId: string;
  reason: string;
  status: string;
  createdAt: string;
}

export interface ReportDetail extends ReportRecord {
  post: {
    id: string;
    creatorId: string;
    contentType?: string;
    caption?: string;
    visibility?: string;
    likeCount?: number;
    commentCount?: number;
    createdAt: string;
  } | null;
}

export interface ContentStats {
  totalPosts: number;
  pendingReports: number;
  resolvedReports: number;
  takenDownCount: number;
}

export interface RevenueReport {
  startDate: string;
  endDate: string;
  totalRevenue: number;
  transactionCount: number;
  byType: Record<string, { count: number; amount: number }>;
}

export interface TopCreator {
  creatorId: string;
  tipRevenue: number;
  tipCount: number;
  subscriberCount: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  count: number;
}

export interface PaymentStats {
  totalTransactions: number;
  successfulTransactions: number;
  totalAmount: number;
  averageAmount: number;
  successRate: number;
}

export interface ServiceHealth {
  status: string;
  latencyMs?: number;
  error?: string;
}

export interface SystemHealth {
  status: string;
  services: Record<string, ServiceHealth>;
  timestamp: string;
}

export interface KafkaStatus {
  status: string;
  dbWriterHealth?: unknown;
  error?: string;
  timestamp: string;
}

export interface DauMau {
  dau: number;
  mau: number;
  dauMauRatio: number;
  dailyDau: Array<{ date: string; count: number }>;
  calculatedAt: string;
}

export interface CreatorRevenue {
  creatorId: string;
  displayName: string;
  totalRevenue: number;
  tipCount: number;
}

export interface PopularContent {
  postId: string;
  creatorId: string;
  contentType?: string;
  caption?: string;
  visibility?: string;
  likeCount: number;
  commentCount: number;
  engagement: number;
  createdAt: string;
}

export interface ChurnRate {
  period: string;
  periodStart: string;
  periodEnd: string;
  activeAtStart: number;
  cancelledDuring: number;
  newDuring: number;
  currentActive: number;
  churnRate: number;
}

// ---- Admin API Client ----

export class AdminApi {
  constructor(private readonly client: ApiClient) {}

  // -- Users --

  listUsers(page = 1, limit = 20, role?: string, status?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (role) params.set('role', role);
    if (status) params.set('status', status);
    return this.client.get<PaginatedResponse<AdminUser>>(
      `/api/v1/admin/users?${params}`,
    );
  }

  getUserStats() {
    return this.client.get<UserStats>('/api/v1/admin/users/stats');
  }

  getUserDetail(userId: string) {
    return this.client.get<AdminUserDetail>(`/api/v1/admin/users/${userId}`);
  }

  disableUser(userId: string) {
    return this.client.post<{ success: boolean; message: string }>(
      `/api/v1/admin/users/${userId}/disable`,
    );
  }

  enableUser(userId: string) {
    return this.client.post<{ success: boolean; message: string }>(
      `/api/v1/admin/users/${userId}/enable`,
    );
  }

  // -- Content --

  listReports(page = 1, limit = 20, status?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    return this.client.get<PaginatedResponse<ReportRecord>>(
      `/api/v1/admin/content/reports?${params}`,
    );
  }

  getReportDetail(reportId: string) {
    return this.client.get<ReportDetail>(
      `/api/v1/admin/content/reports/${reportId}`,
    );
  }

  takeDownPost(postId: string, reason: string) {
    return this.client.post<{ success: boolean; message: string }>(
      `/api/v1/admin/content/posts/${postId}/take-down`,
      { reason },
    );
  }

  reinstatePost(postId: string) {
    return this.client.post<{ success: boolean; message: string }>(
      `/api/v1/admin/content/posts/${postId}/reinstate`,
    );
  }

  getContentStats() {
    return this.client.get<ContentStats>('/api/v1/admin/content/stats');
  }

  // -- Payments --

  getRevenueReport(startDate: string, endDate: string) {
    return this.client.get<RevenueReport>(
      `/api/v1/admin/payments/revenue?startDate=${startDate}&endDate=${endDate}`,
    );
  }

  getTopCreators(limit = 10) {
    return this.client.get<TopCreator[]>(
      `/api/v1/admin/payments/top-creators?limit=${limit}`,
    );
  }

  getDailyRevenue(days = 30) {
    return this.client.get<DailyRevenue[]>(
      `/api/v1/admin/payments/daily-revenue?days=${days}`,
    );
  }

  getPaymentStats() {
    return this.client.get<PaymentStats>('/api/v1/admin/payments/stats');
  }

  // -- System --

  getSystemHealth() {
    return this.client.get<SystemHealth>('/api/v1/admin/system/health');
  }

  getKafkaStatus() {
    return this.client.get<KafkaStatus>('/api/v1/admin/system/kafka');
  }

  getDlqStats() {
    return this.client.get<Record<string, unknown>>('/api/v1/admin/system/dlq');
  }

  getConsistencyMetrics() {
    return this.client.get<Record<string, unknown>>(
      '/api/v1/admin/system/consistency',
    );
  }

  // -- Analytics --

  getDauMau(days = 7) {
    return this.client.get<DauMau>(
      `/api/v1/admin/analytics/dau-mau?days=${days}`,
    );
  }

  getCreatorRevenueRanking(limit = 10) {
    return this.client.get<CreatorRevenue[]>(
      `/api/v1/admin/analytics/creator-revenue?limit=${limit}`,
    );
  }

  getPopularContent(limit = 10) {
    return this.client.get<PopularContent[]>(
      `/api/v1/admin/analytics/popular-content?limit=${limit}`,
    );
  }

  getSubscriptionChurnRate(period = 'month') {
    return this.client.get<ChurnRate>(
      `/api/v1/admin/analytics/churn-rate?period=${period}`,
    );
  }
}
