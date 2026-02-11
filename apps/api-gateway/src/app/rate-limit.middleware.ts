import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Redis-free in-memory rate limiter (for gateway).
 * Production 建議換成 Redis-based 以支援多 instance。
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly store = new Map<string, RateLimitEntry>();

  // 預設：每分鐘 60 次
  private readonly windowMs = 60 * 1000;
  private readonly maxRequests = 60;

  // 敏感路由（登入/註冊）更嚴格：每分鐘 10 次
  private readonly strictPaths = ['/api/v1/auth/login', '/api/v1/auth/register'];
  private readonly strictMax = 10;

  constructor() {
    // 每 5 分鐘清理過期的 entries
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  use(req: Request, _res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const path = req.path || '';
    const isStrict = this.strictPaths.some((p) => path.startsWith(p));
    const limit = isStrict ? this.strictMax : this.maxRequests;
    const key = isStrict ? `strict:${ip}` : `general:${ip}`;

    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.store.set(key, entry);
    }

    entry.count++;

    if (entry.count > limit) {
      this.logger.warn(`Rate limit exceeded: ip=${ip} path=${path} count=${entry.count}/${limit}`);
      throw new HttpException(
        { statusCode: 429, message: 'Too many requests. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) this.store.delete(key);
    }
  }
}
