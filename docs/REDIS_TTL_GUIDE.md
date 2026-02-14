# Redis TTL 配置指南

## 概述

本文檔說明 Suggar Daddy 專案中 Redis 的 TTL (Time To Live) 最佳實踐，確保快取數據的有效管理和記憶體優化。

## 為什麼需要 TTL？

### 問題

❌ **沒有 TTL 的風險：**
1. 記憶體無限增長
2. 過期數據永久佔用空間
3. 快取數據與資料庫不一致
4. 達到 maxmemory 限制後觸發淘汰策略

### 解決方案

✅ **使用 TTL 的好處：**
1. 自動清理過期數據
2. 控制記憶體使用
3. 保持數據新鮮度
4. 減少手動清理負擔

## TTL 策略指南

### 1. 按數據類型設置 TTL

| 數據類型 | 建議 TTL | 說明 |
|----------|----------|------|
| **Session / Token** | 7 天 - 30 天 | 用戶登入憑證 |
| **用戶資料快取** | 1 小時 - 24 小時 | 個人資料、偏好設定 |
| **列表數據** | 5 分鐘 - 1 小時 | 搜尋結果、推薦列表 |
| **計數器** | 1 小時 - 7 天 | 瀏覽次數、點讚數 |
| **臨時數據** | 5 分鐘 - 1 小時 | 驗證碼、臨時標記 |
| **熱點數據** | 30 分鐘 - 2 小時 | 熱門內容、趨勢數據 |
| **靜態內容** | 24 小時 - 7 天 | 配置、分類、標籤 |
| **GEO 位置** | 10 分鐘 - 1 小時 | 用戶位置、附近搜尋 |

### 2. TTL 時間對照表

```typescript
// TTL 常量定義（秒）
export const TTL = {
  // 超短期（Immediate）
  ONE_MINUTE: 60,
  FIVE_MINUTES: 5 * 60,
  TEN_MINUTES: 10 * 60,
  FIFTEEN_MINUTES: 15 * 60,
  
  // 短期（Short-term）
  THIRTY_MINUTES: 30 * 60,
  ONE_HOUR: 60 * 60,
  TWO_HOURS: 2 * 60 * 60,
  SIX_HOURS: 6 * 60 * 60,
  
  // 中期（Medium-term）
  TWELVE_HOURS: 12 * 60 * 60,
  ONE_DAY: 24 * 60 * 60,
  THREE_DAYS: 3 * 24 * 60 * 60,
  
  // 長期（Long-term）
  ONE_WEEK: 7 * 24 * 60 * 60,
  TWO_WEEKS: 14 * 24 * 60 * 60,
  ONE_MONTH: 30 * 24 * 60 * 60,
} as const;
```

## 服務層 TTL 配置

### 1. Auth Service - 認證服務

```typescript
// apps/auth-service/src/auth.service.ts

import { RedisService } from '@suggar-daddy/redis';
import { TTL } from './constants/ttl';

export class AuthService {
  constructor(private readonly redis: RedisService) {}

  // Access Token (短期)
  async storeAccessToken(userId: string, token: string): Promise<void> {
    const key = `auth:access_token:${userId}`;
    await this.redis.set(key, token, TTL.ONE_HOUR);
  }

  // Refresh Token (長期)
  async storeRefreshToken(userId: string, token: string): Promise<void> {
    const key = `auth:refresh_token:${userId}`;
    await this.redis.set(key, token, TTL.ONE_WEEK);
  }

  // Email Verification Code (臨時)
  async storeVerificationCode(email: string, code: string): Promise<void> {
    const key = `auth:verification:${email}`;
    await this.redis.set(key, code, TTL.FIFTEEN_MINUTES);
  }

  // Password Reset Token (臨時)
  async storePasswordResetToken(userId: string, token: string): Promise<void> {
    const key = `auth:password_reset:${userId}`;
    await this.redis.set(key, token, TTL.THIRTY_MINUTES);
  }

  // Login Attempts (短期計數器)
  async incrementLoginAttempts(ip: string): Promise<void> {
    const key = `auth:login_attempts:${ip}`;
    await this.redis.getClient().incr(key);
    await this.redis.expire(key, TTL.ONE_HOUR);
  }

  // Session Data (中期)
  async storeSession(sessionId: string, data: object): Promise<void> {
    const key = `auth:session:${sessionId}`;
    await this.redis.set(key, JSON.stringify(data), TTL.THREE_DAYS);
  }
}
```

