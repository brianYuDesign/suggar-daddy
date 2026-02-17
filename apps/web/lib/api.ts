import { ApiClient, AuthApi, UsersApi, MatchingApi, ContentApi, PaymentsApi, SubscriptionsApi, MessagingApi, NotificationsApi, StoriesApi } from '@suggar-daddy/api-client';

const apiClient = new ApiClient({
  baseURL: typeof window !== 'undefined' ? '' : 'http://localhost:3000',
});

export const authApi = new AuthApi(apiClient);
export const usersApi = new UsersApi(apiClient);
export const matchingApi = new MatchingApi(apiClient);
export const contentApi = new ContentApi(apiClient);
export const paymentsApi = new PaymentsApi(apiClient);
export const subscriptionsApi = new SubscriptionsApi(apiClient);
export const messagingApi = new MessagingApi(apiClient);
export const notificationsApi = new NotificationsApi(apiClient);
export const storiesApi = new StoriesApi(apiClient);

export { apiClient };
export { ApiError, type UserCard } from '@suggar-daddy/api-client';
