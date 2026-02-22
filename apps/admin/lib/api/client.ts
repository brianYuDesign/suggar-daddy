import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

// 環境變量配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Types
export interface ApiResponse<T = unknown> {
  statusCode: number;
  message: string;
  data?: T;
  error?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

// Token 管理
export const tokenManager = {
  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  },

  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },

  getRefreshToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
  },

  setRefreshToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  },

  clearTokens: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  setTokens: (accessToken: string, refreshToken: string) => {
    tokenManager.setToken(accessToken);
    tokenManager.setRefreshToken(refreshToken);
  },
};

// 創建 Axios 實例
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 請求攔截器 - 添加 Authorization header
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = tokenManager.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 響應攔截器 - 處理 token 刷新和錯誤
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Token 過期 - 嘗試刷新
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = tokenManager.getRefreshToken();
          if (!refreshToken) {
            tokenManager.clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(error);
          }

          const response = await axios.post<TokenResponse>(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          tokenManager.setTokens(accessToken, newRefreshToken);

          // 使用新 token 重試原始請求
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return client(originalRequest);
        } catch (refreshError) {
          tokenManager.clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }

      // 403 - 權限拒絕
      if (error.response?.status === 403) {
        if (typeof window !== 'undefined') {
          window.location.href = '/forbidden';
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

export const apiClient = createApiClient();

// API 調用包裝函數
export const api = {
  get: async <T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    try {
      const response = await apiClient.get<ApiResponse<T>>(url, config);
      return response.data.data || (response.data as T);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  post: async <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    try {
      const response = await apiClient.post<ApiResponse<T>>(url, data, config);
      return response.data.data || (response.data as T);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  put: async <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    try {
      const response = await apiClient.put<ApiResponse<T>>(url, data, config);
      return response.data.data || (response.data as T);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  patch: async <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    try {
      const response = await apiClient.patch<ApiResponse<T>>(url, data, config);
      return response.data.data || (response.data as T);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  delete: async <T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    try {
      const response = await apiClient.delete<ApiResponse<T>>(url, config);
      return response.data.data || (response.data as T);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// 錯誤處理
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status || 0;
    const message =
      error.response?.data?.message || error.message || 'Unknown error';
    const data = error.response?.data?.data || error.response?.data;

    return new ApiError(status, message, data);
  }

  return new ApiError(500, 'Unknown error', error);
};

// 網絡狀態檢測
export const checkNetworkStatus = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/health', { timeout: 5000 });
    return response.status === 200;
  } catch {
    return false;
  }
};

export default apiClient;
