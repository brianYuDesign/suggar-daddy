# 📋 Sugar-Daddy 運維指南

## 目錄

1. [日常操作流程](#日常操作流程)
2. [故障排查](#故障排查)
3. [性能監控](#性能監控)
4. [備份恢復](#備份恢復)
5. [日誌管理](#日誌管理)
6. [常見問題](#常見問題)

---

## 日常操作流程

### 啟動應用

#### 使用 Docker Compose（開發環境）

```bash
# 1. 進入項目目錄
cd /Users/brianyu/.openclaw/workspace

# 2. 啟動所有服務
docker-compose up -d

# 3. 驗證服務狀態
docker-compose ps

# 4. 檢查日誌
docker-compose logs -f api-gateway
```

#### 使用 Kubernetes（生產環境）

```bash
# 1. 應用配置
kubectl apply -f deployment/kubernetes/

# 2. 檢查部署狀態
kubectl get deployments -n sugardaddy
kubectl get pods -n sugardaddy

# 3. 檢查服務
kubectl get services -n sugardaddy

# 4. 查看日誌
kubectl logs -f deployment/api-gateway -n sugardaddy
```

---

### 停止應用

#### Docker Compose

```bash
# 優雅停止
docker-compose down

# 停止並刪除數據卷
docker-compose down -v
```

#### Kubernetes

```bash
# 刪除所有資源
kubectl delete -f deployment/kubernetes/ -n sugardaddy

# 或使用 Helm
helm uninstall sugardaddy -n sugardaddy
```

---

### 升級應用

#### 使用 Kubernetes 滾動更新

```bash
# 1. 更新部署鏡像版本
kubectl set image deployment/api-gateway \
  api-gateway=sugardaddy/api-gateway:1.1.0 \
  -n sugardaddy

# 2. 監控更新進度
kubectl rollout status deployment/api-gateway -n sugardaddy

# 3. 如需回滾
kubectl rollout undo deployment/api-gateway -n sugardaddy
```

#### 使用 Helm

```bash
# 更新 Helm release
helm upgrade sugardaddy ./helm/sugardaddy-chart \
  --values values-prod.yaml \
  --namespace sugardaddy

# 查看版本歷史
helm history sugardaddy -n sugardaddy

# 回滾到上一版本
helm rollback sugardaddy 1 -n sugardaddy
```

---

### 數據庫操作

#### 備份數據庫

```bash
# PostgreSQL 備份
pg_dump -h localhost -U postgres sugardaddy_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 使用 AWS RDS (生產)
aws rds create-db-snapshot \
  --db-instance-identifier sugardaddy-postgres \
  --db-snapshot-identifier sugardaddy-backup-$(date +%Y%m%d)
```

#### 恢復數據庫

```bash
# 本地恢復
psql -h localhost -U postgres sugardaddy_db < backup_20260219.sql

# 從 AWS RDS 快照恢復
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier sugardaddy-restored \
  --db-snapshot-identifier sugardaddy-backup-20260219
```

---

## 故障排查

### 常見問題診斷

#### 問題 1: API Gateway 無法啟動

```bash
# 1. 檢查日誌
docker logs api-gateway

# 2. 檢查端口占用
lsof -i :3000

# 3. 檢查環境變量
docker exec api-gateway env | grep NODE

# 4. 檢查依賴服務
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Payment Service
```

#### 問題 2: 數據庫連接失敗

```bash
# 1. 檢查 PostgreSQL 狀態
docker ps | grep postgres

# 2. 測試連接
psql -h localhost -U postgres -d sugardaddy_db -c "SELECT 1"

# 3. 查看連接日誌
docker logs postgres | tail -50

# 4. 檢查連接池
# 在應用中查看活躍連接:
curl http://localhost:3000/health

# 5. 重置連接
# 重啟 PostgreSQL 服務
docker restart postgres
```

#### 問題 3: Redis 快取失效

```bash
# 1. 檢查 Redis 狀態
docker exec redis redis-cli ping
# 應返回: PONG

# 2. 檢查內存使用
docker exec redis redis-cli info memory

# 3. 查看快取大小
docker exec redis redis-cli dbsize

# 4. 清除所有快取
docker exec redis redis-cli FLUSHALL

# 5. 檢查特定鍵
docker exec redis redis-cli KEYS "user:*" | wc -l
```

#### 問題 4: 視頻轉碼卡住

```bash
# 1. 檢查轉碼隊列
curl http://localhost:3000/api/v1/transcoding?status=processing

# 2. 查看 FFmpeg 進程
docker ps | grep ffmpeg
ps aux | grep ffmpeg

# 3. 檢查磁盤空間
df -h

# 4. 查看轉碼日誌
docker logs content-streaming | grep transcode

# 5. 手動重試失敗的任務
curl -X POST http://localhost:3000/api/v1/transcoding/{jobId}/retry \
  -H "Authorization: Bearer TOKEN"
```

#### 問題 5: 支付服務失敗

```bash
# 1. 檢查 Stripe 連接
curl -X GET http://localhost:3002/health

# 2. 驗證 API Key
echo $STRIPE_SECRET_KEY

# 3. 查看支付日誌
docker logs payment-service | grep -i stripe

# 4. 檢查失敗的支付
curl http://localhost:3000/api/v1/payments?status=failed \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 5. 手動確認支付
curl -X POST http://localhost:3000/api/v1/payments/confirm \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentIntentId": "..."}' 
```

---

### 檢查清單

#### 每日檢查

```bash
#!/bin/bash

echo "=== Sugar-Daddy 系統狀態檢查 ==="

# 1. 檢查服務運行狀態
echo "1. 服務狀態:"
docker-compose ps

# 2. 檢查磁盤空間
echo -e "\n2. 磁盤使用:"
df -h | grep -E "^/dev|Mounted"

# 3. 檢查內存使用
echo -e "\n3. 內存使用:"
free -h

# 4. 檢查 API Gateway 響應
echo -e "\n4. API Gateway 健康檢查:"
curl -s http://localhost:3000/health | jq .

# 5. 檢查數據庫連接
echo -e "\n5. 數據庫連接:"
docker exec postgres psql -h localhost -U postgres -d sugardaddy_db \
  -c "SELECT count(*) FROM pg_stat_activity;"

# 6. 檢查 Redis
echo -e "\n6. Redis 狀態:"
docker exec redis redis-cli info stats

# 7. 檢查日誌錯誤
echo -e "\n7. 最近錯誤:"
docker-compose logs --tail=50 | grep -i error
```

---

## 性能監控

### Prometheus 指標查詢

```bash
# 1. 訪問 Prometheus
# URL: http://localhost:9090

# 2. 常用查詢

# HTTP 請求速率 (5 分鐘)
rate(http_requests_total[5m])

# 平均响應時間
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# 錯誤率
rate(http_requests_total{status=~"5.."}[5m])

# 數據庫連接數
pg_stat_activity_count

# Redis 記憶體使用
redis_memory_usage_bytes
```

### Grafana 儀表板

```
訪問: http://localhost:3000 (Grafana)
用戶: admin
密碼: admin (首次登錄后更改)

預定義儀表板:
1. API Gateway 監控
2. 微服務性能
3. 數據庫性能
4. 系統資源
5. 業務指標
```

### 設置告警

```yaml
# prometheus-rules.yaml
groups:
  - name: sugardaddy
    rules:
      # API Gateway 響應時間
      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95, 
            rate(http_request_duration_seconds_bucket[5m])
          ) > 1
        for: 5m
        annotations:
          summary: "High API response time"
          
      # 錯誤率過高
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 2m
        annotations:
          summary: "Error rate > 5%"
          
      # 數據庫連接池滿
      - alert: DatabaseConnectionPoolFull
        expr: |
          pg_stat_activity_count / db_connection_pool_max > 0.8
        for: 1m
        annotations:
          summary: "Database connection pool usage > 80%"
```

---

## 備份恢復

### 備份策略

```
                   每日       每週      每月
全量備份:          ✓         ✓         ✓
增量備份:          ✓         -         -
備份保留期:        7 天      30 天     12 個月
備份位置:          本地 + S3
驗證頻率:          每日
恢復測試:          每周
```

### 自動備份配置

```bash
# 1. 設置 cron 任務
crontab -e

# 添加備份任務
# 每天凌晨 2 點執行完整備份
0 2 * * * /opt/sugardaddy/scripts/backup.sh >> /var/log/sugardaddy-backup.log 2>&1

# 每天上午 10 點執行增量備份
0 10 * * * /opt/sugardaddy/scripts/backup-incremental.sh >> /var/log/sugardaddy-backup.log 2>&1

# 每周日凌晨 3 點驗證備份
0 3 * * 0 /opt/sugardaddy/scripts/verify-backup.sh

# 2. 創建備份腳本
cat > /opt/sugardaddy/scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/sugardaddy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 備份數據庫
pg_dump -h localhost -U postgres sugardaddy_db | gzip > \
  $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# 備份應用配置
tar -czf $BACKUP_DIR/config_$TIMESTAMP.tar.gz /etc/sugardaddy/

# 上傳到 S3
aws s3 cp $BACKUP_DIR/db_$TIMESTAMP.sql.gz \
  s3://sugardaddy-backups/database/

# 清理舊備份 (保留 7 天)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $TIMESTAMP"
EOF

chmod +x /opt/sugardaddy/scripts/backup.sh
```

### 恢復流程

```bash
#!/bin/bash

echo "=== Sugar-Daddy 系統恢復 ==="

# 1. 選擇恢復點
echo "可用的備份:"
ls -lh /backups/sugardaddy/db_*.sql.gz | tail -5

read -p "輸入要恢復的備份文件名: " BACKUP_FILE

# 2. 驗證備份
echo "驗證備份完整性..."
gunzip -t /backups/sugardaddy/$BACKUP_FILE
if [ $? -ne 0 ]; then
  echo "備份文件損壞，中止恢復"
  exit 1
fi

# 3. 停止應用
echo "停止應用服務..."
docker-compose down

# 4. 備份當前數據庫（以防失敗）
echo "備份當前數據庫..."
pg_dump -h localhost -U postgres sugardaddy_db | \
  gzip > /backups/sugardaddy/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz

# 5. 恢復數據庫
echo "恢復數據庫..."
gunzip < /backups/sugardaddy/$BACKUP_FILE | \
  psql -h localhost -U postgres sugardaddy_db

# 6. 啟動應用
echo "啟動應用服務..."
docker-compose up -d

# 7. 驗證恢復
echo "驗證恢復..."
sleep 5
curl http://localhost:3000/health

echo "恢復完成"
```

---

## 日誌管理

### 日誌收集

```bash
# 1. 查看實時日誌
docker-compose logs -f api-gateway

# 2. 查看特定服務的日誌
docker logs payment-service --tail 100

# 3. 使用 grep 過濾
docker-compose logs | grep ERROR

# 4. 導出日誌
docker-compose logs > /tmp/sugardaddy-logs-$(date +%Y%m%d).txt

# 5. 日誌級別過濾
# 在應用環境變量中設置
docker-compose set environment LOG_LEVEL=INFO
```

### ELK Stack 日誌管理

```bash
# 1. 啟動 ELK Stack
docker-compose up -d elasticsearch logstash kibana

# 2. 配置 Logstash
cat > logstash.conf << 'EOF'
input {
  docker {
    host => "unix:///var/run/docker.sock"
  }
}

filter {
  json {
    source => "message"
  }
  mutate {
    add_field => { "[@metadata][index]" => "sugardaddy-%{+YYYY.MM.dd}" }
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "%{[@metadata][index]}"
  }
}
EOF

# 3. 訪問 Kibana
# URL: http://localhost:5601

# 4. 創建索引模式
# Pattern: sugardaddy-*
# Time field: @timestamp
```

---

## 常見問題

### 問題: 如何擴展特定服務的副本數？

```bash
# 使用 Kubernetes
kubectl scale deployment payment-service --replicas=5 -n sugardaddy

# 使用 Docker Compose
docker-compose up -d --scale payment-service=5
```

### 問題: 如何查看歷史部署版本？

```bash
# Kubernetes
kubectl rollout history deployment/api-gateway -n sugardaddy

# 查看詳細信息
kubectl rollout history deployment/api-gateway --revision=2 -n sugardaddy

# Helm
helm history sugardaddy -n sugardaddy
```

### 問題: 如何清除 Redis 快取？

```bash
# 清除所有快取
docker exec redis redis-cli FLUSHALL

# 清除特定鍵模式
docker exec redis redis-cli --scan --pattern "user:*" | \
  xargs docker exec redis redis-cli DEL

# 設置過期時間
docker exec redis redis-cli EXPIRE session:123 3600
```

### 問題: 如何手動触發轉碼任務？

```bash
# 通過 API 触發
curl -X POST http://localhost:3000/api/v1/transcoding/trigger \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "video-uuid",
    "qualities": ["360p", "720p", "1080p"]
  }'
```

### 問題: 如何更新環境變量？

```bash
# 編輯 .env 文件
vim .env

# 或使用 kubectl
kubectl set env deployment/api-gateway \
  DATABASE_URL=postgresql://... \
  -n sugardaddy

# 驗證更改
kubectl get pod -o jsonpath='{.items[0].spec.containers[0].env}' -n sugardaddy
```

### 問題: 如何禁用用戶？

```bash
# 通過 API
curl -X POST http://localhost:3000/api/v1/auth/users/{userId}/deactivate \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 驗證
curl http://localhost:3000/api/v1/auth/users/{userId} \
  -H "Authorization: Bearer ADMIN_TOKEN" | jq '.data.status'
```

---

## 應急聯絡方式

| 角色 | 名字 | 電話 | 郵箱 |
|------|------|------|------|
| DevOps Lead | John Doe | +1-555-0001 | john@sugardaddy.com |
| Backend Lead | Jane Smith | +1-555-0002 | jane@sugardaddy.com |
| DBA | Bob Wilson | +1-555-0003 | bob@sugardaddy.com |
| On-call Support | - | - | oncall@sugardaddy.com |

---

**最後更新**: 2026-02-19  
**版本**: 1.0.0  
**狀態**: ✅ 完整