### 2. User Service - 用戶服務

```typescript
// apps/user-service/src/user.service.ts

export class UserService {
  constructor(private readonly redis: RedisService) {}

  // 用戶資料快取
  async cacheUserProfile(userId: string, profile: UserProfile): Promise<void> {
    const key = `user:profile:${userId}`;
    await this.redis.set(key, JSON.stringify(profile), TTL.ONE_HOUR);
  }

  // 用戶偏好設定（較長期）
  async cacheUserPreferences(userId: string, prefs: object): Promise<void> {
    const key = `user:preferences:${userId}`;
    await this.redis.set(key, JSON.stringify(prefs), TTL.ONE_DAY);
  }

  // 用戶列表快取（短期）
  async cacheUserList(cacheKey: string, users: User[]): Promise<void> {
    const key = `user:list:${cacheKey}`;
    await this.redis.set(key, JSON.stringify(users), TTL.FIVE_MINUTES);
  }

  // 在線狀態（實時性要求高）
  async setUserOnline(userId: string): Promise<void> {
    const key = `user:online:${userId}`;
    await this.redis.set(key, Date.now().toString(), TTL.FIVE_MINUTES);
  }

  // 用戶計數器（中期）
  async incrementProfileView(userId: string): Promise<void> {
    const key = `user:views:${userId}`;
    await this.redis.getClient().incr(key);
    await this.redis.expire(key, TTL.ONE_DAY);
  }
}
```

### 3. Matching Service - 配對服務

```typescript
// apps/matching-service/src/matching.service.ts

export class MatchingService {
  constructor(private readonly redis: RedisService) {}

  // 配對推薦列表（短期）
  async cacheMatchRecommendations(userId: string, matches: Match[]): Promise<void> {
    const key = `matching:recommendations:${userId}`;
    await this.redis.set(key, JSON.stringify(matches), TTL.FIFTEEN_MINUTES);
  }

  // 配對分數（中期）
  async cacheMatchScore(userId1: string, userId2: string, score: number): Promise<void> {
    const key = `matching:score:${userId1}:${userId2}`;
    await this.redis.set(key, score.toString(), TTL.ONE_HOUR);
  }

  // 用戶位置（實時性要求高）
  async updateUserLocation(userId: string, lon: number, lat: number): Promise<void> {
    const key = 'matching:locations';
    await this.redis.geoAdd(key, lon, lat, userId);
    await this.redis.expire(key, TTL.TEN_MINUTES);
  }

  // 附近用戶搜尋結果（短期）
  async cacheNearbyUsers(userId: string, nearbyUsers: User[]): Promise<void> {
    const key = `matching:nearby:${userId}`;
    await this.redis.set(key, JSON.stringify(nearbyUsers), TTL.FIVE_MINUTES);
  }
}
```

### 4. Messaging Service - 訊息服務

