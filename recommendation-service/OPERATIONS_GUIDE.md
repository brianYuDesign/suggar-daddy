# 🔧 運維培訓指南 - Recommendation Service

## 📋 目錄
1. [日常操作流程](#日常操作流程)
2. [故障排查步驟](#故障排查步驟)
3. [緊急應急預案](#緊急應急預案)
4. [性能優化手段](#性能優化手段)
5. [監控和告警](#監控和告警)

---

## 日常操作流程

### 1. 服務啟動和停止

#### 啟動服務（開發環境）

```bash
# 進入項目目錄
cd /path/to/recommendation-service

# 安裝依賴（首次或有更新時）
npm install

# 啟動 Docker Compose（數據庫 + Redis）
docker-compose up -d

# 等待數據庫初始化（10-15秒）
sleep 10

# 啟動服務
npm run dev

# ✅ 服務應在 http://localhost:3000 運行
curl http://localhost:3000/health
```

#### 啟動服務（生產環境）

```bash
# 方式 1: Docker Compose（完整棧）
docker-compose -f docker-compose.prod.yml up -d

# 方式 2: 直接 Node 進程（需要外部 PG + Redis）
NODE_ENV=production npm run start
```

#### 停止服務

```bash
# 開發環境
# 1. 終止 npm run dev (Ctrl+C)
# 2. 停止 Docker Compose
docker-compose down

# 生產環境
# 關閉 Docker Compose
docker-compose -f docker-compose.prod.yml down

# 或停止單個容器
docker stop recommendation-service-api
docker stop recommendation-service-postgres
docker stop recommendation-service-redis
```

---

### 2. 數據庫管理

#### 數據庫初始化

```bash
# 運行 TypeORM 遷移（自動創建表）
npm run typeorm:run

# 驗證表是否創建成功
docker-compose exec postgres psql -U postgres -d recommendation_db -c "\dt"
```

#### 備份數據庫

```bash
# 完整備份
docker-compose exec postgres pg_dump -U postgres recommendation_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 查看備份
ls -lah backup_*.sql
```

#### 恢復數據庫

```bash
# 恢復備份
docker-compose exec -T postgres psql -U postgres recommendation_db < backup_20240115_120000.sql

# 驗證恢復
docker-compose exec postgres psql -U postgres -d recommendation_db -c "SELECT COUNT(*) FROM users;"
```

#### 查看數據庫日誌

```bash
# 查看 PostgreSQL 日誌
docker-compose logs postgres

# 實時監視日誌
docker-compose logs -f postgres
```

---

### 3. Redis 緩存管理

#### 查看 Redis 狀態

```bash
# 連接到 Redis CLI
docker-compose exec redis redis-cli

# 查看所有 key
KEYS *

# 查看 key 數量
DBSIZE

# 查看內存使用
INFO memory

# 查看連接數
INFO clients
```

#### 清空緩存

```bash
# API 方式（推薦）
curl -X POST http://localhost:3000/api/recommendations/clear-cache

# CLI 方式
docker-compose exec redis redis-cli FLUSHALL

# 選擇性清除推薦快取
docker-compose exec redis redis-cli --scan --pattern "rec:*" | xargs -L 100 redis-cli DEL
```

#### Redis 監控

```bash
# 實時監視命令
docker-compose exec redis redis-cli MONITOR

# 查看緩存命中率（每 10 秒更新）
watch 'docker-compose exec redis redis-cli INFO stats'
```

---

### 4. 日誌管理

#### 查看應用日誌

```bash
# 實時日誌
docker-compose logs -f recommendation-service

# 查看最後 100 行
docker-compose logs --tail=100 recommendation-service

# 查看過去 1 小時的日誌
docker-compose logs --since 1h recommendation-service
```

#### 日誌級別設置

```bash
# 在 .env 中設置
LOG_LEVEL=debug    # 開發調試
LOG_LEVEL=info     # 正常運行
LOG_LEVEL=warn     # 只顯示警告和錯誤
LOG_LEVEL=error    # 只顯示錯誤
```

#### 日誌持久化

```bash
# 使用 Docker 日誌驅動保存到文件
docker-compose logs -f recommendation-service > logs/service-$(date +%Y%m%d).log &

# 或配置 docker-compose.yml
services:
  recommendation-service:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 故障排查步驟

### 排查流程圖

```
問題出現
  ↓
[步驟 1] 確認是什麼層的問題？
  ├─ API 層？ → 見 API 故障排查
  ├─ 業務層？ → 見 業務邏輯故障排查
  ├─ 數據層？ → 見 數據層故障排查
  └─ 基礎設施？ → 見 基礎設施故障排查
  ↓
[步驟 2] 檢查依賴服務健康狀態
  ├─ PostgreSQL 連接？
  ├─ Redis 連接？
  └─ 磁盤空間、內存？
  ↓
[步驟 3] 查看日誌找出錯誤
  ├─ 應用日誌
  ├─ 數據庫日誌
  └─ Redis 日誌
  ↓
[步驟 4] 按類型進行修復
```

---

### 常見故障排查

#### 1. API 層故障

**症狀**: 調用 API 返回 500 錯誤或超時

**排查步驟**:

```bash
# Step 1: 檢查服務是否運行
curl -v http://localhost:3000/health

# 預期: 200 OK

# Step 2: 檢查應用日誌
docker-compose logs recommendation-service | grep -i error

# Step 3: 檢查服務進程
docker-compose ps
# 應該看到 recommendation-service: Up

# Step 4: 檢查端口是否被占用
lsof -i :3000
netstat -tuln | grep 3000

# Step 5: 重啟服務
docker-compose restart recommendation-service

# Step 6: 重新測試
curl http://localhost:3000/api/recommendations/user-123?limit=5
```

**常見原因和解決**:

| 錯誤 | 原因 | 解決方法 |
|------|------|--------|
| `Connection refused` | 服務未啟動 | `docker-compose restart recommendation-service` |
| `connect ECONNREFUSED 127.0.0.1:5432` | PostgreSQL 連接失敗 | 見 "數據層故障" |
| `connect ECONNREFUSED 127.0.0.1:6379` | Redis 連接失敗 | 見 "數據層故障" |
| `timeout` | 響應超時（>5s） | 見 "性能故障" |
| `SyntaxError: Unexpected token` | 代碼語法錯誤 | 檢查最近提交，回滾或修復 |

---

#### 2. 數據層故障

**症狀**: "connect ECONNREFUSED" 錯誤、數據讀取失敗

**排查步驟**:

```bash
# Step 1: 檢查 PostgreSQL 狀態
docker-compose ps postgres

# Step 2: 測試 PostgreSQL 連接
docker-compose exec postgres psql -U postgres -d recommendation_db -c "SELECT 1;"

# 預期: 
#  ?column? 
# ----------
#          1

# Step 3: 檢查 PostgreSQL 日誌
docker-compose logs postgres | tail -50

# Step 4: 檢查磁盤空間（PostgreSQL 可能無空間）
docker-compose exec postgres df -h

# Step 5: 重啟數據庫
docker-compose restart postgres
sleep 10
docker-compose restart recommendation-service

# Step 6: 檢查 Redis 狀態
docker-compose ps redis
docker-compose exec redis redis-cli ping

# 預期: PONG

# Step 7: 如果 Redis 故障，重啟
docker-compose restart redis
docker-compose restart recommendation-service
```

**常見原因和解決**:

| 錯誤 | 原因 | 解決方法 |
|------|------|--------|
| `FATAL: database ... does not exist` | 數據庫未初始化 | `npm run typeorm:run` |
| `role "postgres" does not exist` | PostgreSQL 配置錯誤 | 檢查 .env 中的 DATABASE_USER/PASSWORD |
| `disk I/O error` | 磁盤空間不足 | 清理磁盤或增加存儲 |
| `connection timeout` | 數據庫進程卡住 | 強制重啟：`docker-compose kill postgres` → `docker-compose up -d postgres` |

---

#### 3. 性能故障

**症狀**: API 響應時間 > 500ms、高 CPU/內存使用

**排查步驟**:

```bash
# Step 1: 檢查服務 CPU/內存
docker stats recommendation-service

# 異常: CPU > 80% 或內存 > 1GB（應該 <400MB）

# Step 2: 檢查數據庫查詢性能
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  SELECT query, calls, total_time, mean_time 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC LIMIT 10;"

# Step 3: 檢查慢查詢日誌
docker-compose exec postgres tail -f /var/log/postgresql/postgresql.log | grep duration

# Step 4: 檢查 Redis 性能
docker-compose exec redis redis-cli --latency
docker-compose exec redis redis-cli --stat

# Step 5: 檢查緩存命中率
docker-compose exec redis redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"

# Step 6: 分析瓶頸
# 如果 Redis 緩存命中率 < 50%，需要優化快取策略
# 如果數據庫查詢 > 100ms，需要添加索引
# 如果內存 > 500MB，需要增加限制或優化算法
```

**常見原因和解決**:

| 現象 | 原因 | 解決方法 |
|------|------|--------|
| 響應時間從 50ms → 500ms | 緩存失效 | 檢查 Redis，清空重建 |
| CPU 100%、內存 80% | 算法計算量大 | 減少 limit 參數、優化算法 |
| 數據庫查詢 >200ms | 缺少索引 | 見 "性能優化" 章節 |
| 間歇性超時 | 連接池耗盡 | 增加 CONNECTION_POOL_SIZE |

---

#### 4. 業務邏輯故障

**症狀**: 推薦結果不符合預期、用戶反饋數據錯誤

**排查步驟**:

```bash
# Step 1: 檢查推薦結果
curl http://localhost:3000/api/recommendations/user-123?limit=5

# 檢查:
# - 是否有推薦結果？
# - 分數是否合理（0-1）？
# - 標籤是否匹配？

# Step 2: 檢查用戶興趣數據
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  SELECT * FROM user_interests WHERE user_id = 'user-123';"

# Step 3: 檢查用戶互動記錄
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  SELECT * FROM user_interactions WHERE user_id = 'user-123' LIMIT 20;"

# Step 4: 檢查內容標籤
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  SELECT * FROM content_tags LIMIT 10;"

# Step 5: 檢查推薦算法邏輯
# 查看 recommendation.service.ts 中的:
# - getRecommendations() - 主推薦邏輯
# - calculateContentScore() - 分數計算
# - applyRecommendationLogic() - 推薦規則

# Step 6: 手動驗證計算
# 推薦分數 = 0.4 × 熱度 + 0.35 × 興趣匹配 + 0.25 × 新鮮度
```

**常見原因和解決**:

| 現象 | 原因 | 解決方法 |
|------|------|--------|
| 推薦結果重複 | 快取未更新 | `curl -X POST http://localhost:3000/api/recommendations/clear-cache` |
| 新內容沒推薦 | 算法偏向舊內容 | 提高新鮮度權重（0.25 → 0.35） |
| 沒有推薦結果 | 用戶無興趣數據 | 記錄互動：`POST /recommendations/interactions` |
| 分數計算錯誤 | 權重配置錯誤 | 檢查 recommendation.service.ts 中的權重設置 |

---

## 緊急應急預案

### 1. P0（關鍵）應急流程 - 服務完全宕機

**定義**: 推薦服務無法訪問，所有 API 都返回 500 或超時

**應急步驟** (5 分鐘內完成):

```
時間  行動                        預期結果
0m    1. 確認問題是否真實存在      curl http://localhost:3000/health → 失敗
      2. 檢查服務日誌              docker-compose logs recommendation-service | tail -50

5m    3. 快速重啟                  docker-compose restart recommendation-service
                                   等待 30 秒

10m   4. 測試服務                  curl http://localhost:3000/health → 200 OK

15m   5. 如果依然失敗，檢查依賴     - 檢查 PostgreSQL: docker-compose ps postgres
                                  - 檢查 Redis: docker-compose ps redis

20m   6. 重啟所有服務              docker-compose restart
                                   等待 60 秒

25m   7. 驗證服務                  curl 測試 API 端點

30m   如果依然失敗 → 執行降級方案（見下）
```

**降級方案** (當重啟失敗時):

```bash
# 方案 A: 重建容器（可能丟失臨時數據）
docker-compose down
docker-compose up -d
sleep 30
curl http://localhost:3000/health

# 方案 B: 使用備用實例（若有）
# 切換 DNS/LB 到備用服務器

# 方案 C: 回滾到上一個版本（若有 commit hash）
git log --oneline -5
git checkout <上一個穩定 commit>
npm install
docker-compose up -d
```

**恢復後行動**:
- 收集日誌：`docker-compose logs > crash_report_$(date +%Y%m%d_%H%M%S).log`
- 分析根本原因
- 提交 incident ticket

---

### 2. P1（重要）應急流程 - 部分功能不可用

**定義**: 推薦 API 可訪問但：
- 響應時間 > 2 秒
- 某些用戶返回空結果
- 推薦結果異常

**應急步驟** (15 分鐘內完成):

```
時間   行動                            預期結果
0m     1. 確認問題（收集數據）         測試多個用戶，記錄響應時間

3m     2. 檢查緩存狀態                 docker-compose exec redis redis-cli DBSIZE
                                     如果 < 100，說明缺少快取

5m     3. 清空並重建緩存               curl -X POST http://localhost:3000/api/recommendations/clear-cache
                                     重新調用推薦 API

8m     4. 檢查數據庫性能               - 慢查詢日誌
                                     - 連接數
                                     - 磁盤 I/O

12m    5. 優化措施                     - 增加快取 TTL
                                     - 減少查詢的返回數量
                                     - 優化推薦算法

15m    6. 驗證恢復                     響應時間 < 500ms ✅
```

**具體操作**:

```bash
# 1. 檢查緩存
docker-compose exec redis redis-cli DBSIZE

# 2. 清空緩存
curl -X POST http://localhost:3000/api/recommendations/clear-cache

# 3. 更新分數（重新計算）
curl -X POST http://localhost:3000/api/recommendations/update-scores

# 4. 監控恢復
watch 'curl -s http://localhost:3000/api/recommendations/user-123?limit=5 | jq ".generated_at"'

# 5. 檢查數據庫連接
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  SELECT datname, numbackends FROM pg_stat_database 
  WHERE datname = 'recommendation_db';"
```

---

### 3. P2（一般）應急流程 - 輕微問題或降級

**定義**: 
- 某個非關鍵 API 返回錯誤
- 推薦結果質量下降但能訪問
- 性能略低於預期

**應急步驟** (可在工作時間內完成):

```
行動:
1. 記錄問題詳情（時間、用戶、API 端點）
2. 檢查是否有已知問題（查看 incidents.log）
3. 如果是新問題，提交 ticket
4. 在下一個維護窗口修復
```

---

### 4. 事後總結流程

**發生任何 incident 後，執行以下步驟**:

```bash
# 1. 收集事故日誌
docker-compose logs > incidents/incident_$(date +%Y%m%d_%H%M%S).log

# 2. 記錄事故信息
cat << EOF > incidents/incident_$(date +%Y%m%d_%H%M%S).md
# Incident Report

## 基本信息
- **時間**: $(date)
- **嚴重級別**: P0 / P1 / P2
- **影響範圍**: 描述受影響的功能
- **檢測方式**: 告警/用戶反饋/主動發現

## 根本原因
- 分析為什麼發生

## 解決方案
- 記錄采取的措施

## 預防措施
- 如何避免再次發生

## 責任人
- 誰負責跟進
EOF

# 3. 分析根本原因
# 查看相關代碼、配置、基礎設施日誌

# 4. 制定改進方案
# 更新文檔、增加監控、優化代碼

# 5. 跟進驗證
# 確保修復有效，監控一段時間
```

---

## 性能優化手段

### 1. 緩存優化

#### 策略

```typescript
// 推薦緩存（默認 1 小時）
RECOMMENDATION_CACHE_TTL=3600

// 內容緩存（默認 30 分鐘）
CONTENT_CACHE_TTL=1800

// 用戶興趣緩存（默認 6 小時）
USER_INTEREST_CACHE_TTL=21600
```

#### 命令

```bash
# 查看當前緩存鍵
docker-compose exec redis redis-cli KEYS "*"

# 查看特定快取大小
docker-compose exec redis redis-cli STRLEN rec:user-123

# 手動設置過期時間
docker-compose exec redis redis-cli EXPIRE rec:user-123 1800

# 分析緩存增長
docker-compose exec redis redis-cli INFO memory

# 設置最大內存策略
docker-compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

---

### 2. 數據庫索引優化

#### 檢查現有索引

```bash
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  SELECT schemaname, tablename, indexname, indexdef 
  FROM pg_indexes 
  WHERE schemaname = 'public' 
  ORDER BY tablename;"
```

#### 添加關鍵索引

```sql
-- 推薦查詢的關鍵索引
CREATE INDEX CONCURRENTLY idx_user_interests_user_id 
  ON user_interests(user_id);

CREATE INDEX CONCURRENTLY idx_user_interactions_user_id 
  ON user_interactions(user_id);

CREATE INDEX CONCURRENTLY idx_user_interactions_created_at 
  ON user_interactions(created_at DESC);

CREATE INDEX CONCURRENTLY idx_contents_created_at 
  ON contents(created_at DESC);

CREATE INDEX CONCURRENTLY idx_contents_engagement_score 
  ON contents(engagement_score DESC);
```

#### 分析查詢計劃

```bash
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  EXPLAIN ANALYZE 
  SELECT * FROM user_interests 
  WHERE user_id = 'user-123';"
```

---

### 3. 算法優化

#### 推薦算法調優

編輯 `src/services/recommendation.service.ts`:

```typescript
// 當前權重配置
const WEIGHTS = {
  ENGAGEMENT: 0.4,      // 熱度分數權重
  INTEREST_MATCH: 0.35, // 興趣匹配權重
  FRESHNESS: 0.25,      // 新鮮度權重
};

// 調優建議：
// 1. 如果推薦結果太陳舊 → 提高 FRESHNESS (0.25 → 0.35)
// 2. 如果忽視用戶興趣 → 提高 INTEREST_MATCH (0.35 → 0.45)
// 3. 如果結果太隨機 → 降低隨機因子 (0.2 → 0.1)

// 新鮮度半衰期（當前 72 小時）
const HALF_LIFE_HOURS = 72;

// 調優建議：
// 1. 要推薦新內容 → 降低半衰期 (72 → 48)
// 2. 要更多經典內容 → 提高半衰期 (72 → 120)
```

#### 性能基準測試

```bash
# 測試推薦 API 性能（100 個並發請求）
ab -n 100 -c 10 http://localhost:3000/api/recommendations/user-123?limit=20

# 預期結果：
# Requests per second: 200+ RPS
# Time per request: < 500ms (平均)
```

---

### 4. 資源優化

#### 數據庫連接池

```bash
# 在 .env 中設置
DATABASE_CONNECTION_POOL_MIN=5
DATABASE_CONNECTION_POOL_MAX=20

# 監控連接使用
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  SELECT datname, numbackends FROM pg_stat_database 
  WHERE datname = 'recommendation_db';"
```

#### 內存限制

```yaml
# docker-compose.yml
services:
  recommendation-service:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

#### 磁盤空間

```bash
# 定期檢查
docker-compose exec postgres du -sh /var/lib/postgresql/data

# 清理過期數據（保留 90 天）
DELETE FROM user_interactions 
WHERE created_at < NOW() - INTERVAL '90 days';

# 數據庫維護
docker-compose exec postgres vacuumdb -U postgres recommendation_db
```

---

## 監控和告警

### 1. 關鍵指標

#### 應用層指標

```
✓ 請求延遲 (P50, P95, P99)
✓ 緩存命中率
✓ 錯誤率 (4xx, 5xx)
✓ 推薦多樣性得分
```

#### 基礎設施指標

```
✓ CPU 使用率 (告警: > 80%)
✓ 內存使用率 (告警: > 80%)
✓ 磁盤使用率 (告警: > 90%)
✓ 數據庫連接數 (告警: > 80% pool)
✓ Redis 內存使用 (告警: > 80%)
```

### 2. 監控命令

```bash
# 實時監控
docker stats

# 應用性能監控
curl http://localhost:3000/api/recommendations/metrics

# 數據庫性能
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  SELECT query, calls, mean_time 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC LIMIT 5;"

# Redis 監控
docker-compose exec redis redis-cli INFO all
```

### 3. 告警規則

| 指標 | 告警閾值 | 行動 |
|------|--------|------|
| 錯誤率 | > 1% | 立即檢查日誌 |
| 延遲 P95 | > 1s | 檢查數據庫/Redis |
| 緩存命中率 | < 40% | 清空重建快取 |
| CPU | > 85% | 優化算法或擴容 |
| 磁盤 | > 95% | 清理數據 |

---

## 快速參考

### 常用命令速查

```bash
# 健康檢查
curl http://localhost:3000/health

# 獲取推薦
curl http://localhost:3000/api/recommendations/user-123

# 記錄互動
curl -X POST http://localhost:3000/api/recommendations/interactions \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user-123","content_id":"content-1","interaction_type":"like"}'

# 清空緩存
curl -X POST http://localhost:3000/api/recommendations/clear-cache

# 查看日誌
docker-compose logs -f recommendation-service

# 重啟服務
docker-compose restart recommendation-service

# 完整重啟
docker-compose down
docker-compose up -d
```

---

## 支持和聯繫

- **技術文檔**: 見 `README.md`, `API.md`, `ALGORITHM.md`
- **故障排查**: 見本文檔
- **監控告警**: 配置 prometheus + grafana（見 `docker-compose.monitoring.yml`）

---

**最後更新**: 2024-02-19  
**負責人**: Backend Team  
**版本**: 1.0.0
