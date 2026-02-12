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
    mediaUrls?: string[];
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

// ---- Withdrawal Types ----

export interface WithdrawalUser {
  id: string;
  displayName?: string;
  email: string;
  avatarUrl?: string;
}

export interface WithdrawalRecord {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  payoutMethod: string;
  payoutDetails?: string;
  requestedAt: string;
  processedAt?: string;
  user: WithdrawalUser | null;
}

export interface WithdrawalDetail extends WithdrawalRecord {
  wallet: {
    balance: number;
    totalEarnings: number;
    totalWithdrawn: number;
  } | null;
}

export interface WithdrawalStats {
  pendingCount: number;
  pendingAmount: number;
  completedCount: number;
  completedAmount: number;
  rejectedCount: number;
  totalCount: number;
}

// ---- Matching Types ----

export interface MatchingStats {
  totalSwipes: number;
  totalMatches: number;
  activeMatches: number;
  likeCount: number;
  passCount: number;
  superLikeCount: number;
  matchRate: number;
  dailyMatches: Array<{ date: string; count: number }>;
}

// ---- User Activity Types ----

export interface UserActivity {
  posts: Array<{
    id: string;
    contentType?: string;
    caption?: string;
    visibility?: string;
    likeCount: number;
    commentCount: number;
    createdAt: string;
  }>;
  postCount: number;
  subscriptions: Array<{
    id: string;
    subscriberId: string;
    creatorId: string;
    status: string;
    createdAt: string;
  }>;
  subscriptionCount: number;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  transactionCount: number;
}

// ---- Post Types ----

export interface PostRecord {
  id: string;
  contentType?: string;
  caption?: string;
  mediaUrls?: string[];
  visibility?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  creator: { id: string; email: string; displayName?: string; avatarUrl?: string } | null;
}

// ---- Subscription Types ----

export interface SubscriptionUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface SubscriptionRecord {
  id: string;
  status: string;
  createdAt: string;
  cancelledAt: string | null;
  currentPeriodEnd: string | null;
  subscriber: SubscriptionUser | null;
  creator: SubscriptionUser | null;
  tier: { id: string; name: string; priceMonthly: number } | null;
}

export interface SubscriptionStats {
  totalActive: number;
  totalCancelled: number;
  totalExpired: number;
  total: number;
  mrr: number;
}

export interface TierRecord {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number | null;
  benefits: string[];
  isActive: boolean;
  createdAt: string;
  activeSubscribers: number;
  creator: { id: string; email: string; displayName?: string } | null;
}

// ---- Transaction Types ----

export interface TransactionUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface TransactionRecord {
  id: string;
  type: string;
  amount: number;
  status: string;
  stripePaymentId: string | null;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  createdAt: string;
  user: TransactionUser | null;
}

export interface TransactionTypeStats {
  byType: Array<{ type: string; count: number; totalAmount: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

// ---- System Types ----

export interface DlqStats {
  totalMessages: number;
  topicCounts: Record<string, number>;
}

export interface ConsistencyMetrics {
  totalChecked: number;
  totalInconsistencies: number;
  lastCheckedAt?: string;
}

// ---- DLQ Types ----

export interface DlqMessage {
  id: string;
  topic: string;
  payload: unknown;
  error: string;
  retryCount: number;
  createdAt: string;
}

// ---- Audit Log Types ----

export interface AuditLogRecord {
  id: string;
  action: string;
  adminId: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  method: string;
  path: string;
  statusCode: number | null;
  createdAt: string;
}

// ---- Admin API Client ----

export class AdminApi {
  constructor(private readonly client: ApiClient) {}

  /** 建立過濾掉 undefined 值的 params 物件 */
  private buildParams(obj: Record<string, string | number | undefined>): Record<string, string | number> {
    const result: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null && value !== '') {
        result[key] = value;
      }
    }
    return result;
  }

  // -- Users --

