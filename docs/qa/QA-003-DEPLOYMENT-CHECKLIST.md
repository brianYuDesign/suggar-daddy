# QA-003: Pre-Deployment Checklist & Production Configuration

**版本**: 1.0  
**日期**: 2026-02-19  
**用途**: 灰度部署前驗證所有系統配置

---

## 📋 Part 1: Pre-Deployment Verification Checklist

### 1.1 代碼和構建檢查

```markdown
## ✅ Code Quality

- [ ] 所有單元測試通過
  命令: npm run test:unit
  預期: 100% 通過
  
- [ ] E2E 測試通過
  命令: npm run test:e2e
  預期: 35/35 用例通過
  
- [ ] API 集成測試通過
  命令: npm run test:api
  預期: 29/29 用例通過
  
- [ ] TypeScript 編譯無誤
  命令: npm run build
  預期: 0 errors
  
- [ ] 代碼風格檢查通過
  命令: npm run lint
  預期: 0 warnings
  
- [ ] 安全審計無重大問題
  命令: npm audit
  預期: 0 critical/high vulnerabilities
  
- [ ] 類型檢查完整
  命令: npm run type-check
  預期: 0 errors
  
- [ ] 文檔完整
  檢查: README.md, API 文檔, 部署指南存在

## ✅ Performance Baselines

- [ ] API 響應時間 <200ms (p95)
  測試: npm run test:performance
  驗證: performance-test-results.json
  
- [ ] 併發用戶測試通過 (100+ users)
  測試: npm run test:load
  驗證: load-test-results.json
  
- [ ] 數據庫查詢優化
  測試: npm run test:db-performance
  預期: 所有查詢 <100ms
  
- [ ] 緩存命中率 >80%
  檢查: Redis 配置正確
  驗證: 本地測試緩存工作

## ✅ Security Verification

- [ ] 認證邊界測試全通過
  測試: npm run test:security:auth
  預期: 6/6 通過
  
- [ ] 權限檢查全通過
  測試: npm run test:security:auth
  預期: 4/4 通過
  
- [ ] SQL 注入防護驗證
  測試: npm run test:security:injection
  預期: 5/5 通過
  
- [ ] CORS 配置驗證
  測試: npm run test:security:cors
  預期: 4/4 通過
  
- [ ] 安全頭檢查
  檢查: 所有響應含 X-Frame-Options 等
  
- [ ] 依賴項安全
  命令: npm audit
  預期: 無 critical issues
```

---

### 1.2 基礎設施檢查

```markdown
## ✅ Database Configuration

- [ ] PostgreSQL 16+ 安裝
  命令: psql --version
  
- [ ] 數據庫創建成功
  命令: \l sugar_daddy_db
  預期: sugar_daddy_db 存在
  
- [ ] 所有表已創建
  命令: \dt
  預期: 至少 15 個表
  
- [ ] 主鍵和外鍵完整
  檢查: 各表 constraints 正確
  
- [ ] 索引已創建
  命令: npm run db:migrate
  預期: 所有索引創建成功
  
- [ ] 連接池配置
  檢查: max_connections >= 100
  命令: psql -c "SHOW max_connections"
  
- [ ] 備份配置
  檢查: 每日自動備份啟用
  路徑: /var/backups/postgres/
  
- [ ] 複製配置 (如需 HA)
  檢查: primary-replica 複製正常
  命令: pg_basebackup -c fast -D /path/to/replica

## ✅ Redis Configuration

- [ ] Redis 7+ 安裝
  命令: redis-cli --version
  
- [ ] Redis 服務運行
  命令: redis-cli ping
  預期: PONG
  
- [ ] 持久化啟用 (AOF)
  檢查: appendonly yes
  路徑: /etc/redis/redis.conf
  
- [ ] 內存限制設置
  檢查: maxmemory 2gb
  命令: redis-cli CONFIG GET maxmemory
  
- [ ] 密碼設置
  檢查: requirepass 設置
  
- [ ] 過期鍵清理
  檢查: maxmemory-policy allkeys-lru

## ✅ Container Configuration

- [ ] Docker 安裝
  命令: docker --version
  預期: Docker 20.10+
  
- [ ] Docker Compose 安裝
  命令: docker-compose --version
  預期: Docker Compose 2.0+
  
- [ ] 所有鏡像構建成功
  命令: docker-compose build
  預期: 0 build errors
  
- [ ] 容器網絡配置
  檢查: sugar-daddy-network 存在
  命令: docker network ls
  
- [ ] 容器卷配置
  檢查: 所有必要卷已創建
  命令: docker volume ls
  
- [ ] 容器資源限制
  檢查: memory limit 設置
  檢查: CPU limit 設置

## ✅ Network Configuration

- [ ] 防火牆規則
  - [ ] 3000 開放 (前端)
  - [ ] 3001 開放 (內容服務)
  - [ ] 3002 開放 (認證服務)
  - [ ] 3003 開放 (支付服務)
  - [ ] 5432 限制 (僅內部)
  - [ ] 6379 限制 (僅內部)
  
- [ ] SSL/TLS 證書
  檢查: 有效期 >90 天
  命令: openssl s_client -connect example.com:443
  
- [ ] DNS 配置
  檢查: 指向正確 IP
  命令: nslookup example.com
  
- [ ] 負載均衡器
  檢查: 配置正確 (如使用)
  檢查: 健康檢查配置
  
- [ ] API Gateway
  檢查: 速率限制設置
  檢查: 日誌記錄啟用
```

