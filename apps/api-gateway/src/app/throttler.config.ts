/**
 * Rate Limiting Configuration for API Gateway
 * 
 * 實施三層限流策略：
 * 1. 全局限流：100 requests/分鐘/IP
 * 2. 認證端點：5 requests/分鐘/IP
 * 3. 支付端點：10 requests/分鐘/用戶
 * 
 * 使用 Redis 儲存，支援分散式環境
 */

import { ThrottlerModuleOptions, seconds } from '@nestjs/throttler';
import Redis from 'ioredis';
import { RedisThrottlerStorage } from './redis-throttler-storage';

export interface ThrottlerConfig {
  globalLimit: number;
  authLimit: number;
  paymentLimit: number;
  windowSeconds: number;
}

/**
 * 從環境變數讀取 Rate Limiting 配置
 */
export function getThrottlerConfig(): ThrottlerConfig {
  return {
    // 全局限流：每分鐘 100 個請求
    globalLimit: parseInt(process.env.THROTTLE_GLOBAL_LIMIT || '100', 10),
    
    // 認證端點：每分鐘 5 個請求
    authLimit: parseInt(process.env.THROTTLE_AUTH_LIMIT || '5', 10),
    
    // 支付端點：每分鐘 10 個請求
    paymentLimit: parseInt(process.env.THROTTLE_PAYMENT_LIMIT || '10', 10),
    
    // 時間窗口（秒）
    windowSeconds: parseInt(process.env.THROTTLE_WINDOW_SECONDS || '60', 10),
  };
}

/**
 * 創建 Throttler Module Options
 */
export function createThrottlerOptions(): ThrottlerModuleOptions {
  const config = getThrottlerConfig();
  
  // 創建 Redis 客戶端
  const redisClient = createRedisClient();
  
  return {
    // 全局限流配置
    throttlers: [
      {
        name: 'global',
        ttl: seconds(config.windowSeconds),
        limit: config.globalLimit,
      },
      {
        name: 'auth',
        ttl: seconds(config.windowSeconds),
        limit: config.authLimit,
      },
      {
        name: 'payment',
        ttl: seconds(config.windowSeconds),
        limit: config.paymentLimit,
      },
    ],
    
    // 使用 Redis 儲存
    storage: new RedisThrottlerStorage(redisClient),
    
    // 忽略特定路由
    ignoreUserAgents: [
      // 健康檢查
      /health/gi,
      // 內部監控
      /prometheus/gi,
    ],
    
    // 錯誤訊息
    errorMessage: 'Too many requests. Please try again later.',
  };
}

/**
 * 創建 Redis 客戶端（用於 Throttler Storage）
 */
function createRedisClient(): Redis {
  const sentinelsEnv = process.env.REDIS_SENTINELS;
  const masterNameEnv = process.env.REDIS_MASTER_NAME;
  
  if (sentinelsEnv && masterNameEnv) {
    // Sentinel 模式
    const sentinels = sentinelsEnv.split(',').map(s => {
      const [host, port] = s.trim().split(':');
      return { host, port: parseInt(port, 10) };
    });
    
    console.log('[Throttler] 🛡️ 使用 Redis Sentinel 進行 Rate Limiting');
    
    return new Redis({
      sentinels,
      name: masterNameEnv,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 200, 2000);
        return times > 3 ? null : delay;
      },
      sentinelRetryStrategy: (times) => {
        const delay = Math.min(times * 500, 3000);
        return times > 3 ? null : delay;
      },
    });
  } else {
    // 單機模式
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = Number(process.env.REDIS_PORT ?? 6379);
    const url = process.env.REDIS_URL;
    
    console.log(`[Throttler] 📍 使用單機 Redis 進行 Rate Limiting: ${url ?? `redis://${host}:${port}`}`);
    
    const redisOptions: import('ioredis').RedisOptions = {
      maxRetriesPerRequest: null, // 重要：Throttler 需要設為 null
      connectTimeout: 10000,
      enableOfflineQueue: false, // 禁用離線隊列
      lazyConnect: false, // 立即連接
      retryStrategy: (times) => {
        const delay = Math.min(times * 200, 2000);
        return times > 3 ? null : delay;
      },
    };
    
    if (url) {
      return new Redis(url, redisOptions);
    }
    return new Redis({ ...redisOptions, host, port });
  }
}
