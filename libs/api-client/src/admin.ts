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

export interface VerificationRecord {
  id: string;
  userId: string;
  selfieUrl: string;
  status: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  userDisplayName?: string;
  userAvatarUrl?: string;
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

// ---- Diamond Management Types ----

export interface DiamondStats {
  totalInCirculation: number;
  totalPurchased: number;
  totalSpent: number;
  totalReceived: number;
  totalConverted: number;
  userCount: number;
  averageBalance: number;
}

export interface DiamondBalanceRecord {
  userId: string;
  balance: number;
  totalPurchased: number;
  totalSpent: number;
  totalReceived: number;
  totalConverted: number;
  updatedAt: string;
  user: { id: string; email: string; displayName?: string } | null;
}

export interface DiamondBalanceDetail extends DiamondBalanceRecord {
  recentTransactions: DiamondTransactionRecord[];
}

export interface DiamondTransactionRecord {
  id: string;
  userId: string;
  type: string;
  amount: number;
  referenceId: string | null;
  referenceType: string | null;
  description: string | null;
  createdAt: string;
  user: { id: string; email: string; displayName?: string } | null;
}

export interface DiamondPurchaseRecord {
  id: string;
  userId: string;
  packageId: string;
  diamondAmount: number;
  bonusDiamonds: number;
  totalDiamonds: number;
  amountUsd: number;
  stripePaymentId: string | null;
  status: string;
  createdAt: string;
  user: { id: string; email: string; displayName?: string } | null;
}

export interface AdminDiamondPackage {
  id: string;
  name: string;
  diamondAmount: number;
  bonusDiamonds: number;
  priceUsd: number;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminDiamondConfig {
  superLikeCost: number;
  boostCost: number;
  boostDurationMinutes: number;
  conversionRate: number;
  platformFeeRate: number;
  minConversionDiamonds: number;
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

// ---- Chat Management Types ----

export interface ChatParticipant {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  username?: string | null;
  userType?: string | null;
  permissionRole?: string | null;
}

export interface ChatLastMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  participants: ChatParticipant[];
  lastMessage: ChatLastMessage | null;
  lastMessageAt: string | null;
}

export interface ChatStats {
  totalConversations: number;
  totalMessages: number;
  onlineUsers: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments: { id: string; type: string; url: string; thumbnailUrl?: string }[];
  createdAt: string;
  sender: ChatParticipant;
}

export interface ConversationMessagesResponse {
  conversation: {
    id: string;
    participantIds: string[];
    participants: ChatParticipant[];
  };
  messages: ChatMessage[];
  total: number;
  page: number;
  limit: number;
}

export interface UserConversationsResponse {
  userId: string;
  displayName: string;
  conversations: {
    id: string;
    participants: ChatParticipant[];
    lastMessageAt?: string;
  }[];
  total: number;
}

// ---- Super Admin Types ----

export interface AdminRecord {
  id: string;
  email: string;
  displayName: string;
  username: string | null;
  permissionRole: string;
  avatarUrl: string | null;
  lastActiveAt: string | null;
  createdAt: string;
}

export interface PermissionOverview {
  totalUsers: number;
  roleDistribution: Record<string, number>;
  recentAdminActions: AuditLogRecord[];
}

export interface UpdateUserDto {
  displayName?: string;
  email?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  userType?: string;
  permissionRole?: string;
  city?: string;
  country?: string;
  dmPrice?: number;
  birthDate?: string;
  preferredAgeMin?: number;
  preferredAgeMax?: number;
  preferredDistance?: number;
  verificationStatus?: string;
}

// ---- Blog Types ----

export interface StaticPageRecord {
  id: string;
  title: string;
  slug: string;
  content: string;
  pageType: string;
  status: string;
  metaTitle: string | null;
  metaDescription: string | null;
  lastEditedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaticPageStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
}

export interface CreatePagePayload {
  title: string;
  content: string;
  slug?: string;
  pageType?: string;
  status?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdatePagePayload {
  title?: string;
  content?: string;
  slug?: string;
  pageType?: string;
  status?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface BlogRecord {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  category: string;
  tags: string[] | null;
  status: string;
  authorId: string | null;
  authorName: string | null;
  viewCount: number;
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  totalViews: number;
}

export interface CreateBlogPayload {
  title: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  status?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateBlogPayload {
  title?: string;
  content?: string;
  excerpt?: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  status?: string;
  metaTitle?: string;
  metaDescription?: string;
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
      '/api/admin/users',
      { params: this.buildParams({ page, limit, role, status, search }) },
    );
  }

  getUserStats() {
    return this.client.get<UserStats>('/api/admin/users/stats');
  }

  getUserDetail(userId: string) {
    return this.client.get<AdminUserDetail>(`/api/admin/users/${userId}`);
  }

  disableUser(userId: string) {
    return this.client.post<{ success: boolean; message: string }>(
      `/api/admin/users/${userId}/disable`,
    );
  }

  enableUser(userId: string) {
    return this.client.post<{ success: boolean; message: string }>(
      `/api/admin/users/${userId}/enable`,
    );
  }

  changeUserRole(userId: string, role: string) {
    return this.client.post<{ success: boolean; message: string }>(
      `/api/admin/users/${userId}/role`,
      { role },
    );
  }

  getUserActivity(userId: string) {
    return this.client.get<UserActivity>(`/api/admin/users/${userId}/activity`);
  }

  // -- Content --

  listReports(page = 1, limit = 20, status?: string) {
    return this.client.get<PaginatedResponse<ReportRecord>>(
      '/api/admin/content/reports',
      { params: this.buildParams({ page, limit, status }) },
    );
  }

  getReportDetail(reportId: string) {
    return this.client.get<ReportDetail>(
      `/api/admin/content/reports/${reportId}`,
    );
  }

  takeDownPost(postId: string, reason: string) {
    return this.client.post<{ success: boolean; message: string }>(
      `/api/admin/content/posts/${postId}/take-down`,
      { reason },
    );
  }

  reinstatePost(postId: string) {
    return this.client.post<{ success: boolean; message: string }>(
      `/api/admin/content/posts/${postId}/reinstate`,
    );
  }

  getContentStats() {
    return this.client.get<ContentStats>('/api/admin/content/stats');
  }

  listPosts(page = 1, limit = 20, visibility?: string, search?: string) {
    return this.client.get<PaginatedResponse<PostRecord>>(
      '/api/admin/content/posts',
      { params: this.buildParams({ page, limit, visibility, search }) },
    );
  }

  // -- Payments --

  getRevenueReport(startDate: string, endDate: string) {
    return this.client.get<RevenueReport>(
      '/api/admin/payments/revenue',
      { params: this.buildParams({ startDate, endDate }) },
    );
  }

  getTopCreators(limit = 10) {
    return this.client.get<TopCreator[]>(
      '/api/admin/payments/top-creators',
      { params: this.buildParams({ limit }) },
    );
  }

  getDailyRevenue(days = 30) {
    return this.client.get<DailyRevenue[]>(
      '/api/admin/payments/daily-revenue',
      { params: this.buildParams({ days }) },
    );
  }

  getPaymentStats() {
    return this.client.get<PaymentStats>('/api/admin/payments/stats');
  }

  // -- System --

  getSystemHealth() {
    return this.client.get<SystemHealth>('/api/admin/system/health');
  }

  getKafkaStatus() {
    return this.client.get<KafkaStatus>('/api/admin/system/kafka');
  }

  getDlqStats() {
    return this.client.get<DlqStats>('/api/admin/system/dlq');
  }

  getConsistencyMetrics() {
    return this.client.get<ConsistencyMetrics>(
      '/api/admin/system/consistency',
    );
  }

  // -- Analytics --

  getDauMau(days = 7) {
    return this.client.get<DauMau>(
      '/api/admin/analytics/dau-mau',
      { params: this.buildParams({ days }) },
    );
  }

  getCreatorRevenueRanking(limit = 10) {
    return this.client.get<CreatorRevenue[]>(
      '/api/admin/analytics/creator-revenue',
      { params: this.buildParams({ limit }) },
    );
  }

  getPopularContent(limit = 10) {
    return this.client.get<PopularContent[]>(
      '/api/admin/analytics/popular-content',
      { params: this.buildParams({ limit }) },
    );
  }

  getSubscriptionChurnRate(period = 'month') {
    return this.client.get<ChurnRate>(
      '/api/admin/analytics/churn-rate',
      { params: this.buildParams({ period }) },
    );
  }

  getMatchingStats() {
    return this.client.get<MatchingStats>('/api/admin/analytics/matching');
  }

  // -- Withdrawals --

  listWithdrawals(page = 1, limit = 20, status?: string) {
    return this.client.get<PaginatedResponse<WithdrawalRecord>>(
      '/api/admin/withdrawals',
      { params: this.buildParams({ page, limit, status }) },
    );
  }

  getWithdrawalStats() {
    return this.client.get<WithdrawalStats>('/api/admin/withdrawals/stats');
  }

  getWithdrawalDetail(withdrawalId: string) {
    return this.client.get<WithdrawalDetail>(
      `/api/admin/withdrawals/${withdrawalId}`,
    );
  }

  approveWithdrawal(withdrawalId: string) {
    return this.client.post<{ success: boolean; message: string }>(
      `/api/admin/withdrawals/${withdrawalId}/approve`,
    );
  }

  rejectWithdrawal(withdrawalId: string, reason?: string) {
    return this.client.post<{ success: boolean; message: string }>(
      `/api/admin/withdrawals/${withdrawalId}/reject`,
      { reason },
    );
  }

  // -- Subscriptions --

  listSubscriptions(page = 1, limit = 20, status?: string) {
    return this.client.get<PaginatedResponse<SubscriptionRecord>>(
      '/api/admin/subscriptions',
      { params: this.buildParams({ page, limit, status }) },
    );
  }

  getSubscriptionStats() {
    return this.client.get<SubscriptionStats>('/api/admin/subscriptions/stats');
  }

  listTiers(page = 1, limit = 20, creatorId?: string) {
    return this.client.get<PaginatedResponse<TierRecord>>(
      '/api/admin/subscriptions/tiers',
      { params: this.buildParams({ page, limit, creatorId }) },
    );
  }

  toggleTierActive(tierId: string) {
    return this.client.post<{ success: boolean; message: string; isActive: boolean }>(
      `/api/admin/subscriptions/tiers/${tierId}/toggle`,
    );
  }

  // -- Transactions --

  listTransactions(page = 1, limit = 20, type?: string, status?: string) {
    return this.client.get<PaginatedResponse<TransactionRecord>>(
      '/api/admin/transactions',
      { params: this.buildParams({ page, limit, type, status }) },
    );
  }

  getTransactionTypeStats() {
    return this.client.get<TransactionTypeStats>('/api/admin/transactions/type-stats');
  }

  // -- DLQ Management --

  getDlqMessages() {
    return this.client.get<{ messages: DlqMessage[] }>('/api/admin/system/dlq/messages');
  }

  retryDlqMessage(messageId: string) {
    return this.client.post<{ success: boolean; message?: string }>(
      `/api/admin/system/dlq/retry/${messageId}`,
    );
  }

  retryAllDlqMessages() {
    return this.client.post<{ success: boolean; retriedCount?: number }>(
      '/api/admin/system/dlq/retry-all',
    );
  }

  deleteDlqMessage(messageId: string) {
    return this.client.delete<{ success: boolean }>(
      `/api/admin/system/dlq/messages/${messageId}`,
    );
  }

  purgeDlqMessages() {
    return this.client.delete<{ success: boolean; deletedCount?: number }>(
      '/api/admin/system/dlq/purge',
    );
  }

  // -- Audit Logs --

  listAuditLogs(page = 1, limit = 20, action?: string, adminId?: string, targetType?: string) {
    return this.client.get<PaginatedResponse<AuditLogRecord>>(
      '/api/admin/audit-logs',
      { params: this.buildParams({ page, limit, action, adminId, targetType }) },
    );
  }

  getAuditLog(logId: string) {
    return this.client.get<AuditLogRecord>(`/api/admin/audit-logs/${logId}`);
  }

  // -- Batch Operations --

  batchDisableUsers(userIds: string[]) {
    return this.client.post<{ success: boolean; disabledCount: number }>(
      '/api/admin/users/batch/disable',
      { userIds },
    );
  }

  batchResolveReports(reportIds: string[]) {
    return this.client.post<{ success: boolean; resolvedCount: number }>(
      '/api/admin/content/reports/batch/resolve',
      { reportIds },
    );
  }

  // -- Diamonds --

  getDiamondStats() {
    return this.client.get<DiamondStats>('/api/admin/diamonds/stats');
  }

  listDiamondBalances(page = 1, limit = 20, search?: string) {
    return this.client.get<PaginatedResponse<DiamondBalanceRecord>>(
      '/api/admin/diamonds/balances',
      { params: this.buildParams({ page, limit, search }) },
    );
  }

  getDiamondBalance(userId: string) {
    return this.client.get<DiamondBalanceDetail>(
      `/api/admin/diamonds/balances/${userId}`,
    );
  }

  adjustDiamondBalance(userId: string, amount: number, reason: string) {
    return this.client.post<{ success: boolean; newBalance: number }>(
      `/api/admin/diamonds/balances/${userId}/adjust`,
      { amount, reason },
    );
  }

  listDiamondTransactions(page = 1, limit = 20, type?: string, userId?: string) {
    return this.client.get<PaginatedResponse<DiamondTransactionRecord>>(
      '/api/admin/diamonds/transactions',
      { params: this.buildParams({ page, limit, type, userId }) },
    );
  }

  listDiamondPurchases(page = 1, limit = 20, status?: string, userId?: string) {
    return this.client.get<PaginatedResponse<DiamondPurchaseRecord>>(
      '/api/admin/diamonds/purchases',
      { params: this.buildParams({ page, limit, status, userId }) },
    );
  }

  getDiamondPackages() {
    return this.client.get<AdminDiamondPackage[]>('/api/admin/diamonds/packages');
  }

  createDiamondPackage(dto: Omit<AdminDiamondPackage, 'id'>) {
    return this.client.post<AdminDiamondPackage>('/api/admin/diamonds/packages', dto);
  }

  updateDiamondPackage(id: string, dto: Partial<AdminDiamondPackage>) {
    return this.client.put<AdminDiamondPackage>(`/api/admin/diamonds/packages/${id}`, dto);
  }

  deleteDiamondPackage(id: string) {
    return this.client.delete<{ success: boolean }>(`/api/admin/diamonds/packages/${id}`);
  }

  getDiamondConfig() {
    return this.client.get<AdminDiamondConfig>('/api/admin/diamonds/config');
  }

  updateDiamondConfig(dto: Partial<AdminDiamondConfig>) {
    return this.client.put<AdminDiamondConfig>('/api/admin/diamonds/config', dto);
  }

  // -- Chat Management (Super Admin) --

  listConversations(page = 1, limit = 20, search?: string) {
    return this.client.get<PaginatedResponse<ChatConversation>>(
      '/api/admin/chats',
      { params: this.buildParams({ page, limit, search }) },
    );
  }

  getChatStats() {
    return this.client.get<ChatStats>('/api/admin/chats/stats');
  }

  getUserConversations(userId: string) {
    return this.client.get<UserConversationsResponse>(
      `/api/admin/chats/user/${userId}`,
    );
  }

  getConversationMessages(conversationId: string, page = 1, limit = 50) {
    return this.client.get<ConversationMessagesResponse>(
      `/api/admin/chats/${conversationId}/messages`,
      { params: this.buildParams({ page, limit }) },
    );
  }

  // -- Super Admin Management --

  listAdmins() {
    return this.client.get<AdminRecord[]>('/api/admin/super-admin/admins');
  }

  getPermissionOverview() {
    return this.client.get<PermissionOverview>('/api/admin/super-admin/permissions');
  }

  promoteToAdmin(userId: string, role: string) {
    return this.client.post<{ success: boolean; message: string; user: AdminRecord }>(
      `/api/admin/super-admin/promote/${userId}`,
      { role },
    );
  }

  demoteAdmin(userId: string) {
    return this.client.post<{ success: boolean; message: string }>(
      `/api/admin/super-admin/demote/${userId}`,
    );
  }

  forcePasswordReset(userId: string) {
    return this.client.post<{ success: boolean; message: string }>(
      `/api/admin/super-admin/force-password-reset/${userId}`,
    );
  }

  // -- User Edit (Super Admin) --

  updateUser(userId: string, data: UpdateUserDto) {
    return this.client.put<{ success: boolean; message: string; changes: Record<string, { from: unknown; to: unknown }>; user: AdminUser }>(
      `/api/admin/users/${userId}`,
      data,
    );
  }

  // -- Blog --

  getBlogStats() {
    return this.client.get<BlogStats>('/api/blogs/stats');
  }

  listBlogs(page = 1, limit = 20, category?: string, status?: string, search?: string) {
    return this.client.get<{ items: BlogRecord[]; total: number; page: number; limit: number }>(
      '/api/blogs/admin',
      { params: this.buildParams({ page, limit, category, status, search }) },
    );
  }

  getBlog(id: string) {
    return this.client.get<BlogRecord>(`/api/blogs/by-id/${id}`);
  }

  createBlog(dto: CreateBlogPayload) {
    return this.client.post<BlogRecord>('/api/blogs', dto);
  }

  updateBlog(id: string, dto: UpdateBlogPayload) {
    return this.client.put<BlogRecord>(`/api/blogs/${id}`, dto);
  }

  deleteBlog(id: string) {
    return this.client.delete<{ message: string }>(`/api/blogs/${id}`);
  }

  publishBlog(id: string) {
    return this.client.post<BlogRecord>(`/api/blogs/${id}/publish`);
  }

  archiveBlog(id: string) {
    return this.client.post<BlogRecord>(`/api/blogs/${id}/archive`);
  }

  batchPublishBlogs(ids: string[]) {
    return this.client.post<{ publishedCount: number }>('/api/blogs/batch/publish', { ids });
  }

  batchArchiveBlogs(ids: string[]) {
    return this.client.post<{ archivedCount: number }>('/api/blogs/batch/archive', { ids });
  }

  batchDeleteBlogs(ids: string[]) {
    return this.client.post<{ deletedCount: number }>('/api/blogs/batch/delete', { ids });
  }

  // -- Static Pages --

  getPageStats() {
    return this.client.get<StaticPageStats>('/api/pages/stats');
  }

  listPages(page = 1, limit = 20, pageType?: string, status?: string, search?: string) {
    return this.client.get<{ items: StaticPageRecord[]; total: number; page: number; limit: number }>(
      '/api/pages/admin',
      { params: this.buildParams({ page, limit, pageType, status, search }) },
    );
  }

  getPage(id: string) {
    return this.client.get<StaticPageRecord>(`/api/pages/${id}`);
  }

  createPage(dto: CreatePagePayload) {
    return this.client.post<StaticPageRecord>('/api/pages', dto);
  }

  updatePage(id: string, dto: UpdatePagePayload) {
    return this.client.put<StaticPageRecord>(`/api/pages/${id}`, dto);
  }

  deletePage(id: string) {
    return this.client.delete<{ message: string }>(`/api/pages/${id}`);
  }

  publishPage(id: string) {
    return this.client.post<StaticPageRecord>(`/api/pages/${id}/publish`);
  }

  archivePage(id: string) {
    return this.client.post<StaticPageRecord>(`/api/pages/${id}/archive`);
  }

  // ==================== Verification Management ====================

  getPendingVerifications(page = 1, limit = 20): Promise<{ data: VerificationRecord[]; total: number }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    return this.client.get<{ data: VerificationRecord[]; total: number }>(`/api/users/admin/verifications?${params}`);
  }

  reviewVerification(userId: string, action: 'approve' | 'reject', reason?: string): Promise<{ success: boolean }> {
    return this.client.put<{ success: boolean }>(`/api/users/admin/verifications/${userId}/review`, {
      action,
      reason,
    });
  }
}
