import CircuitBreaker from 'opossum';

/**
 * Circuit Breaker 配置介面
 */
export interface CircuitBreakerConfig {
  /** 超時時間（毫秒） */
  timeout?: number;
  /** 錯誤閾值百分比（0-100） */
  errorThresholdPercentage?: number;
  /** 重置超時時間（毫秒） */
  resetTimeout?: number;
  /** 滾動計數窗口（毫秒） */
  rollingCountTimeout?: number;
  /** 滾動計數桶數 */
  rollingCountBuckets?: number;
  /** 失敗次數閾值（絕對數量） */
  errorThreshold?: number;
  /** 最小請求數（達到此數量後才計算錯誤率） */
  volumeThreshold?: number;
  /** 是否啟用 */
  enabled?: boolean;
  /** 服務名稱（用於監控和日誌） */
  name?: string;
}

/**
 * 預設 Circuit Breaker 配置
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  timeout: 3000, // 3 秒超時
  errorThresholdPercentage: 50, // 50% 錯誤率觸發熔斷
  resetTimeout: 30000, // 30 秒後嘗試恢復
  rollingCountTimeout: 10000, // 10 秒滾動窗口
  rollingCountBuckets: 10, // 10 個桶
  volumeThreshold: 10, // 至少 10 個請求後才計算錯誤率
  enabled: true,
};

/**
 * API Gateway 專用配置
 * 對內部微服務調用，超時設短一點，錯誤率容忍度較高
 */
export const API_GATEWAY_CONFIG: CircuitBreakerConfig = {
  ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
  timeout: 5000, // 5 秒超時（微服務可能稍慢）
  errorThresholdPercentage: 60, // 60% 錯誤率
  resetTimeout: 20000, // 20 秒後嘗試恢復（較快）
  name: 'api-gateway',
};

/**
 * Payment Service 專用配置
 * 對外部支付 API，需要較長超時，錯誤容忍度較低
 */
export const PAYMENT_SERVICE_CONFIG: CircuitBreakerConfig = {
  ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
  timeout: 10000, // 10 秒超時（外部 API 較慢）
  errorThresholdPercentage: 40, // 40% 錯誤率（支付較敏感）
  resetTimeout: 60000, // 60 秒後嘗試恢復
  volumeThreshold: 5, // 5 個請求就開始計算（避免支付失敗累積）
  name: 'payment-service',
};

/**
 * Notification Service 專用配置
 * 對 Firebase FCM，容忍度較高，失敗影響較小
 */
export const NOTIFICATION_SERVICE_CONFIG: CircuitBreakerConfig = {
  ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
  timeout: 8000, // 8 秒超時
  errorThresholdPercentage: 70, // 70% 錯誤率（通知失敗影響較小）
  resetTimeout: 30000, // 30 秒後嘗試恢復
  volumeThreshold: 20, // 20 個請求後才計算
  name: 'notification-service',
};

/**
 * 轉換配置為 opossum 選項
 */
export function toOpossumOptions(
  config: CircuitBreakerConfig
): CircuitBreaker.Options {
  return {
    timeout: config.timeout,
    errorThresholdPercentage: config.errorThresholdPercentage,
    resetTimeout: config.resetTimeout,
    rollingCountTimeout: config.rollingCountTimeout,
    rollingCountBuckets: config.rollingCountBuckets,
    volumeThreshold: config.volumeThreshold,
    enabled: config.enabled,
    name: config.name,
  };
}
