import { api } from './client';

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: 'user' | 'creator' | 'admin';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Auth API
export const authApi = {
  /**
   * 用戶登入
   * @param credentials - 登入憑證
   * @returns 用戶和 token 信息
   */
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    return api.post('/auth/login', credentials);
  },

  /**
   * 用戶註冊
   * @param data - 註冊信息
   * @returns 用戶和 token 信息
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    return api.post('/auth/register', data);
  },

  /**
   * 用戶登出
   * @returns 成功消息
   */
  logout: async (): Promise<{ message: string }> => {
    return api.post('/auth/logout');
  },

  /**
   * 刷新 Token
   * @param refreshToken - 刷新 token
   * @returns 新的 access token 和 refresh token
   */
  refreshToken: async (refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> => {
    return api.post('/auth/refresh', { refreshToken });
  },

  /**
   * 獲取當前用戶信息
   * @returns 當前用戶信息
   */
  getCurrentUser: async (): Promise<User> => {
    return api.get('/auth/me');
  },

  /**
   * 更新用戶資料
   * @param profile - 要更新的用戶資料
   * @returns 更新後的用戶信息
   */
  updateProfile: async (profile: UpdateProfileRequest): Promise<User> => {
    return api.put('/auth/profile', profile);
  },

  /**
   * 修改密碼
   * @param data - 密碼修改信息
   * @returns 成功消息
   */
  changePassword: async (
    data: ChangePasswordRequest
  ): Promise<{ message: string }> => {
    return api.put('/auth/change-password', data);
  },

  /**
   * 驗證 Email
   * @param token - 驗證令牌
   * @returns 成功消息
   */
  verifyEmail: async (token: string): Promise<{ message: string }> => {
    return api.post('/auth/verify-email', { token });
  },

  /**
   * 請求密碼重置
   * @param email - 用戶郵箱
   * @returns 成功消息
   */
  requestPasswordReset: async (email: string): Promise<{ message: string }> => {
    return api.post('/auth/request-password-reset', { email });
  },

  /**
   * 重置密碼
   * @param token - 重置令牌
   * @param newPassword - 新密碼
   * @returns 成功消息
   */
  resetPassword: async (
    token: string,
    newPassword: string
  ): Promise<{ message: string }> => {
    return api.post('/auth/reset-password', { token, newPassword });
  },

  /**
   * 驗證 Token 是否有效
   * @returns 驗證結果
   */
  validateToken: async (): Promise<{ valid: boolean }> => {
    return api.get('/auth/validate');
  },
};

export default authApi;