---

### 1.3 部署環境檢查

```markdown
## ✅ 環境變量配置

驗證 .env 配置:
```bash
# 驗證所有必要環量變量存在
export $(cat .env | xargs)
echo "DB_USER=$DB_USER"
echo "DB_PASSWORD=$DB_PASSWORD"
echo "DB_NAME=$DB_NAME"
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
# ... 驗證其他變量
```

- [ ] NODE_ENV=production
- [ ] DATABASE_URL 正確
- [ ] REDIS_URL 正確
- [ ] JWT_SECRET 設置強密碼 (>32 字符)
- [ ] AWS_ACCESS_KEY_ID 設置
- [ ] AWS_SECRET_ACCESS_KEY 設置
- [ ] STRIPE_SECRET_KEY (生產)
- [ ] STRIPE_WEBHOOK_SECRET
- [ ] SMTP_HOST / SMTP_PORT
- [ ] SMTP_USER / SMTP_PASSWORD
- [ ] LOG_LEVEL=info (或 warn)

## ✅ 日誌配置

- [ ] 日誌級別適當
  檢查: production 使用 info/warn
  避免: debug 級別過多
  
- [ ] 日誌收集
  檢查: ELK 棧連接正常
  檢查: Logstash 運行中
  
- [ ] 日誌保留政策
  設置: 30 天保留
  檢查: 磁盤空間充足
  
- [ ] 敏感信息過濾
  檢查: 無密碼/token 日誌
  檢查: 無信用卡信息日誌

## ✅ 備份策略

- [ ] 數據庫備份
  頻率: 每日
  位置: /var/backups/postgres/
  驗證: 備份文件 >1GB (取決於數據量)
  
- [ ] S3 備份同步
  檢查: 配置正確
  驗證: 備份在 AWS S3
  
- [ ] 備份恢復測試
  測試: 從備份恢復成功
  時間: <5 分鐘
  
- [ ] 備份加密
  檢查: S3 SSE 啟用
  檢查: 本地備份加密

## ✅ 監控告警設置

- [ ] Prometheus 運行
  命令: curl http://localhost:9090
  
- [ ] Grafana 登入成功
  URL: http://localhost:3010
  
- [ ] AlertManager 配置
  檢查: Slack/email 通知配置
  
- [ ] 告警規則加載
  檢查: alert_rules.yml 有效
  
- [ ] ELK 運行
  檢查: Elasticsearch, Logstash, Kibana
```

---

## 📊 Part 2: Canary Deployment Strategy

### 灰度部署階段

```markdown
## Phase 1: Canary (5% 流量, 4 小時)

### 部署步驟
1. 部署新版本到金絲雀環境
   ```bash
   docker-compose up -d --scale api=2
   # 其中 1 個使用新版本
   ```

2. 監控指標
   - 錯誤率 (目標: <1%)
   - 響應時間 (目標: <300ms p95)
   - 數據庫查詢時間
   - 緩存命中率

3. 檢查清單
   - [ ] 所有基本功能工作
   - [ ] 沒有數據庫錯誤
   - [ ] 沒有權限問題
   - [ ] 推薦系統正常
   - [ ] 支付流程正常
   - [ ] 日誌無异常

4. 通過條件
   - 錯誤率 <1%
   - 響應時間正常
   - 無用戶投訴
   - 4 小時內無重大問題

### 失敗恢復
```bash
# 自動回滾
docker-compose down
git checkout previous-version
docker-compose up -d
```

## Phase 2: 25% 部署 (8 小時)

1. 擴展到 25% 用戶
   ```bash
   # 4 個實例，其中 1 個新版本
   docker-compose up -d --scale api=4
   ```

2. 持續監控同上

3. 通過條件: 同上

## Phase 3: 100% 部署 (立即)

1. 全量部署
   ```bash
   docker-compose down
   git checkout new-version
   docker-compose up -d
   ```

2. 終端驗證
   - 所有用戶基本功能
   - 負載均衡正常
   - 數據一致性
   - 日誌正常

## 部署失敗回滾

自動條件:
- 錯誤率 >5% (連續 2 分鐘)
- P99 響應時間 >1000ms (連續 2 分鐘)
- 數據庫連接池滿
- 關鍵服務無響應

手動回滾:
```bash
# 確認問題
./health-check.sh

