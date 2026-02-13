import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger, Optional } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '@suggar-daddy/redis';

/**
 * Redis-based rate limiter（支援多 instance）。
 * Redis 斷線時降級為 in-memory，保持可用性。
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  /** In-memory fallback store（Redis 不可用時使用） */
  private readonly store = new Map<string, RateLimitEntry>();
  private useRedis = true;

  // 預設：每分鐘 60 次
  private readonly windowSec = 60;
  private readonly maxRequests = 60;

  // 敏感路由（登入/註冊）更嚴格：每分鐘 10 次
  private readonly strictPaths = ['/api/auth/login', '/api/auth/register'];
  private readonly strictMax = 10;

  constructor(@Optional() private readonly redisService?: RedisService) {
    if (!redisService) {
      this.useRedis = false;
      this.logger.warn('RedisService 未注入，使用 in-memory rate limiter');
    }
    // 每 5 分鐘清理過期的 in-memory entries
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const path = req.path || '';
    const isStrict = this.strictPaths.some((p) => path.startsWith(p));
    const limit = isStrict ? this.strictMax : this.maxRequests;
    const type = isStrict ? 'strict' : 'general';
    const key = `ratelimit:${type}:${ip}`;

    try {
      if (this.useRedis && this.redisService) {
        await this.handleRedis(key, limit, ip, path, res, next);
      } else {
        this.handleInMemory(key, limit, ip, path, res, next);
      }
    } catch (error) {
      // 重新拋出 HTTP 例外（如 429 Too Many Requests）
      if (error instanceof HttpException) {
        throw error;
      }
      // Redis 錯誤 → 降級為 in-memory
      if (this.useRedis) {
        this.logger.warn('Redis rate limit 失敗，降級為 in-memory: ' + (error as Error).message);
        this.useRedis = false;
        // 定時嘗試恢復 Redis
        setTimeout(() => { this.useRedis = true; }, 30_000);
      }
      this.handleInMemory(key, limit, ip, path, res, next);
    }
  }

  private async handleRedis(
    key: string, limit: number, ip: string, path: string,
    res: Response, next: NextFunction,
  ) {
    const client = this.redisService!.getClient();
    const count = await client.incr(key);

    // 第一次請求時設定過期時間
    if (count === 1) {
      await client.expire(key, this.windowSec);
    }

    const ttl = await client.ttl(key);
    const resetAt = Math.floor(Date.now() / 1000) + Math.max(ttl, 0);

    // 設定 rate limit headers
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(limit - count, 0));
    res.setHeader('X-RateLimit-Reset', resetAt);

    if (count > limit) {
      this.logger.warn(`Rate limit exceeded: ip=${ip} path=${path} count=${count}/${limit}`);
      throw new HttpException(
        { statusCode: 429, message: 'Too many requests. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }

  private handleInMemory(
    key: string, limit: number, ip: string, path: string,
    res: Response, next: NextFunction,
  ) {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowSec * 1000 };
      this.store.set(key, entry);
    }

    entry.count++;

    const resetAt = Math.floor(entry.resetAt / 1000);
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(limit - entry.count, 0));
    res.setHeader('X-RateLimit-Reset', resetAt);

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
