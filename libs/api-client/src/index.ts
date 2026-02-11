export { ApiClient } from './client';
export type { ApiClientConfig } from './client';

export { AuthApi } from './auth';
export { UsersApi } from './users';
export { MatchingApi } from './matching';
export { MessagingApi } from './messaging';
export { NotificationsApi } from './notifications';
export { ContentApi } from './content';
export { SubscriptionsApi } from './subscriptions';
export { PaymentsApi } from './payments';

// Re-export types from individual modules
export type { Post, CreatePostDto, ContentReport } from './content';
export type { SubscriptionTier, Subscription } from './subscriptions';
export type { Tip, Transaction, PostPurchase, Wallet, Withdrawal } from './payments';
export type { ReportDto } from './users';