  listUsers(page = 1, limit = 20, role?: string, status?: string, search?: string) {
    return this.client.get<PaginatedResponse<AdminUser>>(
      '/api/v1/admin/users',
      { params: this.buildParams({ page, limit, role, status, search }) },
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

  changeUserRole(userId: string, role: string) {
    return this.client.post<{ success: boolean; message: string }>(
      `/api/v1/admin/users/${userId}/role`,
      { role },
    );
  }

  getUserActivity(userId: string) {
    return this.client.get<UserActivity>(`/api/v1/admin/users/${userId}/activity`);
  }

  // -- Content --

  listReports(page = 1, limit = 20, status?: string) {
    return this.client.get<PaginatedResponse<ReportRecord>>(
      '/api/v1/admin/content/reports',
      { params: this.buildParams({ page, limit, status }) },
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

  listPosts(page = 1, limit = 20, visibility?: string, search?: string) {
    return this.client.get<PaginatedResponse<PostRecord>>(
      '/api/v1/admin/content/posts',
      { params: this.buildParams({ page, limit, visibility, search }) },
    );
  }

  // -- Payments --

  getRevenueReport(startDate: string, endDate: string) {
    return this.client.get<RevenueReport>(
      '/api/v1/admin/payments/revenue',
      { params: this.buildParams({ startDate, endDate }) },
    );
  }

  getTopCreators(limit = 10) {
    return this.client.get<TopCreator[]>(
      '/api/v1/admin/payments/top-creators',
      { params: this.buildParams({ limit }) },
    );
  }

  getDailyRevenue(days = 30) {
    return this.client.get<DailyRevenue[]>(
      '/api/v1/admin/payments/daily-revenue',
      { params: this.buildParams({ days }) },
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
    return this.client.get<DlqStats>('/api/v1/admin/system/dlq');
  }

  getConsistencyMetrics() {
    return this.client.get<ConsistencyMetrics>(
      '/api/v1/admin/system/consistency',
    );
  }

  // -- Analytics --

  getDauMau(days = 7) {
    return this.client.get<DauMau>(
      '/api/v1/admin/analytics/dau-mau',
      { params: this.buildParams({ days }) },
    );
  }

  getCreatorRevenueRanking(limit = 10) {
    return this.client.get<CreatorRevenue[]>(
      '/api/v1/admin/analytics/creator-revenue',
      { params: this.buildParams({ limit }) },
    );
  }

  getPopularContent(limit = 10) {
    return this.client.get<PopularContent[]>(
      '/api/v1/admin/analytics/popular-content',
      { params: this.buildParams({ limit }) },
    );
  }

  getSubscriptionChurnRate(period = 'month') {
    return this.client.get<ChurnRate>(
      '/api/v1/admin/analytics/churn-rate',
      { params: this.buildParams({ period }) },
    );
  }

  getMatchingStats() {
    return this.client.get<MatchingStats>('/api/v1/admin/analytics/matching');
  }

  // -- Withdrawals --

  listWithdrawals(page = 1, limit = 20, status?: string) {
    return this.client.get<PaginatedResponse<WithdrawalRecord>>(
      '/api/v1/admin/withdrawals',
      { params: this.buildParams({ page, limit, status }) },
    );
  }

  getWithdrawalStats() {
    return this.client.get<WithdrawalStats>('/api/v1/admin/withdrawals/stats');
  }

  getWithdrawalDetail(withdrawalId: string) {
    return this.client.get<WithdrawalDetail>(
      `/api/v1/admin/withdrawals/${withdrawalId}`,
    );
  }

  approveWithdrawal(withdrawalId: string) {
    return this.client.post<{ success: boolean; message: string }>(
      `/api/v1/admin/withdrawals/${withdrawalId}/approve`,
    );
  }

  rejectWithdrawal(withdrawalId: string, reason?: string) {
    return this.client.post<{ success: boolean; message: string }>(
      `/api/v1/admin/withdrawals/${withdrawalId}/reject`,
      { reason },
    );
  }

  // -- Subscriptions --

  listSubscriptions(page = 1, limit = 20, status?: string) {
    return this.client.get<PaginatedResponse<SubscriptionRecord>>(
      '/api/v1/admin/subscriptions',
      { params: this.buildParams({ page, limit, status }) },
    );
  }

  getSubscriptionStats() {
    return this.client.get<SubscriptionStats>('/api/v1/admin/subscriptions/stats');
  }

  listTiers(page = 1, limit = 20, creatorId?: string) {
    return this.client.get<PaginatedResponse<TierRecord>>(
      '/api/v1/admin/subscriptions/tiers',
      { params: this.buildParams({ page, limit, creatorId }) },
    );
  }

  toggleTierActive(tierId: string) {
    return this.client.post<{ success: boolean; message: string; isActive: boolean }>(
      `/api/v1/admin/subscriptions/tiers/${tierId}/toggle`,
    );
  }

  // -- Transactions --

  listTransactions(page = 1, limit = 20, type?: string, status?: string) {
    return this.client.get<PaginatedResponse<TransactionRecord>>(
      '/api/v1/admin/transactions',
      { params: this.buildParams({ page, limit, type, status }) },
    );
  }

  getTransactionTypeStats() {
    return this.client.get<TransactionTypeStats>('/api/v1/admin/transactions/type-stats');
  }

  // -- DLQ Management --

  getDlqMessages() {
    return this.client.get<{ messages: DlqMessage[] }>('/api/v1/admin/system/dlq/messages');
  }

  retryDlqMessage(messageId: string) {
    return this.client.post<{ success: boolean; message?: string }>(
      `/api/v1/admin/system/dlq/retry/${messageId}`,
    );
  }

  retryAllDlqMessages() {
    return this.client.post<{ success: boolean; retriedCount?: number }>(
      '/api/v1/admin/system/dlq/retry-all',
    );
  }

  deleteDlqMessage(messageId: string) {
    return this.client.delete<{ success: boolean }>(
      `/api/v1/admin/system/dlq/messages/${messageId}`,
    );
  }

  purgeDlqMessages() {
    return this.client.delete<{ success: boolean; deletedCount?: number }>(
      '/api/v1/admin/system/dlq/purge',
    );
  }

  // -- Audit Logs --

  listAuditLogs(page = 1, limit = 20, action?: string, adminId?: string, targetType?: string) {
    return this.client.get<PaginatedResponse<AuditLogRecord>>(
      '/api/v1/admin/audit-logs',
      { params: this.buildParams({ page, limit, action, adminId, targetType }) },
    );
  }

  getAuditLog(logId: string) {
    return this.client.get<AuditLogRecord>(`/api/v1/admin/audit-logs/${logId}`);
  }

  // -- Batch Operations --

  batchDisableUsers(userIds: string[]) {
    return this.client.post<{ success: boolean; disabledCount: number }>(
      '/api/v1/admin/users/batch/disable',
      { userIds },
    );
  }

  batchResolveReports(reportIds: string[]) {
    return this.client.post<{ success: boolean; resolvedCount: number }>(
      '/api/v1/admin/content/reports/batch/resolve',
      { reportIds },
    );
  }
}
