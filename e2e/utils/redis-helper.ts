import Redis from 'ioredis';

/**
 * Redis 測試工具
 * 用於測試環境中的 Redis 資料清理
 */
export class RedisTestHelper {
  private client: Redis;

  constructor(
    host: string = process.env.REDIS_HOST || 'localhost',
    port: number = parseInt(process.env.REDIS_PORT || '6379', 10),
    password?: string
  ) {
    this.client = new Redis({
      host,
      port,
      password: password || process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        if (times > 3) {
          return null; // Stop retrying after 3 attempts
        }
        return Math.min(times * 200, 1000); // Exponential backoff
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }

  /**
   * 清除所有登入嘗試記錄
   */
  async clearLoginAttempts(email?: string): Promise<number> {
    const pattern = email ? `auth:login-attempts:${email}` : 'auth:login-attempts:*';
    return this.clearKeysByPattern(pattern);
  }

  /**
   * 清除特定使用者的所有認證相關資料
   */
  async clearUserAuthData(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    
    // 清除登入嘗試
    await this.clearLoginAttempts(normalizedEmail);
    
    // 清除 refresh tokens (需要先找到該使用者的所有 refresh tokens)
    const refreshTokens = await this.scan('auth:refresh:*');
    const pipe = this.client.pipeline();
    
    for (const key of refreshTokens) {
      const data = await this.client.get(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (parsed.email === normalizedEmail) {
            pipe.del(key);
          }
        } catch (err) {
          // Ignore parse errors
        }
      }
    }
    
    await pipe.exec();
  }

  /**
   * 清除特定 pattern 的所有 keys
   */
  async clearKeysByPattern(pattern: string): Promise<number> {
    const keys = await this.scan(pattern);
    if (keys.length === 0) {
      return 0;
    }
    
    // 批次刪除
    const pipe = this.client.pipeline();
    keys.forEach((key) => pipe.del(key));
    await pipe.exec();
    
    return keys.length;
  }

  /**
   * 使用 SCAN 安全地掃描 keys（不阻塞 Redis）
   */
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

  /**
   * 檢查連線是否正常
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (err) {
      return false;
    }
  }

  /**
   * 獲取指定 key 的值
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * 設定 key 的值
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * 刪除指定 key
   */
  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  /**
   * 獲取登入嘗試次數
   */
  async getLoginAttempts(email: string): Promise<number> {
    const normalizedEmail = email.trim().toLowerCase();
    const key = `auth:login-attempts:${normalizedEmail}`;
    const raw = await this.client.get(key);
    return raw ? parseInt(raw, 10) : 0;
  }

  /**
   * 清除所有測試相關的資料
   * ⚠️ 警告：只在測試環境使用！
   */
  async clearAllTestData(): Promise<void> {
    const patterns = [
      'auth:login-attempts:*test*',
      'auth:login-attempts:*example.com',
      'user:email:*test*',
      'user:email:*example.com',
    ];

    for (const pattern of patterns) {
      await this.clearKeysByPattern(pattern);
    }
  }

  /**
   * 關閉連線
   */
  async close(): Promise<void> {
    await this.client.quit();
  }

  /**
   * 取得底層 Redis client（進階使用）
   */
  getClient(): Redis {
    return this.client;
  }
}

/**
 * 建立單例 Redis 測試工具
 */
let redisHelperInstance: RedisTestHelper | null = null;

export function getRedisTestHelper(): RedisTestHelper {
  if (!redisHelperInstance) {
    redisHelperInstance = new RedisTestHelper();
  }
  return redisHelperInstance;
}

/**
 * 清理 Redis 測試工具單例
 */
export async function closeRedisTestHelper(): Promise<void> {
  if (redisHelperInstance) {
    await redisHelperInstance.close();
    redisHelperInstance = null;
  }
}
