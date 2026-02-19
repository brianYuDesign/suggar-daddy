// Re-export all API modules and types from a single entry point

export { tokenManager, apiClient, api, ApiError, handleApiError, checkNetworkStatus } from './client';
export type { ApiResponse, TokenResponse } from './client';

export { authApi } from './auth';
export type {
  User,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  RefreshTokenRequest,
} from './auth';

export { recommendationsApi } from './recommendations';
export type {
  Recommendation,
  RecommendationsResponse,
  InteractionRequest,
  RatingRequest,
  GetRecommendationsRequest,
} from './recommendations';

export { contentsApi } from './contents';
export type {
  Content,
  ContentFilters,
  CreateContentRequest,
  UpdateContentRequest,
  ContentListResponse,
} from './contents';

export { uploadsApi } from './uploads';
export type {
  Upload,
  UploadProgress,
  UploadResponse,
  UploadRequest,
} from './uploads';

export { subscriptionsApi, analyticsApi } from './subscriptions';
export type {
  Subscription,
  SubscriptionPlan,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  Invoice,
  Analytic,
  AnalyticsData,
} from './subscriptions';

export { creatorsApi } from './creators';
export type {
  Creator,
  CreatorProfile,
  UpdateCreatorRequest,
  CreatorSettings,
} from './creators';
