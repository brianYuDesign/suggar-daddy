/**
 * Throttler Guard for APIs behind Proxy/Load Balancer
 * 
 * 解決問題：當 API Gateway 在 proxy 或 load balancer 後面時，
 * 需要從 X-Forwarded-For 或 X-Real-IP header 取得真實的客戶端 IP
 * 
 * 智能限流策略：
 * - /api/auth/* 路徑：5 requests/分鐘
 * - /api/payment/* 路徑：10 requests/分鐘
 * - 其他路徑：100 requests/分鐘
 */

import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  /**
   * 取得真實的客戶端 IP
   * 優先順序：X-Forwarded-For > X-Real-IP > req.ip
   */
  protected async getTracker(req: Request): Promise<string> {
    // 1. 檢查 X-Forwarded-For (可能有多個 IP，取第一個)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      const firstIp = ips.split(',')[0].trim();
      return firstIp;
    }
    
    // 2. 檢查 X-Real-IP
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }
    
    // 3. 使用 req.ip
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * 根據路徑決定使用哪個限流器
   */
  protected async getThrottlerConfig(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const path = req.path || req.url || '';
    
    // 認證端點：更嚴格的限流
    if (this.isAuthPath(path)) {
      return {
        limit: 5,
        ttl: 60000, // 60 秒
        name: 'auth',
      };
    }
    
    // 支付端點：中等限流
    if (this.isPaymentPath(path)) {
      return {
        limit: 10,
        ttl: 60000,
        name: 'payment',
      };
    }
    
    // 健康檢查：不限流
    if (this.isHealthCheck(path)) {
      return {
        limit: 1000000,
        ttl: 1000,
        name: 'health',
      };
    }
    
    // 全局限流：預設
    return {
      limit: 100,
      ttl: 60000,
      name: 'global',
    };
  }

  /**
   * 判斷是否為認證相關路徑
   */
  private isAuthPath(path: string): boolean {
    const authPaths = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/verify-email',
      '/api/auth/refresh',
    ];
    
    return authPaths.some(p => path.startsWith(p));
  }

  /**
   * 判斷是否為支付相關路徑
   */
  private isPaymentPath(path: string): boolean {
    const paymentPaths = [
      '/api/payment/charge',
      '/api/payment/refund',
      '/api/payment/subscription',
      '/api/payment/webhook',
      '/api/subscription/create',
      '/api/subscription/cancel',
    ];
    
    return paymentPaths.some(p => path.startsWith(p));
  }

  /**
   * 判斷是否為健康檢查
   */
  private isHealthCheck(path: string): boolean {
    return path === '/health' || path === '/api/health' || path.includes('/metrics');
  }

  /**
   * 自訂錯誤訊息，包含 Rate Limit Headers
   */
  protected async throwThrottlingException(context: ExecutionContext): Promise<void> {
    const response = context.switchToHttp().getResponse();
    
    // 設置標準 Rate Limit Headers
    response.setHeader('X-RateLimit-Limit', '100');
    response.setHeader('X-RateLimit-Remaining', '0');
    response.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + 60);
    response.setHeader('Retry-After', '60');
    
    throw new ThrottlerException('Too many requests. Please try again later.');
  }
}

