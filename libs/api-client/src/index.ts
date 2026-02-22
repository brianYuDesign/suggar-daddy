export { ApiClient } from './client';
export type { ApiClientConfig } from './client';
export { ApiError } from './errors';
export type { ApiErrorData } from './errors';

export { AuthApi } from './auth';
export type { SuccessResponse, VerifyEmailResponse, OAuthResponse } from './auth';
export { UsersApi } from './users';
export { MatchingApi } from './matching';
export { TagsApi } from './tags';
export { MessagingApi } from './messaging';
export { NotificationsApi } from './notifications';
export { ContentApi } from './content';
export { SubscriptionsApi } from './subscriptions';
export { PaymentsApi } from './payments';
export { AdminApi } from './admin';
export { StoriesApi } from './stories';

// Re-export shared types
export type {
  // Enums
  UserType,
  PermissionRole,
  // Pagination
  PaginatedResponse,
  CursorPaginatedResponse,
  // Auth
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  TokenResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  // User
  UserCardDto,
  UserProfileDto,
  UpdateProfileDto,
  LocationUpdateDto,
  // Matching
  SwipeAction,
  SwipeRequestDto,
  SwipeResponseDto,
  MatchDto,
  MatchesResponseDto,
  // Messaging
  MessageAttachmentDto,
  SendMessageDto,
  SendBroadcastDto,
  MessageDto,
  ConversationDto,
  BroadcastDto,
  BroadcastResultDto,
  // Notification
  SendNotificationDto,
  NotificationItemDto,
  NotificationResultDto,
} from './types';

// Re-export types from individual modules
export type { Post, CreatePostDto, ContentReport, Comment } from './content';
export type { Story, StoryGroup, StoryViewer, CreateStoryDto } from './stories';
export type { SubscriptionTier, Subscription, CreateTierDto, UpdateTierDto, SubscriptionTierDetail } from './subscriptions';
export type { Tip, Transaction, TransactionDetail, TransactionStatus, TransactionType, PostPurchase, Wallet, Withdrawal, DmPurchase, DiamondBalance, DiamondTransaction, DiamondPackage, DiamondConfig } from './payments';
export type { GetCardsQuery, EnhancedUserCardDto, CardDetailResponseDto, LikesMeResponseDto, LikesMeCardDto, RevealLikeResponseDto, UndoResponseDto, BehaviorEventDto, BehaviorBatchResponseDto, PostPreviewDto, ScoreBreakdownDto, InterestTagCategory, BehaviorEventType } from './matching';
export type { CardsResponseDto } from './matching';
export type { InterestTagDto, TagsListResponseDto } from './tags';
export type { ReportDto, UserCard, CreateUserDto, FollowStatus, ProfileViewer, VerificationStatus } from './users';
export type {
  PaginatedResponse as AdminPaginatedResponse,
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
  DiamondStats as AdminDiamondStats,
  DiamondBalanceRecord,
  DiamondBalanceDetail,
  DiamondTransactionRecord,
  DiamondPurchaseRecord,
  AdminDiamondPackage,
  AdminDiamondConfig,
  ChatParticipant,
  ChatLastMessage,
  ChatConversation,
  ChatStats,
  ChatMessage,
  ConversationMessagesResponse,
  UserConversationsResponse,
  AdminRecord,
  PermissionOverview,
  UpdateUserDto,
  BlogRecord,
  BlogStats,
  CreateBlogPayload,
  UpdateBlogPayload,
  VerificationRecord,
} from './admin';

