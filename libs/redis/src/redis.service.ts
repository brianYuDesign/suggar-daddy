import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(private readonly client: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /** Set key with optional TTL (seconds). Defaults to 24h if ttlSeconds not provided. */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? 86400; // default 24h
    await this.client.setex(key, ttl, value);
  }

  /** Set key with no expiry — use sparingly for data that must persist */
  async setPermanent(key: string, value: string): Promise<void> {
    await this.client.set(key, value);
  }

  /** @deprecated Use set() with ttlSeconds parameter instead */
  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    await this.client.setex(key, ttlSeconds, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async sAdd(key: string, ...members: (string | number)[]): Promise<number> {
    return this.client.sadd(key, ...members.map(String));
  }

  async sMembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async sRem(key: string, ...members: (string | number)[]): Promise<number> {
    return this.client.srem(key, ...members.map(String));
  }

  /**
   * @deprecated Use scan() instead. KEYS blocks Redis on large datasets.
   */
  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  /** Iterate keys matching pattern using non-blocking SCAN */
  async scan(pattern: string, count = 100): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const result = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');
    return keys;
  }

  /** Batch get multiple keys */
  async mget(...keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    return this.client.mget(...keys);
  }

  async lPush(key: string, ...values: (string | number)[]): Promise<number> {
    return this.client.lpush(key, ...values.map(String));
  }

  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async lLen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