```typescript
// apps/messaging-service/src/messaging.service.ts

export class MessagingService {
  constructor(private readonly redis: RedisService) {}

  // 聊天室在線用戶列表（實時性要求高）
  async addUserToRoom(roomId: string, userId: string): Promise<void> {
    const key = `messaging:room:${roomId}:users`;
    await this.redis.sAdd(key, userId);
    await this.redis.expire(key, TTL.ONE_HOUR);
  }

  // 未讀訊息計數（中期）
  async incrementUnreadCount(userId: string, roomId: string): Promise<void> {
    const key = `messaging:unread:${userId}:${roomId}`;
    await this.redis.getClient().incr(key);
    await this.redis.expire(key, TTL.ONE_WEEK);
  }

  // 最近聊天列表（短期）
  async cacheRecentChats(userId: string, chats: Chat[]): Promise<void> {
    const key = `messaging:recent:${userId}`;
    await this.redis.set(key, JSON.stringify(chats), TTL.FIVE_MINUTES);
  }

  // 輸入狀態（超短期）
  async setTypingStatus(roomId: string, userId: string): Promise<void> {
    const key = `messaging:typing:${roomId}:${userId}`;
    await this.redis.set(key, '1', TTL.FIVE_MINUTES);
  }
}
```

### 5. Payment Service - 支付服務

```typescript
// apps/payment-service/src/payment.service.ts

export class PaymentService {
  constructor(private readonly redis: RedisService) {}

  // 支付訂單（臨時）
  async storePendingPayment(orderId: string, data: object): Promise<void> {
    const key = `payment:pending:${orderId}`;
    await this.redis.set(key, JSON.stringify(data), TTL.THIRTY_MINUTES);
  }

  // 支付鎖（超短期）
  async acquirePaymentLock(orderId: string): Promise<boolean> {
    const key = `payment:lock:${orderId}`;
    const result = await this.redis.getClient().set(
      key,
      '1',
      'EX',
      TTL.FIVE_MINUTES,
      'NX'
    );
    return result === 'OK';
  }

  // 交易記錄快取（中期）
  async cacheTransactionHistory(userId: string, transactions: any[]): Promise<void> {
    const key = `payment:history:${userId}`;
    await this.redis.set(key, JSON.stringify(transactions), TTL.ONE_HOUR);
  }

  // 支付限流（短期計數器）
  async checkPaymentRateLimit(userId: string): Promise<boolean> {
    const key = `payment:rate_limit:${userId}`;
    const count = await this.redis.getClient().incr(key);
    if (count === 1) {
      await this.redis.expire(key, TTL.ONE_HOUR);
    }
    return count <= 10; // 每小時最多 10 筆交易
  }
}
```

### 6. Subscription Service - 訂閱服務

```typescript
// apps/subscription-service/src/subscription.service.ts

export class SubscriptionService {
  constructor(private readonly redis: RedisService) {}

  // 訂閱狀態快取（長期）
  async cacheSubscriptionStatus(userId: string, status: object): Promise<void> {
    const key = `subscription:status:${userId}`;
    await this.redis.set(key, JSON.stringify(status), TTL.ONE_DAY);
  }

  // 訂閱方案列表（靜態數據，長期）
  async cachePlans(plans: Plan[]): Promise<void> {
    const key = 'subscription:plans';
    await this.redis.set(key, JSON.stringify(plans), TTL.ONE_WEEK);
  }

  // 試用期標記（長期）
  async markTrialUsed(userId: string): Promise<void> {
    const key = `subscription:trial_used:${userId}`;
    await this.redis.set(key, '1', TTL.ONE_MONTH);
  }
}
```

### 7. Notification Service - 通知服務

```typescript
// apps/notification-service/src/notification.service.ts

export class NotificationService {
  constructor(private readonly redis: RedisService) {}

  // 通知列表（短期）
  async cacheNotifications(userId: string, notifications: Notification[]): Promise<void> {
    const key = `notification:list:${userId}`;
    await this.redis.set(key, JSON.stringify(notifications), TTL.FIFTEEN_MINUTES);
  }

  // 未讀通知計數（中期）
  async incrementUnreadCount(userId: string): Promise<void> {
    const key = `notification:unread:${userId}`;
    await this.redis.getClient().incr(key);
    await this.redis.expire(key, TTL.ONE_DAY);
  }

  // 推送 Token（長期）
  async storePushToken(userId: string, token: string): Promise<void> {
    const key = `notification:push_token:${userId}`;
    await this.redis.set(key, token, TTL.ONE_MONTH);
  }

  // 通知去重（短期）
  async markNotificationSent(userId: string, notificationId: string): Promise<void> {
    const key = `notification:sent:${userId}:${notificationId}`;
    await this.redis.set(key, '1', TTL.ONE_HOUR);
  }
}
```

