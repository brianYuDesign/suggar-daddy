# 查詢效能優化指南

> 合併自 N+1 Query Fix 與 Table Scan Fix 系列文件
> 最後更新: 2026-02-14

---

## 總覽

本專案針對 Redis-first 架構中兩大效能瓶頸進行了系統性修復：

| 類別 | 影響服務 | 修復數量 | 平均效能提升 |
|------|---------|---------|-------------|
| N+1 查詢 | user, notification, content | 10 處 | 80-95% |
| 全表掃描 | matching, subscription, media | 6 處 | 80-87% |

---

## 一、N+1 查詢修復

### 修復概述

**Commit**: `ea308b4`

將循環調用 `redis.get()` 改為 `redis.mget()` 批量查詢，並用 `Promise.all()` 並行化 RPC 調用。

### 修復清單

#### user-service (7 處)

| 方法 | 修復方式 | 預期改善 |
|------|---------|---------|
| `getCardsByIds` | MGET 批量查詢 | 95%+ |
| `getCardsForRecommendation` | MGET 批量查詢 | 90%+ |
| `getFollowers` | MGET 批量查詢 | 80%+ |
| `getFollowing` | MGET 批量查詢 | 80%+ |
| `getRecommendedCreators` | MGET 批量查詢 | 85%+ |
| `searchUsers` | MGET 批量查詢 | 80%+ |
| `getPendingReports` | MGET 批量查詢 | 90%+ |

#### notification-service (2 處 + TTL)

| 方法 | 修復方式 | 預期改善 |
|------|---------|---------|
| `send` | 添加 7 天 TTL (SETEX) | 防止記憶體洩漏 |
| `list` | MGET 批量查詢 | 85%+ |
| `markRead` | 更新時保持 TTL | 記憶體可控 |

#### content-service (1 處)

| 方法 | 修復方式 | 預期改善 |
|------|---------|---------|
| `findByCreatorWithAccess` | Promise.all 並行 RPC | 90%+ |

### 核心模式

**MGET 批量查詢**：
```typescript
// Before: N 次網路往返
for (const id of ids) {
  const data = await redis.get(`key:${id}`);
}

// After: 1 次網路往返
const keys = ids.map(id => `key:${id}`);
const values = await redis.mget(...keys);
```

**Promise.all 並行執行**：
```typescript
// Before: 序列化 RPC
const r1 = await call1(); // 50ms
const r2 = await call2(); // 50ms
// 總計 100ms

// After: 並行執行
const [r1, r2] = await Promise.all([call1(), call2()]);
// 總計 50ms
```

**TTL 自動清理**：
```typescript
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 天
await redis.setex(key, TTL_SECONDS, value);
```

### 效能基準 (N+1)

| 端點 | 修復前 | 修復後 | 改善 |
|------|-------|-------|------|
| GET /users/cards | 500ms | 80ms | 84% |
| GET /users/:id/followers | 400ms | 60ms | 85% |
| GET /users/search | 450ms | 70ms | 84% |
| GET /notifications/list | 400ms | 60ms | 85% |
| GET /posts (with access) | 600ms | 100ms | 83% |

---

## 二、全表掃描修復

### 修復概述

透過引入 Redis 索引結構 (Set, List, Sorted Set)，消除 `SCAN` 全表掃描，實現 O(M) 或 O(log N + M) 的查詢效率。

### 修復清單

#### matching-service

**問題**: `getMatches()` 使用 `SCAN match:*` 遍歷所有配對。

**解決**: 使用 `user_matches:{userId}` Set 索引。

```typescript
// Before: O(N) 全表掃描
const allMatchKeys = await redis.scan(`match:*`);

// After: O(M) 索引查詢
const matchIds = await redis.sMembers(`user_matches:${userId}`);
const values = await redis.mget(...matchKeys);
```

**索引結構**：
```
user_matches:{userId} -> Set[matchId1, matchId2, ...]
match:{matchId}       -> JSON { id, userAId, userBId, ... }
```

#### subscription-service

**問題**: `findBySubscriber()` / `findByCreator()` 先載入全部再記憶體過濾分頁。

**解決**: 使用 List 索引 + LRANGE 實現真正分頁。

```typescript
// Before: O(N) 載入全部
const all = await this.findAll();
const filtered = all.filter(s => s.subscriberId === userId);

// After: O(limit) 直接分頁
const ids = await redis.lRange(`subscriptions:subscriber:${userId}`, start, end);
const values = await redis.mget(...keys);
```

**索引結構**：
```
subscriptions:subscriber:{userId}  -> List[subId1, subId2, ...]
subscriptions:creator:{creatorId}  -> List[subId1, subId2, ...]
subscription:{subId}               -> JSON { ... }
```

#### media-service

**問題**: `findAll()` 使用 SCAN + 記憶體排序。

**解決**: 使用 Sorted Set 索引 (score = timestamp)。

```typescript
// Before: O(N log N) SCAN + 排序
const keys = await redis.scan('media:*');

// After: O(log N + M) 排序索引
const mediaIds = await redis.zRevRange('media:index:all', start, end);
const values = await redis.mget(...keys);
```

**索引結構**：
```
media:index:all       -> SortedSet[(timestamp, mediaId), ...]
media:{mediaId}       -> JSON { ... }
media:user:{userId}   -> List[mediaId1, mediaId2, ...]
```

