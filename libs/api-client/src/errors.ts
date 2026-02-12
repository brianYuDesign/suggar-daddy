import axios from 'axios';

/** 從 API 回傳的結構化錯誤回應 */
export interface ApiErrorData {
  message: string;
  statusCode?: number;
  error?: string;
}

/** 包裝 axios 錯誤為型別安全的 ApiError */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly data: ApiErrorData | null;

  constructor(statusCode: number, message: string, data: ApiErrorData | null = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }

  /** 從 unknown 錯誤物件擷取 HTTP 狀態碼，回傳 0 表示非 HTTP 錯誤 */
  static getStatusCode(err: unknown): number {
    if (err instanceof ApiError) return err.statusCode;
    if (axios.isAxiosError(err)) return err.response?.status ?? 0;
    return 0;
  }

  /** 從 unknown 錯誤物件擷取使用者可讀的訊息 */
  static getMessage(err: unknown, fallback = 'An error occurred'): string {
    if (err instanceof ApiError) {
      return err.data?.message || err.message;
    }
    if (axios.isAxiosError(err)) {
      return err.response?.data?.message || err.message;
    }
    if (err instanceof Error) return err.message;
    return fallback;
  }
}