## RedisService 改進

### 當前實作

```typescript
// libs/redis/src/redis.service.ts

/** Set key with optional TTL (seconds). Defaults to 24h if ttlSeconds not provided. */
async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const ttl = ttlSeconds ?? 86400; // default 24h
  await this.client.setex(key, ttl, value);
}

/** Set key with no expiry — use sparingly for data that must persist */
async setPermanent(key: string, value: string): Promise<void> {
  await this.client.set(key, value);
}
```

### 建議改進

```typescript
// libs/redis/src/redis.service.ts

import { TTL } from './constants/ttl';

export class RedisService {
  // ... existing code ...

  /**
   * Set key with TTL. 
   * ALWAYS requires TTL for safety - no permanent keys by default.
   */
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) {
      throw new Error('TTL must be positive. Use setPermanent() for no expiry.');
    }
    await this.client.setex(key, ttlSeconds, value);
  }

  /**
   * Set JSON object with TTL.
   */
  async setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  /**
   * Get and parse JSON object.
   */
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    return RedisService.tryParseJson<T>(raw);
  }

  /**
   * Set key with no expiry.
   * ⚠️ Use sparingly - only for truly permanent data.
   * Consider using a long TTL instead (e.g., TTL.ONE_MONTH).
   */
  async setPermanent(key: string, value: string): Promise<void> {
    console.warn(`[Redis] Setting permanent key: ${key}`);
    await this.client.set(key, value);
  }

  /**
   * Set key with TTL if not exists (atomic).
   * Useful for distributed locks or rate limiting.
   */
  async setNX(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /**
   * Refresh TTL on existing key.
   */
  async refreshTTL(key: string, ttlSeconds: number): Promise<boolean> {
    return (await this.client.expire(key, ttlSeconds)) === 1;
  }

  /**
   * Get remaining TTL (seconds).
   * Returns -1 if key has no expiry, -2 if key doesn't exist.
   */
  async getTTL(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /**
   * Set with pattern-based auto-TTL.
   * Automatically determines TTL based on key prefix.
   */
  async setAuto(key: string, value: string): Promise<void> {
    const ttl = this.determineTTL(key);
    await this.set(key, value, ttl);
  }

  /**
   * Determine TTL based on key pattern.
   */
  private determineTTL(key: string): number {
    if (key.startsWith('auth:access_token:')) return TTL.ONE_HOUR;
    if (key.startsWith('auth:refresh_token:')) return TTL.ONE_WEEK;
    if (key.startsWith('auth:verification:')) return TTL.FIFTEEN_MINUTES;
    if (key.startsWith('user:profile:')) return TTL.ONE_HOUR;
    if (key.startsWith('user:list:')) return TTL.FIVE_MINUTES;
    if (key.startsWith('matching:recommendations:')) return TTL.FIFTEEN_MINUTES;
    if (key.startsWith('messaging:typing:')) return TTL.FIVE_MINUTES;
    
    // Default TTL
    return TTL.ONE_HOUR;
  }
}
```

## 監控和告警

### 1. TTL 監控指標

