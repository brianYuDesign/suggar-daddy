# 🚨 故障排查和恢復指南

## 📚 快速導航

| 症狀 | 原因 | 解決方案 |
|------|------|---------|
| 應用無法訪問 | 部署失敗 | [步驟 1](#問題1-應用無法訪問) |
| 高錯誤率 | 代碼缺陷 | [步驟 2](#問題2-高錯誤率) |
| 高延遲 | 資源不足 | [步驟 3](#問題3-響應延遲高) |
| Pod 崩潰 | OOM 或宕機 | [步驟 4](#問題4-pod-持續崩潰) |
| 數據不一致 | 部署中斷 | [步驟 5](#問題5-數據不一致) |

---

## 🔍 診斷流程 (5 分鐘)

```bash
#!/bin/bash
# 快速診斷腳本

echo "🔍 Starting quick diagnosis..."

NAMESPACE="production"

# 1. 檢查 Pod 狀態
echo "1️⃣  Pod Status:"
kubectl get pods -n $NAMESPACE -l app=recommendation-service
POD_READY=$(kubectl get pods -n $NAMESPACE -l app=recommendation-service \
  -o jsonpath='{.items[?(@.status.conditions[?(@.type=="Ready")].status=="True")].metadata.name}' | wc -w)
echo "Ready pods: $POD_READY"

# 2. 檢查服務狀態
echo "2️⃣  Service Status:"
kubectl get svc -n $NAMESPACE
curl -s http://api.sugar-daddy.com/health || echo "❌ Service unavailable"

# 3. 檢查資源使用
echo "3️⃣  Resource Usage:"
kubectl top pods -n $NAMESPACE

# 4. 檢查關鍵指標
echo "4️⃣  Key Metrics:"
curl -s http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=rate(http_requests_total{status=~"5.."}[1m])' | jq .

# 5. 檢查最近的事件
echo "5️⃣  Recent Events:"
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -10

# 6. 檢查部署狀態
echo "6️⃣  Deployment Status:"
kubectl rollout status deployment/recommendation-service -n $NAMESPACE

echo "✅ Diagnosis complete"
```

---

## 🚨 問題解決指南

### 問題 1: 應用無法訪問

**症狀**: 
- `curl http://api.sugar-daddy.com/health` 返回 504 或超時
- Grafana 顯示無數據
- 用戶報告"服務不可用"

**診斷** (2 分鐘):

```bash
# 1. 檢查 DNS
nslookup api.sugar-daddy.com

# 2. 檢查負載均衡器
kubectl get svc -n production
kubectl get ingress -n production

# 3. 檢查 Pod
kubectl get pods -n production -l app=recommendation-service
kubectl describe pod <pod-name> -n production

# 4. 檢查容器日誌
kubectl logs <pod-name> -n production

# 5. 測試 Pod 直連
kubectl exec <pod-name> -n production -- curl localhost:3000/health
```

**可能原因和解決方案**:

| 原因 | 症狀 | 解決 |
|------|------|------|
| Pod 未啟動 | `0/3 Ready` | `kubectl describe pod` 查看錯誤 |
| 鏡像拉取失敗 | `ImagePullBackOff` | 檢查鏡像倉庫認證 |
| 資源不足 | `Pending` | 檢查節點資源 |
| 健康檢查失敗 | `CrashLoopBackOff` | 檢查應用日誌 |
| 負載均衡器未配置 | 無法訪問 | 檢查 Ingress 配置 |

**解決步驟**:

```bash
# A. 如果是鏡像問題
kubectl delete pod <pod-name> -n production
# 會觸發新的部署

# B. 如果是資源不足
kubectl describe node
# 查看節點可用資源
# 或者增加集群節點

# C. 如果是應用啟動失敗
kubectl logs <pod-name> -n production --tail=100
# 查看詳細錯誤信息

# D. 強制重新部署
kubectl rollout restart deployment/recommendation-service -n production
```

---

### 問題 2: 高錯誤率

**症狀**:
- 錯誤率 > 1%
- 用戶報告"某些請求失敗"
- Grafana 顯示紅色警告

**診斷** (3 分鐘):

```bash
# 1. 查看錯誤率細節
curl -s http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=rate(http_requests_total{status=~"5.."}[5m])' | jq .

# 2. 按端點分類
curl -s http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=rate(http_requests_total{status=~"5.."}[5m]) by (handler)' | jq .

# 3. 查看詳細日誌
kubectl logs -f deployment/recommendation-service -n production --all-containers

# 4. 檢查應用指標
curl http://localhost:3000/metrics | grep "http_requests_total{status=\"500"

# 5. 檢查依賴服務
curl http://postgres:5432/ping
curl http://redis:6379/ping
```

**可能原因和解決方案**:

| 原因 | 症狀 | 解決 |
|------|------|------|
| 數據庫連接失敗 | 502 Bad Gateway | 檢查 DB 連接配置 |
| 內存洩漏 | 逐漸增加的錯誤 | 重啟 Pod |
| 依賴服務宕機 | 特定端點 5xx | 檢查依賴服務狀態 |
| 代碼 Bug | 特定場景下錯誤 | 回滾到上個版本 |
| 資源耗盡 | 高併發下出現 | 手動擴容或調整限制 |

**解決步驟**:

```bash
# 方案 1: 立即回滾
kubectl rollout undo deployment/recommendation-service -n production

# 方案 2: 檢查數據庫
psql -h postgres.prod.internal -U prod_user -d sugar_daddy_prod -c \
  "SELECT count(*) FROM pg_stat_activity;"

# 方案 3: 檢查依賴
kubectl get pods -n production -o wide | grep -E "postgres|redis"

# 方案 4: 增加日誌級別診斷
kubectl set env deployment/recommendation-service LOG_LEVEL=debug -n production

# 方案 5: 重啟受影響的 Pod
kubectl delete pods -n production -l app=recommendation-service
```

---

### 問題 3: 響應延遲高

**症狀**:
- P99 延遲 > 2000ms
- 用戶反映"應用很慢"
- Grafana "Latency" 面板上升

**診斷** (3 分鐘):

```bash
# 1. 查看延遲分佈
curl -s http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))' | jq .

# 2. 按端點分類
curl -s http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) by (handler)' | jq .

# 3. 檢查慢查詢
kubectl exec <pod-name> -n production -- \
  curl localhost:3000/api/slow-queries

# 4. 檢查資源
kubectl top pods -n production
kubectl top nodes

# 5. 檢查網絡延遲
kubectl exec <pod-name> -n production -- ping postgres.prod.internal
kubectl exec <pod-name> -n production -- ping redis.prod.internal
```

**可能原因和解決方案**:

| 原因 | 症狀 | 解決 |
|------|------|------|
| CPU 超載 | CPU > 90% | 水平擴容或優化代碼 |
| 內存不足 | MEM > 85% | 增加內存限制 |
| 磁盤 I/O | 慢數據庫查詢 | 添加索引或分區 |
| GC 暫停 | 週期性延遲 | 調整堆大小 |
| N+1 查詢 | 數據庫連接滿 | 優化查詢邏輯 |

**解決步驟**:

```bash
# A. 立即擴容
kubectl scale deployment recommendation-service --replicas=10 -n production

# B. 檢查並優化數據庫查詢
# 查看慢查詢日誌
kubectl exec <pod-name> -n production -- \
  tail -100 /var/log/postgresql/slow-queries.log

# C. 增加索引
psql -h postgres.prod.internal -U prod_user -d sugar_daddy_prod << EOF
CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX idx_content_status ON content(status);
EOF

# D. 調整 JVM 堆大小
kubectl set env deployment/recommendation-service \
  NODE_OPTIONS="--max-old-space-size=4096" \
  -n production

# E. 檢查並清理 Redis 緩存
kubectl exec <pod-name> -n production -- redis-cli FLUSHDB
```

---

### 問題 4: Pod 持續崩潰

**症狀**:
- Pod 重啟次數不斷增加
- CrashLoopBackOff 狀態
- 應用日誌中有 OOM 或異常

**診斷** (2 分鐘):

```bash
# 1. 檢查 Pod 狀態
kubectl describe pod <pod-name> -n production

# 2. 查看崩潰原因
kubectl logs <pod-name> -n production --previous

# 3. 檢查內存使用
kubectl top pod <pod-name> -n production

# 4. 查看事件
kubectl get events -n production --field-selector involvedObject.name=<pod-name>

# 5. 檢查資源限制
kubectl get pod <pod-name> -n production -o yaml | grep -A 10 resources:
```

**可能原因和解決方案**:

| 原因 | 症狀 | 解決 |
|------|------|------|
| OOM 殺死 | `OOMKilled` | 增加內存限制 |
| Liveness 失敗 | 定期重啟 | 調整 liveness 探針 |
| 啟動失敗 | 立即退出 | 檢查應用啟動日誌 |
| 依賴不可用 | 連接超時 | 啟動初始化容器 |
| 磁盤滿 | 寫入失敗 | 擴展存儲空間 |

**解決步驟**:

```bash
# A. OOM 情況 - 增加內存
kubectl set resources deployment recommendation-service \
  --limits memory=2Gi -n production

# B. Liveness 探針問題 - 調整超時
kubectl patch deployment recommendation-service \
  -n production \
  --type='json' \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/livenessProbe/timeoutSeconds","value":10}]'

# C. 啟動失敗 - 檢查日誌
kubectl logs <pod-name> -n production

# D. 增加啟動時間
kubectl patch deployment recommendation-service \
  -n production \
  --type='json' \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/livenessProbe/initialDelaySeconds","value":30}]'

# E. 強制回滾
kubectl rollout undo deployment/recommendation-service -n production
```

---

### 問題 5: 數據不一致

**症狀**:
- 查詢返回不同的結果
- 數據庫主從不同步
- 快取與數據庫不一致

**診斷** (3 分鐘):

```bash
# 1. 檢查數據庫複製狀態
psql -h postgres.prod.internal -U postgres -c \
  "SELECT usename, application_name, state, sync_state FROM pg_stat_replication;"

# 2. 檢查複製延遲
psql -h postgres.replica.prod.internal -U postgres -c \
  "SELECT now() - pg_last_xact_replay_timestamp() as replication_delay;"

# 3. 驗證主從數據一致性
psql -h postgres.prod.internal -U postgres -d sugar_daddy_prod -c \
  "SELECT COUNT(*) FROM users;" > /tmp/master.txt
psql -h postgres.replica.prod.internal -U postgres -d sugar_daddy_prod -c \
  "SELECT COUNT(*) FROM users;" > /tmp/replica.txt
diff /tmp/master.txt /tmp/replica.txt

# 4. 檢查快取策略
kubectl exec <pod-name> -n production -- redis-cli INFO stats

# 5. 檢查應用邏輯
kubectl logs <pod-name> -n production | grep "cache\|inconsist"
```

**可能原因和解決方案**:

| 原因 | 症狀 | 解決 |
|------|------|------|
| 複製斷開 | 主從延遲 > 1s | 檢查網絡或重啟複製 |
| 快取過期 | 讀舊數據 | 手動清除快取 |
| 並發更新 | 數據混亂 | 增加鎖機制 |
| 遷移中斷 | 部分數據遺失 | 從備份恢復 |

**解決步驟**:

```bash
# A. 修復複製
# 在從庫執行
psql -h postgres.replica.prod.internal -U postgres << EOF
SELECT pg_wal_replay_resume();
EOF

# B. 清除快取
kubectl exec <pod-name> -n production -- redis-cli FLUSHDB

# C. 重新同步
# 在主庫
pg_dump -h postgres.prod.internal -U postgres -d sugar_daddy_prod | \
  psql -h postgres.replica.prod.internal -U postgres -d sugar_daddy_prod

# D. 驗證一致性
./scripts/verify-data-consistency.sh

# E. 如果無法修復 - 從備份恢復
./scripts/restore-from-backup.sh backup_20260219_020000.dump
```

---

## 🔄 快速回滾

### 秒級回滾

```bash
#!/bin/bash
# 1 分鐘內完成回滾

DEPLOYMENT="recommendation-service"
NAMESPACE="production"

echo "🔄 EMERGENCY ROLLBACK!"

# Step 1: 撤銷最後推出
kubectl rollout undo deployment/$DEPLOYMENT -n $NAMESPACE

# Step 2: 等待完成
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE --timeout=5m

# Step 3: 驗證
curl -f http://api.sugar-daddy.com/health || exit 1

echo "✅ Rollback completed in $(date)"
```

### 數據庫備份恢復

```bash
#!/bin/bash
# 15 分鐘內完成數據庫恢復

# Step 1: 停止應用
kubectl scale deployment recommendation-service --replicas=0 -n production

# Step 2: 恢復數據庫
BACKUP_FILE="backup_20260219_020000.dump"
aws s3 cp "s3://sugar-daddy-prod-backups/$BACKUP_FILE" .
pg_restore -h postgres.prod.internal -U postgres \
  -d sugar_daddy_prod -v "$BACKUP_FILE"

# Step 3: 驗證
psql -h postgres.prod.internal -U postgres -d sugar_daddy_prod \
  -c "SELECT COUNT(*) FROM users;"

# Step 4: 重啟應用
kubectl scale deployment recommendation-service --replicas=5 -n production
```

---

## 📊 監控告警

### 關鍵告警配置

```yaml
# alerts.yaml
groups:
- name: production.rules
  rules:
  
  - alert: ServiceDown
    expr: up{job="recommendation-service"} == 0
    for: 1m
    annotations:
      severity: CRITICAL
      summary: "推薦服務宕機"
  
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
    for: 3m
    annotations:
      severity: WARNING
      summary: "錯誤率過高"
  
  - alert: HighLatency
    expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 5m
    annotations:
      severity: WARNING
      summary: "響應延遲過高"
```

---

## 📞 聯絡和支持

| 情況 | 聯絡方式 | 響應時間 |
|------|---------|---------|
| P1 宕機 | 電話 +1-800-XXX-XXXX | < 5 分鐘 |
| P2 故障 | Slack #alerts | < 15 分鐘 |
| P3 警告 | 郵件 devops@sugar-daddy.com | < 1 小時 |
| 計劃維護 | 提前 48 小時通知 | - |

---

**最後更新**: 2026-02-19  
**維護者**: DevOps Team
