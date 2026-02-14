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

  /** Trim list to specified range */
  async lTrim(key: string, start: number, stop: number): Promise<void> {
    await this.client.ltrim(key, start, stop);
  }

  /** Remove count occurrences of value from list */
  async lRem(key: string, count: number, value: string): Promise<number> {
    return this.client.lrem(key, count, value);
  }

  /** Append value to the end of a list */
  async rPush(key: string, ...values: (string | number)[]): Promise<number> {
    return this.client.rpush(key, ...values.map(String));
  }

  /** Safely parse JSON from a raw Redis string, returning null on failure */
  static tryParseJson<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  // ── Set commands ─────────────────────────────────────────────

  /** Check if member exists in a Set */
  async sIsMember(key: string, member: string): Promise<boolean> {
    return (await this.client.sismember(key, member)) === 1;
  }

  /** Get Set cardinality (member count) */
  async sCard(key: string): Promise<number> {
    return this.client.scard(key);
  }

  /** Return union of multiple sets */
  async sUnion(...keys: string[]): Promise<string[]> {
    if (keys.length === 0) return [];
    return this.client.sunion(...keys);
  }

  // ── Sorted Set commands ─────────────────────────────────────

  /** Add member with score to Sorted Set */
  async zAdd(key: string, ...args: Array<{ score: number; member: string } | number | string>): Promise<number> {
    // Support both single member and multiple members
    if (args.length === 0) return 0;
    
    // If first arg is a number, use old signature: zAdd(key, score, member)
    if (typeof args[0] === 'number') {
      const score = args[0] as number;
      const member = args[1] as string;
      return this.client.zadd(key, score, member);
    }
    
    // Otherwise, batch add: zAdd(key, {score, member}, {score, member}, ...)
    const pairs: (number | string)[] = [];
    for (const item of args) {
      if (typeof item === 'object' && 'score' in item && 'member' in item) {
        pairs.push(item.score, item.member);
      }
    }
    
    if (pairs.length === 0) return 0;
    return this.client.zadd(key, ...pairs);
  }

  /** Remove member from Sorted Set */
  async zRem(key: string, ...members: string[]): Promise<number> {
    return this.client.zrem(key, ...members);
  }

  /** Get range by rank in reverse order (highest score first) */
  async zRevRange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.zrevrange(key, start, stop);
  }

  /** Get range by score in reverse order with LIMIT */
  async zRevRangeByScore(
    key: string,
    max: number | string,
    min: number | string,
    offset?: number,
    count?: number,
  ): Promise<string[]> {
    if (offset !== undefined && count !== undefined) {
      return this.client.zrevrangebyscore(key, max, min, 'LIMIT', offset, count);
    }
    return this.client.zrevrangebyscore(key, max, min);
  }

  /** Get Sorted Set cardinality */
  async zCard(key: string): Promise<number> {
    return this.client.zcard(key);
  }

  /** Get score of member in Sorted Set */
  async zScore(key: string, member: string): Promise<number | null> {
    const score = await this.client.zscore(key, member);
    return score !== null ? parseFloat(score) : null;
  }

  /** Increment score of member in Sorted Set */
  async zIncrBy(key: string, increment: number, member: string): Promise<number> {
    const result = await this.client.zincrby(key, increment, member);
    return parseFloat(result);
  }

  /** Remove members by rank range (for trimming sorted sets) */
  async zRemRangeByRank(key: string, start: number, stop: number): Promise<number> {
    return this.client.zremrangebyrank(key, start, stop);
  }

  /** Remove members by score range */
  async zRemRangeByScore(key: string, min: number | string, max: number | string): Promise<number> {
    return this.client.zremrangebyscore(key, min, max);
  }

  // ── Key expiry ──────────────────────────────────────────────

  /** Set TTL on an existing key (seconds) */
  async expire(key: string, seconds: number): Promise<boolean> {
    return (await this.client.expire(key, seconds)) === 1;
  }

  /** Check if key exists */
  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  // ── GEO commands ──────────────────────────────────────────────

  /** Add a member's coordinates to a GEO sorted set */
  async geoAdd(key: string, longitude: number, latitude: number, member: string): Promise<number> {
    return this.client.geoadd(key, longitude, latitude, member);
  }

  /** Search members within a radius (km) from a given point, ordered by distance ASC */
  async geoSearch(
    key: string,
    longitude: number,
    latitude: number,
    radiusKm: number,
    count?: number,
  ): Promise<Array<{ member: string; distance: number }>> {
    const args: (string | number)[] = [
      key,
      'FROMLONLAT', longitude, latitude,
      'BYRADIUS', radiusKm, 'km',
      'ASC',
      'WITHDIST',
    ];
    if (count) {
      args.push('COUNT', count);
    }
    const results = await this.client.call('GEOSEARCH', ...args) as string[][];
    return results.map((entry) => ({
      member: entry[0],
      distance: parseFloat(entry[1]),
    }));
  }

  /** Get the distance between two members in km */
  async geoDist(key: string, memberA: string, memberB: string): Promise<number | null> {
    const dist = await this.client.call('GEODIST', key, memberA, memberB, 'km') as string | null;
    return dist ? parseFloat(dist) : null;
  }

  /** Remove a member from a GEO sorted set */
  async geoRemove(key: string, member: string): Promise<number> {
    return this.client.zrem(key, member);
  }

  /** Get a member's coordinates from a GEO sorted set */
  async geoPos(key: string, member: string): Promise<{ longitude: number; latitude: number } | null> {
    const result = await this.client.geopos(key, member);
    if (!result || !result[0]) return null;
    return {
      longitude: parseFloat(result[0][0]),
      latitude: parseFloat(result[0][1]),
    };
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