```typescript
// libs/redis/src/redis-monitoring.service.ts

export class RedisMonitoringService {
  constructor(private readonly redis: RedisService) {}

  /**
   * 檢查沒有設置 TTL 的 key 數量
   */
  async checkKeysWithoutTTL(): Promise<{ count: number; keys: string[] }> {
    const allKeys = await this.redis.scan('*');
    const keysWithoutTTL: string[] = [];

    for (const key of allKeys) {
      const ttl = await this.redis.getTTL(key);
      if (ttl === -1) { // -1 表示沒有設置過期時間
        keysWithoutTTL.push(key);
      }
    }

    return {
      count: keysWithoutTTL.length,
      keys: keysWithoutTTL,
    };
  }

  /**
   * 獲取 TTL 分佈統計
   */
  async getTTLDistribution(): Promise<Record<string, number>> {
    const allKeys = await this.redis.scan('*');
    const distribution: Record<string, number> = {
      'no_ttl': 0,
      'expired': 0,
      '< 1min': 0,
      '1-5min': 0,
      '5-30min': 0,
      '30min-1h': 0,
      '1h-1day': 0,
      '> 1day': 0,
    };

    for (const key of allKeys) {
      const ttl = await this.redis.getTTL(key);
      
      if (ttl === -2) distribution['expired']++;
      else if (ttl === -1) distribution['no_ttl']++;
      else if (ttl < 60) distribution['< 1min']++;
      else if (ttl < 300) distribution['1-5min']++;
      else if (ttl < 1800) distribution['5-30min']++;
      else if (ttl < 3600) distribution['30min-1h']++;
      else if (ttl < 86400) distribution['1h-1day']++;
      else distribution['> 1day']++;
    }

    return distribution;
  }
}
```

### 2. Prometheus 指標

```typescript
// apps/api-gateway/src/metrics/redis.metrics.ts

import { Counter, Gauge } from 'prom-client';

export const redisKeysWithoutTTL = new Gauge({
  name: 'redis_keys_without_ttl',
  help: 'Number of Redis keys without TTL',
});

export const redisCacheHitRate = new Gauge({
  name: 'redis_cache_hit_rate',
  help: 'Redis cache hit rate',
  labelNames: ['service', 'operation'],
});

export const redisMemoryUsage = new Gauge({
  name: 'redis_memory_usage_bytes',
  help: 'Redis memory usage in bytes',
});
```

### 3. 定期檢查任務

```typescript
// apps/api-gateway/src/tasks/redis-health-check.task.ts

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RedisHealthCheckTask {
  constructor(
    private readonly monitoringService: RedisMonitoringService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkRedisHealth(): Promise<void> {
    // 檢查沒有 TTL 的 key
    const { count, keys } = await this.monitoringService.checkKeysWithoutTTL();
    
    if (count > 100) {
      console.warn(`⚠️ Found ${count} keys without TTL`);
      console.warn('Keys:', keys.slice(0, 10)); // 只顯示前 10 個
      
      // 發送告警
      // await this.alertService.send({
      //   severity: 'warning',
      //   message: `Redis has ${count} keys without TTL`,
      // });
    }

    // 檢查記憶體使用
    const memoryInfo = await this.redis.getClient().info('memory');
    console.log('[Redis Health] Memory usage:', memoryInfo);
  }
}
```

## 最佳實踐

### ✅ DO（推薦做法）

1. **永遠設置 TTL**
   ```typescript
   // ✅ Good
   await redis.set('user:profile:123', data, TTL.ONE_HOUR);
   
   // ❌ Bad
   await redis.setPermanent('user:profile:123', data);
   ```

2. **使用語意化的 TTL 常量**
   ```typescript
   // ✅ Good
   await redis.set(key, value, TTL.FIFTEEN_MINUTES);
   
   // ❌ Bad
   await redis.set(key, value, 900);
   ```

3. **根據數據類型選擇合適的 TTL**
   ```typescript
   // ✅ Good
   await redis.set('auth:token:123', token, TTL.ONE_WEEK);
   await redis.set('cache:list:users', list, TTL.FIVE_MINUTES);
   
   // ❌ Bad
   await redis.set('auth:token:123', token, TTL.FIVE_MINUTES); // Too short
   await redis.set('cache:list:users', list, TTL.ONE_WEEK);    // Too long
   ```

