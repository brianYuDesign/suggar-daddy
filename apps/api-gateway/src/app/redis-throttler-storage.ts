/**
 * Custom Redis Throttler Storage compatible with ioredis 5.x
 * 
 * @nestjs-redis/throttler-storage 使用了不存在的 scriptLoad 方法
 * 這是一個兼容 ioredis 5.x 的自定義實現
 */

import { ThrottlerStorage } from '@nestjs/throttler';
import type Redis from 'ioredis';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

export class RedisThrottlerStorage implements ThrottlerStorage {
  private scriptSha: string | null = null;
  
  // Lua 腳本用於原子性地增加計數器
  private readonly luaScript = `
    local key = KEYS[1]
    local ttl = tonumber(ARGV[1])
    local now = tonumber(ARGV[2])
    
    local count = redis.call('INCR', key)
    
    if count == 1 then
      redis.call('EXPIRE', key, ttl)
    end
    
    local remaining_ttl = redis.call('TTL', key)
    
    return {count, remaining_ttl}
  `;

  constructor(private readonly client: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string
  ): Promise<ThrottlerStorageRecord> {
    const now = Date.now();
    const prefixedKey = `throttle:${throttlerName}:${key}`;
    
    try {
      // 加載 Lua 腳本（使用正確的 ioredis API）
      if (!this.scriptSha) {
        const sha = await this.client.script('LOAD', this.luaScript);
        this.scriptSha = String(sha);
      }

      // 執行腳本
      const result = await this.client.evalsha(
        this.scriptSha,
        1,
        prefixedKey,
        Math.ceil(ttl / 1000), // 轉換為秒
        now
      ) as [number, number];

      const [totalHits, timeToExpire] = result;

      return {
        totalHits,
        timeToExpire: timeToExpire * 1000, // 轉換回毫秒
        isBlocked: totalHits > limit,
        timeToBlockExpire: blockDuration,
      };
    } catch (error) {
      // 如果腳本不存在，清除 SHA 並重試
      if ((error as Error).message.includes('NOSCRIPT')) {
        this.scriptSha = null;
        return this.increment(key, ttl, limit, blockDuration, throttlerName);
      }
      throw error;
    }
  }
}

