import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
}

export class ApiClient {
  private readonly http: AxiosInstance;

  constructor(config: ApiClientConfig) {
    this.http = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  setToken(token: string) {
    this.http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearToken() {
    delete this.http.defaults.headers.common['Authorization'];
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.http.get<T>(url, config);
    return res.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.http.post<T>(url, data, config);
    return res.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.http.put<T>(url, data, config);
    return res.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.http.patch<T>(url, data, config);
    return res.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.http.delete<T>(url, config);
    return res.data;
  }
}