4. **使用命名空間和一致的 key 格式**
   ```typescript
   // ✅ Good
   const key = `user:profile:${userId}`;
   const key = `matching:recommendations:${userId}`;
   
   // ❌ Bad
   const key = userId; // 沒有命名空間
   const key = `${userId}_profile`; // 格式不一致
   ```

5. **監控沒有 TTL 的 key**
   ```typescript
   // 定期檢查
   const keysWithoutTTL = await monitoringService.checkKeysWithoutTTL();
   if (keysWithoutTTL.count > 0) {
     console.warn('Found keys without TTL:', keysWithoutTTL.keys);
   }
   ```

6. **使用 JSON 包裝複雜數據**
   ```typescript
   // ✅ Good
   await redis.setJson('user:profile:123', { name, age, email }, TTL.ONE_HOUR);
   const profile = await redis.getJson<UserProfile>('user:profile:123');
   
   // ❌ Bad
   await redis.set('user:name:123', name, TTL.ONE_HOUR);
   await redis.set('user:age:123', age, TTL.ONE_HOUR);
   await redis.set('user:email:123', email, TTL.ONE_HOUR);
   ```

### ❌ DON'T（避免做法）

1. **不要使用過長的 TTL**
   ```typescript
   // ❌ Bad
   await redis.set(key, value, 365 * 24 * 60 * 60); // 1年
   ```

2. **不要忘記刷新活躍數據的 TTL**
   ```typescript
   // ❌ Bad - Session 會過期
   const session = await redis.get(`session:${sessionId}`);
   // 使用 session...
   
   // ✅ Good - 刷新 TTL
   const session = await redis.get(`session:${sessionId}`);
   await redis.refreshTTL(`session:${sessionId}`, TTL.THREE_DAYS);
   ```

3. **不要對所有數據使用相同的 TTL**
   ```typescript
   // ❌ Bad
   const DEFAULT_TTL = 3600;
   await redis.set('auth:token', token, DEFAULT_TTL);
   await redis.set('cache:list', list, DEFAULT_TTL);
   await redis.set('user:profile', profile, DEFAULT_TTL);
   ```

4. **不要將 Redis 當作永久存儲**
   ```typescript
   // ❌ Bad - 應該存在資料庫
   await redis.setPermanent('user:settings:123', settings);
   
   // ✅ Good - 資料庫 + 快取
   await db.saveUserSettings(userId, settings);
   await redis.set(`user:settings:${userId}`, settings, TTL.ONE_DAY);
   ```

## 遷移計劃

### 步驟 1：審查現有代碼

```bash
# 搜尋所有沒有 TTL 的 Redis 寫入
grep -r "setPermanent" apps/
grep -r "set.*key.*value\s*\)" apps/
```

### 步驟 2：添加 TTL 常量

```typescript
// libs/redis/src/constants/ttl.ts
export const TTL = {
  // ... (如上定義)
};
```

### 步驟 3：更新服務代碼

逐個服務添加適當的 TTL：
1. ✅ Auth Service
2. ✅ User Service
3. ✅ Matching Service
4. ✅ Messaging Service
5. ✅ Payment Service
6. ✅ Subscription Service
7. ✅ Notification Service

### 步驟 4：添加監控

```typescript
// 添加健康檢查任務
import { RedisHealthCheckTask } from './tasks/redis-health-check.task';
```

### 步驟 5：測試和驗證

```bash
# 運行測試
npm run test

# 檢查 Redis key 數量和記憶體使用
docker exec suggar-daddy-redis-master redis-cli DBSIZE
docker exec suggar-daddy-redis-master redis-cli INFO memory
```

## 參考資源

- [Redis Expire Command](https://redis.io/commands/expire/)
- [Redis Key Eviction](https://redis.io/docs/manual/eviction/)
- [Redis Best Practices - Expiration](https://redis.io/docs/manual/patterns/distributed-locks/)

---

**文檔版本：** 1.0  
**最後更新：** 2024-01-XX  
**維護者：** Backend Team
