# 📚 FAQ & 知識庫 - 常見問題和最佳實踐

## 目錄
1. [FAQ - 常見問題](#faq-常見問題)
2. [最佳實踐](#最佳實踐)
3. [決策文檔](#決策文檔)
4. [案例分析](#案例分析)
5. [調試指南](#調試指南)

---

## FAQ - 常見問題

### 快速檢索

```
【環境和安裝】
  Q1: 如何安裝依賴？
  Q2: 如何配置環境變數？
  Q3: Docker Compose 無法啟動？
  Q4: 端口 3000 已被占用？

【功能和使用】
  Q5: 推薦 API 返回空結果？
  Q6: 推薦結果質量不好？
  Q7: 如何記錄用戶互動？
  Q8: 如何更新推薦權重？

【性能和優化】
  Q9: 推薦 API 響應慢？
  Q10: Redis 內存使用很高？
  Q11: 數據庫查詢慢？
  Q12: 如何進行性能測試？

【故障排查】
  Q13: API 返回 500 錯誤？
  Q14: 無法連接數據庫？
  Q15: 無法連接 Redis？
  Q16: 服務突然宕機？

【部署和運維】
  Q17: 如何升級應用？
  Q18: 如何進行數據庫備份？
  Q19: 如何進行金絲雀部署？
  Q20: 如何監控系統健康狀態？
```

---

## 環境和安裝

### Q1: 如何安裝依賴？

**場景**: 第一次使用或 package.json 有更新

**解決方案**:

```bash
# 清空舊依賴（推薦做法）
rm -rf node_modules package-lock.json

# 安裝新依賴
npm install

# 驗證安裝成功
npm list | head -20

# 如果有警告，檢查兼容性
npm audit
```

**常見問題**:
- 依賴衝突: `npm install --legacy-peer-deps`
- 安裝很慢: 切換 npm 源 `npm config set registry https://registry.npm.taobao.org`
- 磁盤空間不足: 清理 npm 緩存 `npm cache clean --force`

---

### Q2: 如何配置環境變數？

**場景**: 第一次啟動或切換環境

**解決方案**:

```bash
# 1. 複製配置文件
cp .env.example .env.dev

# 2. 編輯 .env.dev
nano .env.dev

# 3. 關鍵變數檢查
NODE_ENV=development
PORT=3000
DATABASE_HOST=localhost  # 或 postgres (Docker)
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=recommendation_db
REDIS_HOST=localhost     # 或 redis (Docker)
REDIS_PORT=6379
RECOMMENDATION_CACHE_TTL=3600

# 4. 啟動服務時加載
export NODE_ENV=development
npm run dev
```

**環境變數說明**:

| 變數 | 開發值 | 生產值 | 說明 |
|------|-------|-------|------|
| `NODE_ENV` | development | production | 運行環境 |
| `PORT` | 3000 | 3000 | 應用端口 |
| `LOG_LEVEL` | debug | info | 日誌級別 |
| `DATABASE_POOL_SIZE` | 5 | 20 | 連接池大小 |
| `REDIS_POOL_SIZE` | 5 | 10 | Redis 連接池 |

---

### Q3: Docker Compose 無法啟動？

**症狀**: `docker-compose up -d` 失敗

**排查步驟**:

```bash
# 1. 檢查 Docker 守護進程
docker ps
# 如果報錯，啟動 Docker
open -a Docker  # macOS
sudo service docker start  # Linux

# 2. 檢查 docker-compose 版本
docker-compose --version
# 需要 >= 1.29.0

# 3. 檢查 yaml 文件語法
docker-compose config | head -20

# 4. 查看完整日誌
docker-compose up -d
docker-compose logs

# 5. 常見原因和解決
錯誤: "Cannot connect to Docker daemon"
解決: sudo docker-compose up -d

錯誤: "port is already allocated"
解決: 見 Q4

錯誤: "no space left on device"
解決: docker system prune -a  # 清理 Docker 磁盤
```

**預防措施**:

```bash
# 定期清理 Docker 資源
docker system prune -a --volumes  # 危險：會刪除所有數據

# 更安全的清理
docker system prune  # 只清理未使用的資源
docker volume prune  # 只清理未使用的卷
```

---

### Q4: 端口 3000 已被占用？

**症狀**: `listen EADDRINUSE :::3000`

**解決方案**:

```bash
# 方案 1: 查看佔用進程（推薦）
lsof -i :3000
# 輸出: node  12345  user  12u  IPv6  ...

# 殺死進程
kill -9 12345

# 驗證端口已釋放
lsof -i :3000  # 應該返回空

# 方案 2: 使用其他端口
export PORT=3001
npm run dev

# 方案 3: 強制 Docker 使用新端口
# 編輯 docker-compose.yml
services:
  recommendation-service:
    ports:
      - "3001:3000"  # 改成 3001

docker-compose restart recommendation-service
```

**預防措施**:

```bash
# 使用 nodemon 自動重啟（開發時）
npm run dev  # 自動檢測文件變化

# 配置隨機端口（測試時）
PORT=0 npm test  # 操作系統自動分配
```

---

## 功能和使用

### Q5: 推薦 API 返回空結果？

**症狀**: `GET /api/recommendations/user-123` 返回 `"recommendations": []`

**可能原因**:

1. **用戶尚無互動記錄**
   ```bash
   # 先記錄互動
   curl -X POST http://localhost:3000/api/recommendations/interactions \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "user-123",
       "content_id": "content-1",
       "interaction_type": "like"
     }'
   
   # 等待 30 秒後重試
   sleep 30
   curl http://localhost:3000/api/recommendations/user-123
   ```

2. **系統中沒有足夠的內容**
   ```bash
   # 檢查內容數量
   curl http://localhost:3000/api/contents
   
   # 如果為空，創建測試內容
   curl -X POST http://localhost:3000/api/contents \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Test Content",
       "description": "Test",
       "creator_id": "creator-1",
       "tags": ["test", "demo"]
     }'
   ```

3. **推薦算法過於嚴格**
   ```bash
   # 降低推薦閾值（編輯 recommendation.service.ts）
   const MIN_SCORE = 0.1;  // 從 0.5 改為 0.1
   
   # 或增加推薦數量
   const DEFAULT_LIMIT = 100;  // 增加到 100，篩選回 20
   ```

4. **快取問題**
   ```bash
   # 清空快取並重新計算
   curl -X POST http://localhost:3000/api/recommendations/clear-cache
   
   # 更新分數
   curl -X POST http://localhost:3000/api/recommendations/update-scores
   
   # 重新獲取
   curl http://localhost:3000/api/recommendations/user-123?limit=50
   ```

**驗證步驟**:

```bash
# 1. 檢查用戶是否存在
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  SELECT * FROM users WHERE id = 'user-123';"

# 2. 檢查互動是否記錄
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  SELECT * FROM user_interactions WHERE user_id = 'user-123';"

# 3. 檢查內容是否存在
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  SELECT COUNT(*) FROM contents;"

# 4. 檢查標籤匹配
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  SELECT * FROM content_tags LIMIT 5;"

# 5. 查看應用日誌
docker-compose logs recommendation-service | grep -i recommend
```

---

### Q6: 推薦結果質量不好？

**症狀**: 推薦的內容與用戶興趣不符、重複、過時

**根本原因和解決**:

| 現象 | 原因 | 解決方案 |
|------|------|--------|
| 結果都是舊內容 | 新鮮度權重過低 | 增加 `FRESHNESS: 0.25 → 0.35` |
| 結果缺乏個性 | 興趣匹配權重過低 | 增加 `INTEREST_MATCH: 0.35 → 0.45` |
| 結果重複 | 快取未更新 | 清空快取並刷新 |
| 推薦數量少 | 閾值過高 | 降低 `MIN_SCORE: 0.5 → 0.3` |
| 結果太隨機 | 隨機因子過高 | 降低 `RANDOM_RATIO: 0.2 → 0.1` |

**調優步驟**:

```bash
# 1. 分析當前權重配置
cat src/services/recommendation.service.ts | grep -A 5 "WEIGHTS\|HALF_LIFE"

# 2. 修改權重並重啟
# 編輯 src/services/recommendation.service.ts
const WEIGHTS = {
  ENGAGEMENT: 0.35,        # 降低熱度權重
  INTEREST_MATCH: 0.45,    # 提高興趣匹配
  FRESHNESS: 0.35,         # 提高新鮮度
};

# 3. 重新編譯
npm run build

# 4. 重啟服務
docker-compose restart recommendation-service

# 5. 測試新配置
curl http://localhost:3000/api/recommendations/user-123

# 6. A/B 測試（可選）
# 10% 用戶使用新配置，90% 使用舊配置
# 比較推薦點擊率
```

**衡量推薦質量的指標**:

```bash
# 1. 推薦多樣性（應 > 0.7）
多樣性 = 不同標籤數 / 總推薦數

# 2. 點擊率（應 > 5%）
CTR = 點擊數 / 展示數

# 3. 新鮮度（應 > 20% 是 < 7 天的內容）
新鮮度 = 新內容推薦數 / 總推薦數

# 4. 準確率（應 > 70%）
準確率 = 用戶點讚 / 總推薦數
```

---

### Q7: 如何記錄用戶互動？

**場景**: 用戶點讚、觀看、分享內容

**解決方案**:

```bash
# 1. 點讚（權重: 5）
curl -X POST http://localhost:3000/api/recommendations/interactions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "content_id": "content-abc",
    "interaction_type": "like"
  }'

# 2. 觀看（權重: 1）
curl -X POST http://localhost:3000/api/recommendations/interactions \
  -d '{
    "user_id": "user-123",
    "content_id": "content-abc",
    "interaction_type": "view"
  }'

# 3. 分享（權重: 8）
curl -X POST http://localhost:3000/api/recommendations/interactions \
  -d '{
    "user_id": "user-123",
    "content_id": "content-abc",
    "interaction_type": "share"
  }'

# 4. 評論（權重: 3）
curl -X POST http://localhost:3000/api/recommendations/interactions \
  -d '{
    "user_id": "user-123",
    "content_id": "content-abc",
    "interaction_type": "comment"
  }'

# 5. 跳過（權重: -1，負面信號）
curl -X POST http://localhost:3000/api/recommendations/interactions \
  -d '{
    "user_id": "user-123",
    "content_id": "content-abc",
    "interaction_type": "skip"
  }'
```

**權重配置** (見 recommendation.service.ts):

```typescript
const INTERACTION_WEIGHTS = {
  view: 1,
  like: 5,
  share: 8,
  comment: 3,
  skip: -1,
};
```

**批量記錄互動** (性能考慮):

```bash
# 而不是逐個調用，可以批量記錄
# 每 10-100 個互動批量提交一次

# 客戶端可以緩衝互動並定期批量上報
setInterval(() => {
  if (interactions.length > 0) {
    interactions.forEach(interaction => {
      fetch('/api/recommendations/interactions', {
        method: 'POST',
        body: JSON.stringify(interaction)
      });
    });
    interactions = [];
  }
}, 60000);  // 每分鐘批量上報
```

---

### Q8: 如何更新推薦權重？

**場景**: 需要調整算法以改進推薦質量

**步驟**:

```bash
# 1. 檢查當前權重
grep -n "WEIGHTS\|FRESHNESS\|HALF_LIFE" src/services/recommendation.service.ts

# 2. 編輯權重配置
# 文件: src/services/recommendation.service.ts

# 當前配置
const WEIGHTS = {
  ENGAGEMENT: 0.4,
  INTEREST_MATCH: 0.35,
  FRESHNESS: 0.25,
};

const FRESHNESS_HALF_LIFE = 72;  // 72 小時

# 改為（示例）
const WEIGHTS = {
  ENGAGEMENT: 0.35,      # 減少熱度權重
  INTEREST_MATCH: 0.40,  # 增加個性化
  FRESHNESS: 0.25,       # 保持新鮮度
};

const FRESHNESS_HALF_LIFE = 48;  # 減少半衰期，更推新內容

# 3. 編譯
npm run build

# 4. 重啟（會清空舊推薦快取）
docker-compose restart recommendation-service

# 5. 驗證新權重生效
curl http://localhost:3000/api/recommendations/user-123

# 6. 監控影響
# 在後續 1-2 週監控:
# - 推薦點擊率
# - 用戶反饋
# - 推薦多樣性
```

**權重調優指南**:

```
如果用戶說: "推薦都是舊內容"
  → 增加 FRESHNESS (0.25 → 0.35)
  → 或降低 FRESHNESS_HALF_LIFE (72 → 48)

如果用戶說: "推薦不符合我的興趣"
  → 增加 INTEREST_MATCH (0.35 → 0.45)

如果用戶說: "推薦質量很差"
  → 降低 RANDOM_RATIO (0.2 → 0.1)
  → 提高閾值 MIN_SCORE (0.3 → 0.5)

如果推薦點擊率下降
  → 回滾權重變化
  → git revert <commit>
  → docker-compose restart
```

**A/B 測試權重** (高級):

```typescript
// 為 10% 用戶啟用新權重
const useNewWeights = Math.random() < 0.1;

const WEIGHTS = useNewWeights ? {
  ENGAGEMENT: 0.35,
  INTEREST_MATCH: 0.40,
  FRESHNESS: 0.25,
} : {
  ENGAGEMENT: 0.4,
  INTEREST_MATCH: 0.35,
  FRESHNESS: 0.25,
};

// 記錄用戶組以便後續分析
console.log(`User ${userId} using ${useNewWeights ? 'new' : 'old'} weights`);
```

---

## 性能和優化

### Q9: 推薦 API 響應慢？

**症狀**: `GET /api/recommendations/user-123` 耗時 > 500ms

**診斷步驟**:

```bash
# 1. 測量響應時間
curl -w "\n%{time_total}s\n" -o /dev/null http://localhost:3000/api/recommendations/user-123

# 2. 檢查快取命中率
docker-compose exec redis redis-cli INFO stats | grep "keyspace_hits\|keyspace_misses"

# 如果 hits < misses，說明快取效率差

# 3. 檢查數據庫查詢時間
docker-compose logs recommendation-service | grep -i "query\|duration"

# 4. 檢查系統資源
docker stats --no-stream

# CPU > 80% → 優化算法
# Memory > 600MB → 優化快取或數據結構
```

**根本原因和解決**:

| 原因 | 症狀 | 解決方案 |
|------|------|--------|
| 快取失效 | 響應 50ms→2s | 清空快取：`curl -X POST .../clear-cache` |
| 數據庫連接慢 | 數據庫查詢 > 200ms | 檢查連接池、添加索引 |
| 算法複雜度高 | CPU 使用高 | 優化排序、聚合邏輯 |
| N+1 查詢問題 | 多個小查詢 | 使用 JOIN 替代 |

**優化方案**:

```bash
# 方案 1: 增加快取 TTL（快速）
# 編輯 .env
RECOMMENDATION_CACHE_TTL=7200  # 1 小時 → 2 小時

# 方案 2: 優化數據庫查詢
# 添加索引
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  CREATE INDEX CONCURRENTLY idx_user_interests_user_id 
  ON user_interests(user_id);
  
  CREATE INDEX CONCURRENTLY idx_user_interactions_user_id 
  ON user_interactions(user_id);
  
  CREATE INDEX CONCURRENTLY idx_contents_engagement 
  ON contents(engagement_score DESC);"

# 方案 3: 優化推薦算法
# 減少計算量（例如，只考慮最近 100 個互動）
const recentInteractions = interactions.slice(-100);

# 方案 4: 增加伺服器資源
# 增加 CPU/Memory
# docker-compose.yml 中修改 deploy.resources
```

**性能基準測試**:

```bash
# 使用 Apache Bench 測試
ab -n 1000 -c 10 http://localhost:3000/api/recommendations/user-123

# 預期結果：
# Requests per second: 200+ (RPS)
# Mean time: < 500ms
# 95th percentile: < 1s

# 使用 wrk 進行更詳細的測試
wrk -t 4 -c 100 -d 30s http://localhost:3000/api/recommendations/user-123
```

---

### Q10: Redis 內存使用很高？

**症狀**: Redis 佔用 > 500MB 內存

**排查**:

```bash
# 1. 檢查 Redis 內存使用
docker-compose exec redis redis-cli INFO memory
# 輸出:
# used_memory_human: 512M
# used_memory_peak_human: 600M

# 2. 檢查 key 數量
docker-compose exec redis redis-cli DBSIZE
# Outputs: db0:100000  (10 萬個 key)

# 3. 檢查 key 大小分佈
docker-compose exec redis redis-cli --bigkeys
# 輸出最大的 key

# 4. 檢查 key 過期時間
docker-compose exec redis redis-cli --scan --pattern "rec:*" | head -20
# 查看快取 key 格式

# 5. 監控內存變化
watch -n 5 'docker-compose exec redis redis-cli INFO memory | grep used_memory'
```

**根本原因和解決**:

| 原因 | 症狀 | 解決方案 |
|------|------|--------|
| 快取 TTL 過長 | 10 萬+ key | 降低 TTL (3600 → 1800 秒) |
| 快取未正確過期 | 很多舊 key | 清空快取並重啟 |
| 內存洩漏 | 內存持續增長 | 檢查代碼是否正確使用 DEL |
| 用戶數太多 | 每個用戶一個 key | 改用其他快取策略 |

**解決方案**:

```bash
# 方案 1: 清空快取（立即釋放）
docker-compose exec redis redis-cli FLUSHALL

# 方案 2: 降低 TTL
# 編輯 .env
RECOMMENDATION_CACHE_TTL=1800  # 3600 → 1800 (秒)
docker-compose restart recommendation-service

# 方案 3: 設置 maxmemory 限制和淘汰策略
docker-compose exec redis redis-cli CONFIG SET maxmemory 1gb
docker-compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru

# 方案 4: 分區快取
# 只為活躍用戶快取推薦（最近 7 天有互動）

# 方案 5: 增加 Redis 內存
# docker-compose.yml 中增加 Redis 容器的內存限制
services:
  redis:
    deploy:
      resources:
        limits:
          memory: 2G
```

**預防措施**:

```bash
# 定期監控內存
docker-compose exec redis redis-cli INFO memory > logs/redis_memory.log

# 定期清理過期數據
docker-compose exec redis redis-cli --scan --pattern "*" --idle-time 3600 | xargs redis-cli DEL

# 設置告警
# 當內存 > 1GB 時發送告警
```

---

### Q11: 數據庫查詢慢？

**症狀**: `SELECT` 查詢耗時 > 100ms

**排查**:

```bash
# 1. 啟用慢查詢日誌
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  ALTER SYSTEM SET log_min_duration_statement = 100;
  SELECT pg_reload_conf();"

# 2. 查看慢查詢
docker-compose logs postgres | grep "duration:"

# 3. 分析查詢計劃
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  EXPLAIN ANALYZE 
  SELECT * FROM user_interests 
  WHERE user_id = 'user-123';"

# 4. 查看索引使用情況
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch 
  FROM pg_stat_user_indexes 
  ORDER BY idx_scan DESC;"

# 5. 查看表統計
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  SELECT relname, n_live_tup, n_dead_tup, last_vacuum 
  FROM pg_stat_user_tables 
  ORDER BY n_live_tup DESC;"
```

**根本原因和解決**:

| 原因 | 症狀 | 解決方案 |
|------|------|--------|
| 缺少索引 | Sequential Scan | 添加 B-tree 索引 |
| 統計信息過舊 | 次優的查詢計劃 | ANALYZE 表 |
| 表太大 | 全表掃描 | 分區或歸檔舊數據 |
| 連接耗盡 | 查詢排隊 | 增加 CONNECTION_POOL_SIZE |

**優化步驟**:

```bash
# 1. 分析查詢計劃
EXPLAIN ANALYZE SELECT * FROM user_interests WHERE user_id = 'user-123';

# 如果看到 "Seq Scan"，表示需要索引

# 2. 添加索引
CREATE INDEX CONCURRENTLY idx_user_interests_user_id 
ON user_interests(user_id);

# 3. 驗證索引被使用
EXPLAIN SELECT * FROM user_interests WHERE user_id = 'user-123';
# 應該看到 "Index Scan"

# 4. 更新統計信息
ANALYZE user_interests;

# 5. 定期維護
VACUUM ANALYZE;  # 回收空間並更新統計
```

**關鍵索引列表**:

```sql
-- 推薦查詢所需的索引
CREATE INDEX CONCURRENTLY idx_user_interests_user_id 
ON user_interests(user_id);

CREATE INDEX CONCURRENTLY idx_user_interactions_user_id 
ON user_interactions(user_id);

CREATE INDEX CONCURRENTLY idx_user_interactions_created_at 
ON user_interactions(created_at DESC);

CREATE INDEX CONCURRENTLY idx_contents_engagement_score 
ON contents(engagement_score DESC);

CREATE INDEX CONCURRENTLY idx_contents_created_at 
ON contents(created_at DESC);

CREATE INDEX CONCURRENTLY idx_content_tags_name 
ON content_tags(name);
```

---

### Q12: 如何進行性能測試？

**場景**: 評估系統容量、找出瓶頸

**步驟**:

```bash
# 1. 準備測試環境
# 確保使用真實數據（至少 1000 個用戶、10000 個內容）

# 2. 使用 Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/recommendations/user-123

# 輸出:
# Requests per second: 250 [#/sec] (mean)
# Time per request: 40 [ms] (mean)
# 95% 線: 150 [ms]

# 3. 使用 wrk（更高級）
wrk -t 4 -c 100 -d 30s http://localhost:3000/api/recommendations/user-123

# 輸出:
# Running 30s test @ http://localhost:3000/api/recommendations/user-123
#   4 threads and 100 connections
# Thread Stats   Avg      Stdev     Max   +/- Stdev
#   Latency   150.23ms   45.67ms 500.12ms   87.34%
#   Req/Sec   250.50     50.23   300.00     75.50%

# 4. 查看結果
# Latency P50 (平均): 150ms
# Latency P95: 250ms
# Latency P99: 350ms
# RPS (吞吐量): 250 req/sec

# 5. 漸進式增加並發
wrk -t 4 -c 10   -d 10s http://localhost:3000/api/recommendations/user-123
wrk -t 4 -c 50   -d 10s http://localhost:3000/api/recommendations/user-123
wrk -t 4 -c 100  -d 10s http://localhost:3000/api/recommendations/user-123
wrk -t 4 -c 200  -d 10s http://localhost:3000/api/recommendations/user-123
wrk -t 4 -c 500  -d 10s http://localhost:3000/api/recommendations/user-123

# 6. 記錄結果
# 找出性能開始下降的並發數（通常是 CPU 達到 80%）
```

**性能測試腳本**:

```bash
#!/bin/bash
# performance_test.sh

echo "Starting performance test..."

for concurrency in 10 50 100 200 500; do
  echo ""
  echo "Testing with concurrency: $concurrency"
  
  wrk -t 4 -c $concurrency -d 10s \
    http://localhost:3000/api/recommendations/user-123 \
    >> results/perf_$concurrency.txt
  
  echo "Results saved to results/perf_$concurrency.txt"
done

echo "Performance test complete!"
```

**性能基準**:

| 指標 | 目標 | 當前 | 狀態 |
|------|------|------|------|
| P50 延遲 | < 100ms | ? | 待測試 |
| P95 延遲 | < 250ms | ? | 待測試 |
| P99 延遲 | < 500ms | ? | 待測試 |
| RPS (1 執行 | > 100 | ? | 待測試 |
| RPS (100 並發) | > 50 | ? | 待測試 |

---

## 故障排查

### Q13: API 返回 500 錯誤？

**症狀**: 所有或某些 API 調用返回 `500 Internal Server Error`

**快速排查**:

```bash
# 1. 檢查應用是否運行
docker-compose ps recommendation-service
# 應該看到 "Up"

# 2. 查看應用日誌
docker-compose logs recommendation-service | tail -50
# 查找 ERROR, FATAL, panic

# 3. 重啟應用
docker-compose restart recommendation-service
sleep 10

# 4. 重新測試
curl http://localhost:3000/health

# 如果還是 500，見下面的詳細診斷
```

**詳細診斷**:

```bash
# 1. 檢查完整日誌堆棧
docker-compose logs --tail=200 recommendation-service > /tmp/logs.txt
cat /tmp/logs.txt | grep -A 10 "Error\|Exception"

# 常見錯誤:
# TypeError: Cannot read property 'id' of undefined
#   → 檢查 null/undefined 值

# ECONNREFUSED (connection refused)
#   → 檢查依賴服務（PostgreSQL、Redis）

# QueryFailedError
#   → 檢查數據庫連接和查詢語法

# 2. 檢查依賴服務
docker-compose ps postgres redis
# 都應該是 "Up"

# 3. 測試數據庫連接
docker-compose exec postgres psql -U postgres -d recommendation_db -c "SELECT 1;"
# 應該返回 1

# 4. 測試 Redis 連接
docker-compose exec redis redis-cli PING
# 應該返回 PONG

# 5. 查看系統資源（可能 OOM）
docker stats recommendation-service --no-stream

# 6. 檢查磁盤空間
df -h
# 如果接近 100%，數據庫可能無法寫入
```

**常見 500 錯誤原因**:

| 錯誤信息 | 原因 | 解決方案 |
|---------|------|--------|
| `connect ECONNREFUSED 127.0.0.1:5432` | PostgreSQL 未運行 | `docker-compose restart postgres` |
| `connect ECONNREFUSED 127.0.0.1:6379` | Redis 未運行 | `docker-compose restart redis` |
| `no space left on device` | 磁盤滿 | `docker system prune` |
| `FATAL: database ... does not exist` | 數據庫未初始化 | `npm run typeorm:run` |
| `TypeError: Cannot read property` | 代碼 bug | 檢查日誌，修復代碼 |

---

### Q14: 無法連接數據庫？

**症狀**: `ECONNREFUSED` 或 `FATAL: password authentication failed`

**排查**:

```bash
# 1. 檢查 PostgreSQL 容器
docker-compose ps postgres
# 應該是 "Up"，不是 "Exit" 或 "Exited"

# 2. 查看 PostgreSQL 日誌
docker-compose logs postgres | tail -30

# 常見日誌:
# FATAL:  Ident authentication failed
#   → 用戶名密碼不匹配

# could not connect to server
#   → 網絡問題或容器尚未啟動

# 3. 檢查連接信息
# 在應用中：
echo "Database URL: postgresql://$DATABASE_USER:$DATABASE_PASSWORD@$DATABASE_HOST:$DATABASE_PORT/$DATABASE_NAME"

# 4. 手動測試連接
docker-compose exec postgres psql \
  -U postgres \
  -h localhost \
  -d recommendation_db \
  -c "SELECT 1;"

# 如果報錯，見下面的具體解決方案
```

**根本原因和解決**:

| 原因 | 症狀 | 解決方案 |
|------|------|--------|
| 容器未啟動 | `docker ps` 中無 postgres | `docker-compose up -d postgres` |
| 用戶名/密碼錯誤 | "password authentication failed" | 檢查 .env 中的 DATABASE_USER/PASSWORD |
| 數據庫不存在 | "database ... does not exist" | `docker-compose exec postgres createdb -U postgres recommendation_db` |
| 表未創建 | "relation ... does not exist" | `npm run typeorm:run` |
| 網絡隔離 | 容器能啟動但連不上 | 檢查 docker-compose 網絡配置 |

**恢復步驟**:

```bash
# 1. 停止容器
docker-compose down

# 2. 刪除舊數據（謹慎！）
docker-compose down -v  # -v 刪除 volumes

# 3. 重新啟動
docker-compose up -d

# 4. 等待初始化（30 秒）
sleep 30

# 5. 驗證連接
docker-compose exec postgres psql -U postgres -d recommendation_db -c "SELECT 1;"

# 6. 重新啟動應用
docker-compose restart recommendation-service
```

---

### Q15: 無法連接 Redis？

**症狀**: `ECONNREFUSED` 或 Redis 超時

**排查**:

```bash
# 1. 檢查 Redis 容器
docker-compose ps redis
# 應該是 "Up"

# 2. 查看 Redis 日誌
docker-compose logs redis | tail -20

# 3. 手動測試連接
docker-compose exec redis redis-cli PING
# 應該返回 PONG

# 如果返回 "Could not connect"
docker-compose exec redis redis-cli -h redis PING

# 4. 檢查 Redis 連接信息
echo "Redis URL: redis://$REDIS_HOST:$REDIS_PORT"

# 5. 檢查防火牆（如果在遠程服務器）
telnet localhost 6379
# 應該連接成功
```

**根本原因和解決**:

| 原因 | 症狀 | 解決方案 |
|------|------|--------|
| 容器未啟動 | `docker ps` 中無 redis | `docker-compose up -d redis` |
| 端口被占用 | `bind: address already in use` | `lsof -i :6379` 並殺死進程 |
| 內存不足 | Redis 啟動後立即 Exit | 檢查系統內存 `free -h` |
| 網絡隔離 | 無法連接 | 使用容器名 `redis` 而非 `localhost` |

**恢復步驟**:

```bash
# 1. 清空並重啟 Redis
docker-compose restart redis
sleep 5

# 2. 驗證連接
docker-compose exec redis redis-cli PING

# 3. 清空快取（如果需要）
docker-compose exec redis redis-cli FLUSHALL

# 4. 重啟應用
docker-compose restart recommendation-service
```

---

### Q16: 服務突然宕機？

**症狀**: 服務正常運行，突然無法訪問

**應急響應** (5-10 分鐘):

```bash
# 1. 確認問題
curl http://localhost:3000/health  # 應返回 200

# 2. 查看容器狀態
docker-compose ps
# 如果看到 "Exit"，服務已崩潰

# 3. 查看應用日誌（最後 100 行）
docker-compose logs --tail=100 recommendation-service

# 4. 快速重啟
docker-compose restart recommendation-service
sleep 10

# 5. 驗證恢復
curl http://localhost:3000/health

# 6. 如果依然失敗，完整重建
docker-compose down
docker-compose up -d
sleep 30
curl http://localhost:3000/health
```

**根本原因分析** (之後進行):

```bash
# 1. 查看完整日誌
docker-compose logs recommendation-service > crash_logs.txt
cat crash_logs.txt | grep -i "error\|fatal\|panic\|oom\|killed"

# 可能的原因:
# OutOfMemory: 內存不足
#   → docker stats --no-stream
#   → 優化算法或增加內存

# Signal: Killed
#   → docker inspect recommendation-service | grep -i "oomkilled"
#   → 手動殺死（為什麼？）

# Database connection lost
#   → docker-compose restart postgres

# Redis connection lost
#   → docker-compose restart redis

# 2. 檢查依賴服務
docker-compose logs --tail=50 postgres redis

# 3. 檢查系統日誌
# macOS: log stream --predicate 'process contains[c] "docker"'
# Linux: journalctl -xe | grep -i docker

# 4. 收集診斷信息
./diagnose_p0.sh  # 見 INCIDENT_RESPONSE.md
```

**預防措施**:

```bash
# 1. 設置容器重啟策略
# docker-compose.yml
services:
  recommendation-service:
    restart: unless-stopped  # 自動重啟

# 2. 設置內存限制和告警
services:
  recommendation-service:
    deploy:
      resources:
        limits:
          memory: 512M

# 3. 定期監控
docker stats --no-stream > logs/stats_$(date +%s).txt

# 4. 日誌持久化
docker-compose logs -f recommendation-service | tee -a logs/app.log &
```

---

## 最佳實踐

### 開發最佳實踐

1. **使用 TypeScript strict 模式**
   ```typescript
   // tsconfig.json
   "strict": true,
   "strictNullChecks": true,
   "noImplicitAny": true,
   ```

2. **編寫類型定義（不要用 any）**
   ```typescript
   // ❌ 不好
   function getRecommendations(userId: any): any {}
   
   // ✅ 好
   function getRecommendations(userId: string): Promise<Recommendation[]> {}
   ```

3. **使用 DTOs 進行輸入驗證**
   ```typescript
   import { IsString, IsInt, Min, Max } from 'class-validator';
   
   export class GetRecommendationsDto {
     @IsString()
     userId: string;
     
     @IsInt()
     @Min(1)
     @Max(100)
     limit: number = 20;
   }
   ```

4. **編寫足夠的單元測試**
   ```bash
   npm test  # 應返回 70%+ 覆蓋率
   ```

5. **使用 linter 和 formatter**
   ```bash
   npm run lint      # ESLint
   npm run format    # Prettier
   ```

### 運維最佳實踐

1. **定期備份**
   ```bash
   # 每天備份一次
   0 2 * * * /path/to/backup.sh
   ```

2. **監控關鍵指標**
   ```bash
   # CPU, Memory, Disk, Error Rate, Latency
   # 使用 Prometheus + Grafana
   ```

3. **日誌管理**
   ```bash
   # 定期輪轉日誌
   docker-compose logs --since 24h > logs/daily_$(date +%Y%m%d).log
   ```

4. **定期測試恢復流程**
   ```bash
   # 每月執行一次災難恢復演練
   ```

5. **文檔保持最新**
   ```bash
   # 每次變更後更新文檔
   git log --oneline -1
   # 更新相應文檔
   ```

---

## 決策文檔

### 推薦算法變更決策

**標題**: 調整推薦算法權重以改進推薦質量

**背景**:
- 當前推薦結果包含過多舊內容（70% > 30 天）
- 用戶反饋推薦不新鮮

**提案**:
- 增加新鮮度權重: 0.25 → 0.35
- 降低熱度權重: 0.4 → 0.3
- 保持興趣匹配: 0.35

**影響分析**:
- 推薦會更傾向新內容（積極）
- 可能降低內容質量（需監控）
- 估計 CTR 變化：±5%

**決策**: 經批準，開始試驗

---

### 架構升級決策

**標題**: 升級到多實例部署（高可用）

**當前狀態**: 單實例部署

**問題**:
- 無法應對單點故障
- 升級時會有停機時間
- 無法支持藍綠部署

**提案**: 升級到 3 實例 + 負載均衡

**成本**: ~$XX/月

**時間表**: 2024-03-15 ~ 2024-04-15

**決策**: 待批準

---

## 案例分析

### 案例 1: 推薦結果為空

**時間**: 2024-01-20 10:30  
**症狀**: 所有用戶的推薦都是空的  
**根本原因**: 定時任務未執行，分數計算失敗  
**修復**: 手動執行 updateEngagementScores()  
**教訓**: 添加定時任務監控告警

### 案例 2: 數據庫磁盤滿

**時間**: 2024-01-25 14:00  
**症狀**: 數據庫無法寫入，推薦服務 500 錯誤  
**根本原因**: 日誌積累，磁盤 100% 使用  
**修復**: 清理舊日誌，設置日誌輪轉  
**教訓**: 配置 logrotate，監控磁盤空間

---

## 調試指南

### 調試推薦算法

```typescript
// 在 recommendation.service.ts 中添加調試日誌

async getRecommendations(userId: string, limit: number = 20) {
  this.logger.log(`Calculating recommendations for user: ${userId}`);
  
  // 1. 獲取用戶興趣
  const interests = await this.getUserInterests(userId);
  this.logger.debug(`User interests: ${JSON.stringify(interests)}`);
  
  // 2. 獲取所有內容
  const contents = await this.getAllContents();
  this.logger.debug(`Total contents: ${contents.length}`);
  
  // 3. 計算分數
  const scored = contents.map(content => {
    const score = this.calculateContentScore(content, interests, userId);
    this.logger.debug(`Content ${content.id} score: ${score}`);
    return { content, score };
  });
  
  // 4. 排序並返回
  const sorted = scored.sort((a, b) => b.score - a.score).slice(0, limit);
  this.logger.log(`Returned ${sorted.length} recommendations`);
  
  return sorted;
}
```

### 查看日誌級別

```bash
# 開發時使用 debug 級別
LOG_LEVEL=debug npm run dev

# 查看特定模塊的日誌
docker-compose logs recommendation-service | grep "recommendation.service"

# 查看特定錯誤
docker-compose logs recommendation-service | grep "ERROR"

# 實時監控日誌
docker-compose logs -f recommendation-service
```

---

**最後更新**: 2024-02-19  
**版本**: 1.0.0  
**維護人**: Backend Team
