/**
 * API Mock for Admin testing
 */

export const mockAuthApi = {
  login: jest.fn(),
  logout: jest.fn(),
  refresh: jest.fn(),
  verifyEmail: jest.fn(),
};

export const mockUsersApi = {
  getUsers: jest.fn(),
  getUser: jest.fn(),
  updateUser: jest.fn(),
  banUser: jest.fn(),
  unbanUser: jest.fn(),
  deleteUser: jest.fn(),
};

export const mockContentApi = {
  getReports: jest.fn(),
  getReport: jest.fn(),
  approveContent: jest.fn(),
  rejectContent: jest.fn(),
  deleteContent: jest.fn(),
};

export const mockPaymentsApi = {
  getTransactions: jest.fn(),
  getTransaction: jest.fn(),
  refundTransaction: jest.fn(),
};

export const mockAnalyticsApi = {
  getOverview: jest.fn(),
  getUserStats: jest.fn(),
  getRevenueStats: jest.fn(),
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
  Object.values(mockContentApi).forEach((fn) => fn.mockReset());
  Object.values(mockPaymentsApi).forEach((fn) => fn.mockReset());
  Object.values(mockAnalyticsApi).forEach((fn) => fn.mockReset());
  Object.values(mockApiClient).forEach((fn) => fn.mockReset());
}

// Export mocked modules
export const authApi = mockAuthApi;
export const usersApi = mockUsersApi;
export const contentApi = mockContentApi;
export const paymentsApi = mockPaymentsApi;
export const analyticsApi = mockAnalyticsApi;
export const apiClient = mockApiClient;

// Mock ApiError class from @suggar-daddy/api-client
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