# 回滾
docker-compose down -v
git checkout previous-version
docker-compose up -d

# 驗證
./smoke-tests.sh
```
```

---

## 📈 Part 3: Health Checks & Monitoring

### 服務健康檢查腳本

```bash
#!/bin/bash
# health-check.sh - 系統健康檢查

set -e

SERVICES=(
  "http://localhost:3000/health"    # Recommendation
  "http://localhost:3001/health"    # Content
  "http://localhost:3002/health"    # Auth
  "http://localhost:3003/health"    # Payment
  "http://localhost:9090"            # Prometheus
  "http://localhost:3010"            # Grafana
  "http://localhost:5601"            # Kibana
)

echo "🔍 Health Check Report"
echo "====================="

all_healthy=true

for service in "${SERVICES[@]}"; do
  if curl -s "$service" > /dev/null; then
    echo "✅ $service"
  else
    echo "❌ $service"
    all_healthy=false
  fi
done

if [ "$all_healthy" = true ]; then
  echo ""
  echo "✅ All services healthy"
  exit 0
else
  echo ""
  echo "❌ Some services unhealthy"
  exit 1
fi
```

### 性能基準測試

```bash
#!/bin/bash
# smoke-tests.sh - 煙霧測試

echo "🧪 Running Smoke Tests"

# 1. 用戶註冊和登入
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "smoketest@example.com",
    "password": "SmokeTest123!",
    "name": "Smoke Test User"
  }'

# 2. 登入
TOKEN=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "smoketest@example.com",
    "password": "SmokeTest123!"
  }' | jq -r '.accessToken')

# 3. 測試推薦系統
curl -s -X GET http://localhost:3000/api/recommendations \
  -H "Authorization: Bearer $TOKEN" | jq '.recommendations | length'

# 4. 測試內容服務
curl -s -X GET http://localhost:3001/api/content/featured \
  -H "Authorization: Bearer $TOKEN" | jq '.content | length'

echo "✅ Smoke tests passed"
```

---

## 📋 Part 4: Production Runbook

### 日常維護

```markdown
## 每日檢查

- [ ] 監控儀表板檢查
  - 關鍵指標正常
  - 沒有告警

- [ ] 日誌檢查
  - 檢查 Kibana 錯誤日誌
  - 查找異常模式

- [ ] 備份驗證
  - 最新備份存在
  - 備份大小正常

- [ ] 性能檢查
  - API 響應時間正常
  - 數據庫查詢時間正常
  - 緩存命中率正常

## 每週檢查

- [ ] 安全審計
  - npm audit 檢查
  - 依賴版本檢查

- [ ] 容量計劃
  - 磁盤空間使用量
  - 內存使用量
  - 數據庫大小

- [ ] 備份恢復測試
  - 從備份恢復一次
  - 驗證數據完整性

## 每月檢查

- [ ] 安全補丁
  - 更新依賴項
  - 更新系統包

- [ ] 性能優化
  - 分析慢查詢
  - 優化 SQL
  - 調整緩存策略

- [ ] 容量規劃
  - 預測增長
  - 規劃擴容
```

---

## ✅ Final Pre-Deployment Checklist

在部署到生產環境前，確認:

```
☐ Phase 1: 代碼和構建檢查 (全部通過)
☐ Phase 2: 基礎設施檢查 (全部就緒)
☐ Phase 3: 部署環境檢查 (全部配置)
☐ Phase 4: 性能基準測試 (全部達成)
☐ Phase 5: 安全測試 (全部通過)
☐ Phase 6: 灰度部署計劃 (已準備)
☐ Phase 7: 監控告警配置 (已驗證)
☐ Phase 8: 回滾計劃 (已測試)

☐ 最終簽核:
  - 技術負責人: _________________ (日期: ___)
  - QA 負責人: _________________ (日期: ___)
  - 運維負責人: _________________ (日期: ___)

✅ 準備就緒，可進行灰度部署
```

