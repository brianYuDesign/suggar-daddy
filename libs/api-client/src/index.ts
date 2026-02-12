export { ApiClient } from './client';
export type { ApiClientConfig } from './client';
export { ApiError } from './errors';
export type { ApiErrorData } from './errors';

export { AuthApi } from './auth';
export { UsersApi } from './users';
export { MatchingApi } from './matching';
export { MessagingApi } from './messaging';
export { NotificationsApi } from './notifications';
export { ContentApi } from './content';
export { SubscriptionsApi } from './subscriptions';
export { PaymentsApi } from './payments';
export { AdminApi } from './admin';

// Re-export types from individual modules
export type { Post, CreatePostDto, ContentReport } from './content';
export type { SubscriptionTier, Subscription } from './subscriptions';
export type { Tip, Transaction, PostPurchase, Wallet, Withdrawal } from './payments';
export type { ReportDto } from './users';
export type {
  PaginatedResponse,
  AdminUser,
  AdminUserDetail,
  UserStats,
  ReportRecord,
  ReportDetail,
  ContentStats,
  RevenueReport,
  TopCreator,
  DailyRevenue,
  PaymentStats,
  SystemHealth,
  ServiceHealth,
  KafkaStatus,
  DauMau,
  CreatorRevenue,
  PopularContent,
  ChurnRate,
  WithdrawalUser,
  WithdrawalRecord,
  WithdrawalDetail,
  WithdrawalStats,
  MatchingStats,
  UserActivity,
  PostRecord,
  SubscriptionUser,
  SubscriptionRecord,
  SubscriptionStats,
  TierRecord,
  TransactionUser,
  TransactionRecord,
  TransactionTypeStats,
  DlqMessage,
  DlqStats,
  ConsistencyMetrics,
  AuditLogRecord,
} from './admin';
