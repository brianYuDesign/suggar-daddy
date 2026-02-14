/**
 * API Mock for testing
 * 
 * This file provides mock implementations of all API calls
 * used in the Web application for testing purposes.
 */

export const mockAuthApi = {
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  refresh: jest.fn(),
  verifyEmail: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
};

export const mockUsersApi = {
  getMe: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  uploadAvatar: jest.fn(),
  deleteAvatar: jest.fn(),
  blockUser: jest.fn(),
  unblockUser: jest.fn(),
  reportUser: jest.fn(),
};

export const mockMatchingApi = {
  getRecommendations: jest.fn(),
  swipe: jest.fn(),
  getMatches: jest.fn(),
  unmatch: jest.fn(),
};

export const mockContentApi = {
  getPosts: jest.fn(),
  getPost: jest.fn(),
  createPost: jest.fn(),
  updatePost: jest.fn(),
  deletePost: jest.fn(),
  likePost: jest.fn(),
  unlikePost: jest.fn(),
  commentPost: jest.fn(),
};

export const mockPaymentsApi = {
  createPaymentIntent: jest.fn(),
  confirmPayment: jest.fn(),
  getPaymentHistory: jest.fn(),
  getPaymentMethod: jest.fn(),
  addPaymentMethod: jest.fn(),
  removePaymentMethod: jest.fn(),
};

export const mockSubscriptionsApi = {
  getPlans: jest.fn(),
  getCurrentSubscription: jest.fn(),
  subscribe: jest.fn(),
  cancelSubscription: jest.fn(),
  updateSubscription: jest.fn(),
};

export const mockMessagingApi = {
  getConversations: jest.fn(),
  getConversation: jest.fn(),
  sendMessage: jest.fn(),
  markAsRead: jest.fn(),
  deleteMessage: jest.fn(),
};

export const mockNotificationsApi = {
  getNotifications: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  deleteNotification: jest.fn(),
};

// Mock ApiClient
export const mockApiClient = {
  setToken: jest.fn(),
  clearToken: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

// Reset all mocks
export function resetAllMocks() {
  Object.values(mockAuthApi).forEach((fn) => fn.mockReset());
  Object.values(mockUsersApi).forEach((fn) => fn.mockReset());
  Object.values(mockMatchingApi).forEach((fn) => fn.mockReset());
  Object.values(mockContentApi).forEach((fn) => fn.mockReset());
  Object.values(mockPaymentsApi).forEach((fn) => fn.mockReset());
  Object.values(mockSubscriptionsApi).forEach((fn) => fn.mockReset());
  Object.values(mockMessagingApi).forEach((fn) => fn.mockReset());
  Object.values(mockNotificationsApi).forEach((fn) => fn.mockReset());
  Object.values(mockApiClient).forEach((fn) => fn.mockReset());
}

// Export mocked modules
export const authApi = mockAuthApi;
export const usersApi = mockUsersApi;
export const matchingApi = mockMatchingApi;
export const contentApi = mockContentApi;
export const paymentsApi = mockPaymentsApi;
export const subscriptionsApi = mockSubscriptionsApi;
export const messagingApi = mockMessagingApi;
export const notificationsApi = mockNotificationsApi;
export const apiClient = mockApiClient;

// Mock ApiError class
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static getMessage(error: unknown, defaultMessage: string): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return defaultMessage;
  }
}