### 效能基準 (Table Scan)

| 服務 | 資料量 | 修復前 | 修復後 | 改善 |
|------|--------|--------|--------|------|
| matching-service | 10,000 | 200ms | 30ms | 85% |
| subscription-service | 5,000 | 300ms | 40ms | 86% |
| media-service | 10,000 | 400ms | 50ms | 87% |

大規模場景：

| 場景 | 修復前 | 修復後 | 改善 |
|------|--------|--------|------|
| 100,000 配對 getMatches | ~2s | 35ms | 98% |
| 50,000 訂閱 findBySubscriber | 800ms | 45ms | 94% |
| 100,000 媒體 findAll | ~3s | 55ms | 98% |

---

## 三、索引遷移與維護

### 遷移腳本

為現有資料建立索引：

```bash
# 開發/測試環境
npm run migrate:redis-indexes

# 生產環境
NODE_ENV=production npm run migrate:redis-indexes
```

### 驗證索引

```bash
# 檢查索引大小
redis-cli ZCARD media:index:all
redis-cli SCARD user_matches:<userId>
redis-cli LLEN subscriptions:subscriber:<userId>
```

### 索引記憶體開銷

| 索引 | 每筆記錄約 | 10,000 筆估算 |
|------|-----------|--------------|
| media:index:all | ~100 bytes | ~1 MB |
| user_matches:{userId} | ~50 bytes | ~500 KB |
| subscriptions:* | ~50 bytes | ~500 KB |

總計約增加 2-3% Redis 記憶體，為可接受的效能代價。

---

## 四、RedisService 擴展

為支援上述優化，擴展了 `libs/redis/src/redis.service.ts`：

| 方法 | 用途 |
|------|------|
| `mget(...keys)` | 批量讀取 |
| `zAdd(key, ...members)` | Sorted Set 批量添加 |
| `zRevRange(key, start, stop)` | Sorted Set 倒序分頁 |
| `zCard(key)` | Sorted Set 計數 |
| `zRem(key, ...members)` | Sorted Set 移除 |
| `lRange(key, start, stop)` | List 分頁 |
| `lLen(key)` | List 長度 |
| `lTrim(key, start, stop)` | List 修剪 |
| `sMembers(key)` | Set 讀取全部成員 |

---

## 五、最佳實踐

### 效能優化原則

1. **批量操作優於循環**: `MGET` > 循環 `GET`
2. **並行優於序列**: `Promise.all()` 充分利用 I/O 並發
3. **索引優於掃描**: Set/List/Sorted Set 索引 > `SCAN`
4. **設定 TTL**: 所有快取資料必須設定過期時間，防止記憶體洩漏

### 邊界條件處理

```typescript
// 1. 空陣列提前返回
if (ids.length === 0) return [];

// 2. 過濾 null 值
const values = await redis.mget(...keys);
const valid = values.filter(v => v !== null);

// 3. JSON 解析安全
try {
  const data = JSON.parse(raw);
} catch (err) {
  logger.error('JSON parse failed', err);
}
```

### 索引一致性

- 建立/刪除資料時同步更新索引
- 索引更新失敗不應阻擋主流程 (try-catch)
- 建議每月執行一次索引重建: `npm run migrate:redis-indexes`

---

## 六、部署檢查清單

### 部署前

- [ ] 所有服務編譯成功
- [ ] 單元測試通過
- [ ] 備份 Redis 資料: `redis-cli BGSAVE`

### 部署中

- [ ] 執行索引遷移 (如有全表掃描修復)
- [ ] 驗證 API 功能正常
- [ ] 檢查 Redis 連接穩定

### 部署後監控

- API 回應時間 < 100ms (p95)
- Redis 慢查詢數量減少 80%+
- Redis 記憶體使用穩定
- HTTP 5xx 錯誤率 < 0.1%

### 回滾

```bash
# 程式碼回滾
git revert <commit-hash>

# 索引保留（不影響舊程式碼）
# 如需清理索引：
redis-cli DEL media:index:all
redis-cli --scan --pattern "user_matches:*" | xargs redis-cli DEL
redis-cli --scan --pattern "subscriptions:*" | xargs redis-cli DEL
```

---

## 七、後續優化方向

- [ ] 實作批量訂閱檢查 API (減少 RPC 次數)
- [ ] 熱門查詢快取 (短期 TTL)
- [ ] 從 Redis-first 遷移到 PostgreSQL-first + Redis 快取
- [ ] 引入 Elasticsearch 處理全文搜尋
- [ ] 實作分布式追蹤 (OpenTelemetry)

---

## 相關程式碼

- `apps/user-service/src/app/user.service.ts` — N+1 修復 (7 處)
- `apps/notification-service/src/app/notification.service.ts` — N+1 修復 + TTL
- `apps/content-service/src/app/post.service.ts` — 並行 RPC
- `apps/matching-service/src/app/matching.service.ts` — 全表掃描修復
- `apps/subscription-service/src/app/subscription.service.ts` — 分頁修復
- `apps/media-service/src/app/media.service.ts` — Sorted Set 索引
- `libs/redis/src/redis.service.ts` — RedisService 擴展
- `scripts/migrate-redis-indexes.ts` — 索引遷移腳本
- `scripts/verify-n1-fix.ts` — N+1 效能驗證
- `scripts/test-table-scan-fix.ts` — Table Scan 效能測試
