/**
 * Throttler Decorators for Different Rate Limits
 * 
 * 使用範例：
 * 
 * @AuthThrottle()  // 5 requests/分鐘
 * @Post('login')
 * async login() { ... }
 * 
 * @PaymentThrottle()  // 10 requests/分鐘
 * @Post('charge')
 * async charge() { ... }
 */

import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/**
 * 認證端點限流：5 requests/分鐘/IP
 * 適用於：登入、註冊、忘記密碼等敏感操作
 */
export const AuthThrottle = () => {
  return applyDecorators(
    Throttle({ auth: { limit: 5, ttl: 60000 } })
  );
};

/**
 * 支付端點限流：10 requests/分鐘/用戶
 * 適用於：付款、訂閱、退款等金融操作
 */
export const PaymentThrottle = () => {
  return applyDecorators(
    Throttle({ payment: { limit: 10, ttl: 60000 } })
  );
};

/**
 * 跳過限流（用於健康檢查等內部端點）
 */
export const SkipThrottle = () => {
  return applyDecorators(
    Throttle({ default: { limit: 0, ttl: 0 } })
  );
};
