# 🚀 生產部署完整指南

## 📚 目錄

1. [快速開始](#快速開始)
2. [部署前準備](#部署前準備)
3. [部署流程](#部署流程)
4. [監控驗證](#監控驗證)
5. [故障排查](#故障排查)
6. [回滾程序](#回滾程序)

---

## 🚀 快速開始

### 5 分鐘快速部署

```bash
# 1. 準備環境
cd /Users/brianyu/.openclaw/workspace
export NEW_VERSION="v1.0.0"
export SERVICE="recommendation-service"

# 2. 執行灰度部署
bash scripts/canary-deployment.sh $SERVICE $NEW_VERSION --auto-promote

# 3. 驗證部署
curl http://api.sugar-daddy.com/health
```

### 完整部署流程

```bash
# 1. 前置檢查
./scripts/pre-deployment-check.sh

# 2. 備份數據庫
./scripts/backup-postgres.sh

# 3. 執行灰度部署
./scripts/canary-deployment.sh recommendation-service v1.0.0

# 4. 監控部署
./scripts/monitor-deployment.sh

# 5. 完成驗證
./scripts/post-deployment-verify.sh
```

---

## 📋 部署前準備

### Step 1: 代碼準備

```bash
# 檢查代碼質量
npm run lint
npm run test
npm run build

# 構建 Docker 鏡像
docker build -t recommendation-service:v1.0.0 .
docker push registry.example.com/recommendation-service:v1.0.0

# 驗證鏡像
docker pull registry.example.com/recommendation-service:v1.0.0
docker inspect registry.example.com/recommendation-service:v1.0.0
```

### Step 2: 環境驗證

```bash
# 驗證 Kubernetes 連接
kubectl cluster-info
kubectl get nodes

# 驗證命名空間
kubectl get namespaces
kubectl get all -n production

# 驗證存儲
kubectl get pvc -n production
kubectl get configmap -n production
kubectl get secret -n production
```

### Step 3: 備份執行

```bash
# 完整備份
./scripts/backup-postgres.sh

# 驗證備份
aws s3 ls s3://sugar-daddy-prod-backups/ --recursive

# 檢查備份大小
du -sh ./backup_full_*.dump
```

### Step 4: 告警預熱

```bash
# 禁用告警以免收到誤報
# 在進行部署時，某些告警可能會被觸發

kubectl patch alertmanager alertmanager -n monitoring --type merge -p \
  '{"spec":{"paused":true}}'

# 或者路由到特定通道
curl -X POST http://alertmanager:9093/api/v1/alerts/groups \
  -H 'Content-Type: application/json' \
  -d '[{"status":"suppressed","labels":{"deployment":"in-progress"}}]'
```

---

## 🔄 部署流程

### Canary 部署 (5% → 25% → 50% → 100%)

#### Phase 1: 5% Canary (5 分鐘)

```bash
echo "📦 Phase 1: Deploying 5% canary..."

# 1. 設置金絲雀副本
kubectl patch deployment recommendation-service \
  -n production \
  --type='json' \
  -p='[{"op":"replace","path":"/spec/replicas","value":20}]'

# 2. 部署新版本到 1 個 Pod
kubectl set image deployment/recommendation-service \
  recommendation-service=registry.example.com/recommendation-service:v1.0.0 \
  -n production

# 3. 設置 Istio 流量分割 (5%)
kubectl patch virtualservice recommendation-service \
  -n production \
  --type merge \
  -p '{"spec":{"http":[{"route":[
    {"destination":{"host":"recommendation-service","subset":"stable"},"weight":95},
    {"destination":{"host":"recommendation-service","subset":"canary"},"weight":5}
  ]}]}}'

# 4. 監控指標
for i in {1..10}; do
  echo "Monitoring ($i/10)..."
  curl -s http://prometheus:9090/api/v1/query \
    --data-urlencode 'query=rate(http_requests_total{status=~"5.."}[1m])' | jq .
  sleep 30
done

echo "✅ Phase 1 completed"
```

#### Phase 2: 25% Canary (5 分鐘)

```bash
echo "📦 Phase 2: Deploying 25% canary..."

# 確認升級前檢查
read -p "Press Enter to continue with 25% canary deployment..."

# 增加新版本副本
kubectl set image deployment/recommendation-service \
  recommendation-service=registry.example.com/recommendation-service:v1.0.0 \
  -n production

# 更新流量分割 (25%)
kubectl patch virtualservice recommendation-service \
  -n production \
  --type merge \
  -p '{"spec":{"http":[{"route":[
    {"destination":{"host":"recommendation-service","subset":"stable"},"weight":75},
    {"destination":{"host":"recommendation-service","subset":"canary"},"weight":25}
  ]}]}}'

# 監控
for i in {1..10}; do
  echo "Monitoring ($i/10)..."
  kubectl top pods -n production -l app=recommendation-service
  sleep 30
done

echo "✅ Phase 2 completed"
```

#### Phase 3: 50% Canary (5 分鐘)

```bash
echo "📦 Phase 3: Deploying 50% canary..."

# 確認升級
read -p "Press Enter to continue with 50% canary deployment..."

# 更新流量分割 (50%)
kubectl patch virtualservice recommendation-service \
  -n production \
  --type merge \
  -p '{"spec":{"http":[{"route":[
    {"destination":{"host":"recommendation-service","subset":"stable"},"weight":50},
    {"destination":{"host":"recommendation-service","subset":"canary"},"weight":50}
  ]}]}}'

# 監控
for i in {1..10}; do
  echo "Monitoring ($i/10)..."
  curl -s http://metrics-api:3000/api/metrics | jq .
  sleep 30
done

echo "✅ Phase 3 completed"
```

#### Phase 4: 100% 完全推出 (5 分鐘)

```bash
echo "📦 Phase 4: Full rollout (100%)..."

# 確認最終推出
read -p "Press Enter to proceed with full rollout..."

# 更新流量分割 (100% 新版本)
kubectl patch virtualservice recommendation-service \
  -n production \
  --type merge \
  -p '{"spec":{"http":[{"route":[
    {"destination":{"host":"recommendation-service","subset":"canary"},"weight":100}
  ]}]}}'

# 全量推出
kubectl set image deployment/recommendation-service \
  recommendation-service=registry.example.com/recommendation-service:v1.0.0 \
  -n production

# 驗證推出
kubectl rollout status deployment/recommendation-service -n production --timeout=10m

echo "✅ Phase 4 completed - Full rollout successful!"
```

---

## 📊 監控驗證

### 實時監控儀表板

```bash
# 開啟 Grafana 儀表板
open http://localhost:3010/d/prod-deployment

# 查看部署進度
kubectl rollout status deployment/recommendation-service -n production -w

# 查看 Pod 狀態
watch kubectl get pods -n production -l app=recommendation-service
```

### 關鍵指標驗證

```bash
#!/bin/bash
# scripts/verify-deployment.sh

echo "🔍 Verifying deployment metrics..."

# 1. 錯誤率檢查
ERROR_RATE=$(curl -s http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=rate(http_requests_total{status=~"5.."}[5m])' | \
  jq -r '.data.result[0].value[1]')

if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
  echo "❌ Error rate too high: $ERROR_RATE"
  exit 1
fi
echo "✅ Error rate: $ERROR_RATE (< 1%)"

# 2. 延遲檢查
LATENCY=$(curl -s http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))' | \
  jq -r '.data.result[0].value[1]')

if (( $(echo "$LATENCY > 2000" | bc -l) )); then
  echo "❌ Latency too high: ${LATENCY}ms"
  exit 1
fi
echo "✅ P99 Latency: ${LATENCY}ms (< 2s)"

# 3. Pod 健康檢查
READY_PODS=$(kubectl get pods -n production -l app=recommendation-service \
  -o jsonpath='{.items[?(@.status.conditions[?(@.type=="Ready")].status=="True")].metadata.name}' | wc -w)

TOTAL_PODS=$(kubectl get pods -n production -l app=recommendation-service \
  -o jsonpath='{.items[*].metadata.name}' | wc -w)

if [ $READY_PODS -lt $TOTAL_PODS ]; then
  echo "❌ Not all pods are ready: $READY_PODS/$TOTAL_PODS"
  exit 1
fi
echo "✅ All pods ready: $READY_PODS/$TOTAL_PODS"

# 4. 依賴服務檢查
for service in postgresql redis recommendation-service; do
  STATUS=$(kubectl get endpoints $service -n production -o jsonpath='{.subsets[0].addresses[0].targetRef.name}' 2>/dev/null)
  if [ -z "$STATUS" ]; then
    echo "❌ Service $service not healthy"
    exit 1
  fi
done
echo "✅ All dependencies healthy"

echo ""
echo "✅ Deployment verified successfully!"
```

---

## 🚨 故障排查

### 問題: Pod 無法啟動

```bash
# 1. 檢查 Pod 狀態
kubectl describe pod <pod-name> -n production

# 2. 查看容器日誌
kubectl logs <pod-name> -n production -c app
kubectl logs <pod-name> -n production -c app --previous

# 3. 檢查資源
kubectl top pods <pod-name> -n production
kubectl get resourcequota -n production

# 4. 檢查鏡像
kubectl get pod <pod-name> -n production -o jsonpath='{.spec.containers[0].image}'
docker pull <image-name>

# 5. 解決方案
# 增加資源限制或調整就緒探針超時
kubectl set resources deployment recommendation-service \
  --limits cpu=2,memory=2Gi -n production
```

### 問題: 高錯誤率

```bash
# 1. 檢查應用日誌
kubectl logs -f deployment/recommendation-service -n production --all-containers

# 2. 查看錯誤詳情
curl -s http://localhost:3000/metrics | grep http_requests_total

# 3. 檢查依賴服務
curl http://postgres:5432/ping
curl http://redis:6379/ping

# 4. 檢查數據庫連接
kubectl exec -it <pod-name> -n production -- \
  psql -h postgres.prod.internal -U prod_user -d sugar_daddy_prod -c "SELECT 1;"

# 5. 回滾部署
kubectl rollout undo deployment/recommendation-service -n production
```

### 問題: 內存洩漏

```bash
# 1. 監控內存增長
watch kubectl top pods -n production

# 2. 查看詳細內存信息
kubectl exec <pod-name> -n production -- ps aux

# 3. 分析內存堆棧
kubectl exec <pod-name> -n production -- node --inspect &
node-inspector --host localhost

# 4. 重啟 Pod
kubectl delete pod <pod-name> -n production

# 5. 檢查代碼是否有內存洩漏
# - 審查最近的代碼改動
# - 運行內存分析工具
# - 檢查第三方庫版本
```

---

## 🔄 回滾程序

### 立即回滾

```bash
#!/bin/bash
# scripts/quick-rollback.sh

SERVICE=${1:-recommendation-service}
NAMESPACE=${2:-production}

echo "🔄 Rolling back $SERVICE..."

# 1. 撤銷最後一次推出
kubectl rollout undo deployment/$SERVICE -n $NAMESPACE

# 2. 驗證回滾
kubectl rollout status deployment/$SERVICE -n $NAMESPACE --timeout=5m

# 3. 驗證服務恢復
curl http://api.sugar-daddy.com/health

echo "✅ Rollback completed!"
```

### 回滾到特定版本

```bash
# 1. 查看部署歷史
kubectl rollout history deployment/recommendation-service -n production

# 2. 查看特定版本詳情
kubectl rollout history deployment/recommendation-service -n production --revision=5

# 3. 回滾到特定版本
kubectl rollout undo deployment/recommendation-service -n production --to-revision=5

# 4. 驗證
kubectl rollout status deployment/recommendation-service -n production
```

### 數據庫回滾

```bash
# 1. 停止應用
kubectl scale deployment recommendation-service --replicas=0 -n production

# 2. 從備份恢復
aws s3 cp s3://sugar-daddy-prod-backups/postgres/backup_20260219_020000.dump - | \
  pg_restore -h postgres.prod.internal -U postgres -d sugar_daddy_prod

# 3. 驗證數據
psql -h postgres.prod.internal -U postgres -d sugar_daddy_prod -c "SELECT COUNT(*) FROM users;"

# 4. 重啟應用
kubectl scale deployment recommendation-service --replicas=5 -n production
```

---

## 📋 部署檢查清單

### 部署前

- [ ] 所有測試通過
- [ ] 代碼 review 完成
- [ ] 備份已執行
- [ ] 告警已配置
- [ ] 監控已準備

### 部署中

- [ ] 5% 灰度成功
- [ ] 25% 灰度成功
- [ ] 50% 灰度成功
- [ ] 100% 推出成功
- [ ] 指標驗證通過

### 部署後

- [ ] 所有服務健康
- [ ] 用戶無報告
- [ ] 性能無回退
- [ ] 日誌無異常
- [ ] 部署報告生成

---

## 📞 支持資源

### 文檔
- [灰度部署指南](./CANARY-DEPLOYMENT.md)
- [藍綠部署指南](./BLUE-GREEN-DEPLOYMENT.md)
- [自動回滾配置](./AUTO-ROLLBACK-AND-SCALING.md)
- [故障排查指南](./TROUBLESHOOTING.md)

### 監控
- Grafana: http://localhost:3010
- Prometheus: http://localhost:9090
- Kibana: http://localhost:5601
- Alertmanager: http://localhost:9093

### 聯絡
- **On-call**: PagerDuty (alerts@sugar-daddy.com)
- **Slack**: #deployments 通道
- **緊急**: +1-800-XXX-XXXX

---

**版本**: v1.0  
**最後更新**: 2026-02-19  
**維護者**: DevOps Team
