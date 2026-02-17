/**
 * Test API Client
 * 
 * 統一的測試用 API 客戶端
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export class TestApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  
  constructor(baseURL: string = 'http://localhost:3000') {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      validateStatus: () => true, // 不自動拋出錯誤
    });
  }
  
  /**
   * 設置認證 token
   */
  setAuthToken(token: string): void {
    this.token = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  
  /**
   * 清除認證 token
   */
  clearAuthToken(): void {
    this.token = null;
    delete this.client.defaults.headers.common['Authorization'];
  }
  
  /**
   * GET 請求
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.client.get<T>(url, config);
  }
  
  /**
   * POST 請求
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.post<T>(url, data, config);
  }
  
  /**
   * PUT 請求
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.put<T>(url, data, config);
  }
  
  /**
   * PATCH 請求
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.patch<T>(url, data, config);
  }
  
  /**
   * DELETE 請求
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.client.delete<T>(url, config);
  }
  
  /**
   * 登入並設置 token
   */
  async login(email: string, password: string): Promise<string> {
    const response = await this.post('/api/auth/login', { email, password });
    
    if (response.status === 200 && response.data.accessToken) {
      this.setAuthToken(response.data.accessToken);
      return response.data.accessToken;
    }
    
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }
  
  /**
   * 註冊新用戶
   */
  async register(userData: {
    email: string;
    password: string;
    displayName: string;
    userType: 'sugar_daddy' | 'sugar_baby' | 'creator';
  }): Promise<any> {
    const response = await this.post('/api/auth/register', userData);
    return response.data;
  }
}

/**
 * 創建 API 客戶端的輔助函數
 */
export function createApiClient(baseURL?: string): TestApiClient {
  return new TestApiClient(baseURL);
}
