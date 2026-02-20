/**
 * 統一的錯誤訊息處理工具
 * 將技術錯誤訊息轉換為用戶友好的中文提示
 */

export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  CONFLICT = 'CONFLICT',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  UNKNOWN = 'UNKNOWN',
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.NETWORK_ERROR]: '網絡連接失敗，請檢查您的網絡設置',
  [ErrorCode.SERVER_ERROR]: '伺服器暫時無法處理請求，請稍後再試',
  [ErrorCode.VALIDATION_ERROR]: '輸入信息有誤，請檢查後重試',
  [ErrorCode.UNAUTHORIZED]: '您的登入已過期，請重新登入',
  [ErrorCode.FORBIDDEN]: '您沒有權限執行此操作',
  [ErrorCode.NOT_FOUND]: '找不到請求的資源',
  [ErrorCode.TIMEOUT]: '請求超時，請稍後再試',
  [ErrorCode.CONFLICT]: '操作衝突，請刷新後重試',
  [ErrorCode.TOO_MANY_REQUESTS]: '請求過於頻繁，請稍後再試',
  [ErrorCode.PAYMENT_FAILED]: '支付失敗，請檢查支付方式或稍後重試',
  [ErrorCode.INSUFFICIENT_BALANCE]: '餘額不足，請先充值',
  [ErrorCode.UNKNOWN]: '發生未知錯誤，請聯繫客服',
};

export interface ApiError extends Error {
  code?: string;
  statusCode?: number;
  details?: unknown;
}

/**
 * 將錯誤對象轉換為友好的錯誤訊息
 */
export function getFriendlyErrorMessage(error: unknown): string {
  // 處理 API 錯誤
  if (isApiError(error)) {
    // 優先使用錯誤碼
    if (error.code && error.code in ErrorCode) {
      return ERROR_MESSAGES[error.code as ErrorCode];
    }
    
    // 根據 HTTP 狀態碼判斷
    if (error.statusCode) {
      switch (error.statusCode) {
        case 400:
          return ERROR_MESSAGES[ErrorCode.VALIDATION_ERROR];
        case 401:
          return ERROR_MESSAGES[ErrorCode.UNAUTHORIZED];
        case 403:
          return ERROR_MESSAGES[ErrorCode.FORBIDDEN];
        case 404:
          return ERROR_MESSAGES[ErrorCode.NOT_FOUND];
        case 409:
          return ERROR_MESSAGES[ErrorCode.CONFLICT];
        case 429:
          return ERROR_MESSAGES[ErrorCode.TOO_MANY_REQUESTS];
        case 500:
        case 502:
        case 503:
          return ERROR_MESSAGES[ErrorCode.SERVER_ERROR];
        case 504:
          return ERROR_MESSAGES[ErrorCode.TIMEOUT];
      }
    }
    
    // 如果有友好的錯誤訊息，直接使用
    if (error.message && !isTechnicalMessage(error.message)) {
      return error.message;
    }
  }
  
  // 處理標準 Error 對象
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_MESSAGES[ErrorCode.NETWORK_ERROR];
    }
    
    if (message.includes('timeout')) {
      return ERROR_MESSAGES[ErrorCode.TIMEOUT];
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return ERROR_MESSAGES[ErrorCode.UNAUTHORIZED];
    }
    
    if (message.includes('forbidden') || message.includes('403')) {
      return ERROR_MESSAGES[ErrorCode.FORBIDDEN];
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return ERROR_MESSAGES[ErrorCode.NOT_FOUND];
    }
    
    // 如果不是技術訊息，直接返回
    if (!isTechnicalMessage(error.message)) {
      return error.message;
    }
  }
  
  // 處理字串錯誤
  if (typeof error === 'string') {
    if (!isTechnicalMessage(error)) {
      return error;
    }
  }
  
  return ERROR_MESSAGES[ErrorCode.UNKNOWN];
}

/**
 * 檢查是否為 API 錯誤
 */
function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof Error &&
    ('code' in error || 'statusCode' in error)
  );
}

/**
 * 檢查訊息是否為技術性訊息（對用戶不友好）
 */
function isTechnicalMessage(message: string): boolean {
  const technicalPatterns = [
    /^[A-Z_]+$/,                    // 全大寫常量：NETWORK_ERROR
    /error code/i,                  // "Error code: 500"
    /status code/i,                 // "Status code: 404"
    /^500/,                         // "500 Internal Server Error"
    /internal server error/i,       // 技術錯誤
    /undefined|null/i,              // JavaScript 錯誤
    /cannot read property/i,        // JavaScript 錯誤
    /is not defined/i,              // JavaScript 錯誤
    /unexpected token/i,            // 解析錯誤
    /syntax error/i,                // 語法錯誤
  ];
  
  return technicalPatterns.some(pattern => pattern.test(message));
}

/**
 * 根據錯誤類型獲取建議的操作
 */
export function getErrorAction(error: unknown): {
  label: string;
  action: 'retry' | 'refresh' | 'login' | 'contact' | 'none';
} {
  const message = getFriendlyErrorMessage(error);
  
  if (message.includes('網絡')) {
    return { label: '重試', action: 'retry' };
  }
  
  if (message.includes('登入已過期')) {
    return { label: '重新登入', action: 'login' };
  }
  
  if (message.includes('衝突') || message.includes('刷新')) {
    return { label: '刷新頁面', action: 'refresh' };
  }
  
  if (message.includes('聯繫客服')) {
    return { label: '聯繫客服', action: 'contact' };
  }
  
  if (message.includes('稍後')) {
    return { label: '重試', action: 'retry' };
  }
  
  return { label: '確定', action: 'none' };
}

/**
 * 創建標準化的 API 錯誤
 */
export function createApiError(
  message: string,
  code?: ErrorCode,
  statusCode?: number,
  details?: unknown
): ApiError {
  const error = new Error(message) as ApiError;
  error.name = 'ApiError';
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}
