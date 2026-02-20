# 🟦🟩 藍綠部署方案 (Blue-Green Deployment)

## 📋 概述

藍綠部署是灰度部署的替代方案，適合需要快速切換或無法進行漸進式部署的場景。

---

## 🎯 優勢和劣勢

### ✅ 優勢

| 優勢 | 說明 |
|------|------|
| **零停機** | 用戶無感知切換 |
| **快速回滾** | 一個命令即可回滾 |
| **完整測試** | 全新環境可充分測試 |
| **簡單明確** | 二選一，無模糊狀態 |
| **A/B 測試** | 可支持部分用戶路由 |

### ❌ 劣勢

| 劣勢 | 說明 |
|------|------|
| **資源消耗** | 需要雙倍的計算資源 |
| **成本高** | 運行兩個完整環境 |
| **狀態管理** | 需要處理無狀態設計 |
| **數據同步** | 需要實時數據同步機制 |

---

## 🏗️ 架構設計

### 雙環境架構

```
┌─────────────────────────────────────────┐
│        Load Balancer / Router           │
│     (決定流量流向藍或綠)              │
└──────────┬──────────────────┬───────────┘
           │                  │
      ┌────▼─────┐      ┌────▼─────┐
      │ BLUE ENV │      │ GREEN ENV │
      │(v1.0.0)  │      │(v1.1.0)   │
      ├───────────┤      ├───────────┤
      │ 3 x App   │      │ 3 x App   │
      │ PostgreSQL│      │ PostgreSQL│
      │ Redis     │      │ Redis     │
      └───────────┘      └───────────┘
           │                  │
           └────────┬─────────┘
                    │
              ┌─────▼────────┐
              │ Shared Data  │
              │ (PostgreSQL) │
              └──────────────┘
```

### 數據同步

```yaml
Synchronization Strategy:
  - Shared Database: 單一數據庫，兩個環境共享
  - 優勢: 數據一致，無同步延遲
  - 劣勢: 數據庫成為單點故障
  
Alternative - Dual Database:
  - 兩個獨立數據庫
  - 優勢: 隔離故障
  - 劣勢: 需要數據同步機制
```

---

## 🚀 實施步驟

### Step 1: 準備綠色環境

```bash
#!/bin/bash
# 文件: scripts/blue-green-prepare.sh

GREEN_NAMESPACE="production-green"
NEW_VERSION="v1.1.0"

echo "Preparing Green Environment..."

# 1. 創建綠色命名空間
kubectl create namespace $GREEN_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# 2. 應用綠色環境配置
kubectl apply -f k8s/green-deployment.yml -n $GREEN_NAMESPACE
kubectl apply -f k8s/green-service.yml -n $GREEN_NAMESPACE
kubectl apply -f k8s/green-ingress.yml -n $GREEN_NAMESPACE

# 3. 注入新版本鏡像
kubectl set image deployment/app \
    app=$REGISTRY/$APP:$NEW_VERSION \
    -n $GREEN_NAMESPACE

# 4. 等待部署完成
kubectl rollout status deployment/app -n $GREEN_NAMESPACE --timeout=10m

# 5. 驗證健康狀態
for pod in $(kubectl get pods -n $GREEN_NAMESPACE -l app=app -o name); do
    kubectl exec $pod -n $GREEN_NAMESPACE -- curl -f http://localhost:3000/health
done

echo "✅ Green Environment Ready!"
```

### Step 2: 測試綠色環境

```bash
#!/bin/bash
# 文件: scripts/blue-green-test.sh

GREEN_NAMESPACE="production-green"
GREEN_SERVICE_IP=$(kubectl get svc app-green -n $GREEN_NAMESPACE -o jsonpath='{.spec.clusterIP}')

echo "Testing Green Environment (IP: $GREEN_SERVICE_IP)..."

# 1. 基本連通性測試
curl -v http://$GREEN_SERVICE_IP:3000/health
curl -v http://$GREEN_SERVICE_IP:3000/api/health

# 2. 端點功能測試
curl -v http://$GREEN_SERVICE_IP:3000/api/recommendations
curl -v http://$GREEN_SERVICE_IP:3000/api/content
curl -v http://$GREEN_SERVICE_IP:3000/api/auth/status

# 3. 數據庫連接測試
curl -v http://$GREEN_SERVICE_IP:3000/api/db-check

# 4. 緩存系統測試
curl -v http://$GREEN_SERVICE_IP:3000/api/cache-test

# 5. 性能基準測試
ab -n 1000 -c 10 http://$GREEN_SERVICE_IP:3000/api/recommendations

# 6. 長運行測試 (5 分鐘)
for i in {1..300}; do
    curl -s http://$GREEN_SERVICE_IP:3000/api/recommendations > /dev/null
    sleep 1
done

echo "✅ Green Environment Tests Passed!"
```

### Step 3: 監控綠色環境

```bash
#!/bin/bash
# 文件: scripts/blue-green-monitor.sh

GREEN_NAMESPACE="production-green"
MONITORING_DURATION=300  # 5 分鐘

echo "Monitoring Green Environment for $MONITORING_DURATION seconds..."

start_time=$(date +%s)
end_time=$((start_time + MONITORING_DURATION))

while [ $(date +%s) -lt $end_time ]; do
    # 1. 檢查 Pod 健康狀態
    pod_ready=$(kubectl get pods -n $GREEN_NAMESPACE -l app=app \
        -o jsonpath='{.items[?(@.status.conditions[?(@.type=="Ready")].status=="True")].metadata.name}' | \
        wc -w)
    
    echo "Pods Ready: $pod_ready/3"
    
    # 2. 查詢關鍵指標
    error_rate=$(curl -s "http://prometheus:9090/api/v1/query" \
        --data-urlencode "query=rate(http_requests_total{namespace=\"$GREEN_NAMESPACE\",status=~'5..'}[1m])" | \
        jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
    
    latency=$(curl -s "http://prometheus:9090/api/v1/query" \
        --data-urlencode "query=histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{namespace=\"$GREEN_NAMESPACE\"}[1m]))" | \
        jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
    
    echo "Error Rate: ${error_rate}% | P99 Latency: ${latency}ms"
    
    # 3. 檢查 OOM 或崩潰
    restart_count=$(kubectl get pods -n $GREEN_NAMESPACE -l app=app \
        -o jsonpath='{.items[*].status.containerStatuses[*].restartCount}' | \
        awk '{sum+=$1} END {print sum}')
    
    if [ $restart_count -gt 0 ]; then
        echo "⚠️  Containers restarted: $restart_count times"
    fi
    
    sleep 30
done

echo "✅ Monitoring completed successfully"
```

### Step 4: 執行流量切換

```bash
#!/bin/bash
# 文件: scripts/blue-green-switch.sh

CURRENT_ENV="blue"
NEW_ENV="green"

echo "Switching traffic from $CURRENT_ENV to $NEW_ENV..."

# 1. 備份當前 Ingress 配置
kubectl get ingress app-ingress -n production -o yaml > backup-ingress-blue.yaml

# 2. 更新 Ingress 指向綠色環境
kubectl patch ingress app-ingress \
    -n production \
    --type='json' \
    -p='[
        {
            "op": "replace",
            "path": "/spec/rules/0/http/paths/0/backend/service/name",
            "value": "app-green"
        }
    ]'

# 3. 驗證流量切換
echo "Verifying traffic switch..."
for i in {1..10}; do
    curl -v http://app.sugar-daddy.com/api/health
done

echo "✅ Traffic switch completed!"
```

### Step 5: 監控新環境

```bash
#!/bin/bash
# 文件: scripts/blue-green-verify.sh

echo "Verifying Green Environment (Production)..."

# 1. 驗證流量流向正確服務
current_pods=$(kubectl get pods -n production-green -l app=app -o jsonpath='{.items[*].metadata.name}')
echo "Current Production Pods: $current_pods"

# 2. 監控關鍵指標 (30 分鐘)
for i in {1..60}; do
    error_rate=$(curl -s "http://prometheus:9090/api/v1/query" \
        --data-urlencode "query=rate(http_requests_total{namespace=\"production-green\",status=~'5..'}[5m])" | \
        jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
    
    if (( $(echo "$error_rate > 0.01" | bc -l) )); then
        echo "❌ Error rate exceeding threshold: $error_rate"
        echo "Initiating rollback..."
        kubectl patch ingress app-ingress -n production \
            --type='json' \
            -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/backend/service/name", "value": "app-blue"}]'
        exit 1
    fi
    
    echo "[$i/60] Error Rate: ${error_rate}% - OK"
    sleep 30
done

echo "✅ Green environment verified successfully!"
```

### Step 6: 清理藍色環境

```bash
#!/bin/bash
# 文件: scripts/blue-green-cleanup.sh

echo "Cleaning up Blue Environment..."

# 1. 保留藍色環境運行用於快速回滾 (保持 1 小時)
BLUE_NAMESPACE="production-blue"

echo "Keeping Blue environment for quick rollback (1 hour)"
sleep 3600

# 2. 之後關閉藍色環境
kubectl scale deployment app --replicas=0 -n $BLUE_NAMESPACE

# 3. 備份配置文件
kubectl get all -n $BLUE_NAMESPACE -o yaml > backup-blue-env-$(date +%Y%m%d_%H%M%S).yaml

# 4. 刪除命名空間 (可選)
# kubectl delete namespace $BLUE_NAMESPACE

echo "✅ Cleanup completed!"
```

---

## 🔄 回滾流程

### 快速回滾 (< 1 分鐘)

```bash
#!/bin/bash
# 文件: scripts/blue-green-rollback.sh

echo "INITIATING ROLLBACK TO BLUE ENVIRONMENT"

# 1. 立即切換流量回到藍色環境
kubectl patch ingress app-ingress \
    -n production \
    --type='json' \
    -p='[
        {
            "op": "replace",
            "path": "/spec/rules/0/http/paths/0/backend/service/name",
            "value": "app-blue"
        }
    ]'

# 2. 驗證回滾成功
echo "Verifying rollback..."
for i in {1..5}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" http://app.sugar-daddy.com/api/health)
    if [ "$response" = "200" ]; then
        echo "✅ Rollback successful (HTTP $response)"
        exit 0
    fi
    sleep 5
done

echo "❌ Rollback verification failed"
exit 1
```

---

## 📊 完整 Kubernetes 配置

### Blue Deployment

```yaml
# k8s/blue-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-blue
  namespace: production
  labels:
    app: app
    version: blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: app
      version: blue
  template:
    metadata:
      labels:
        app: app
        version: blue
    spec:
      containers:
      - name: app
        image: registry.example.com/app:v1.0.0
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
```

### Green Deployment

```yaml
# k8s/green-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-green
  namespace: production-green
  labels:
    app: app
    version: green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: app
      version: green
  template:
    metadata:
      labels:
        app: app
        version: green
    spec:
      containers:
      - name: app
        image: registry.example.com/app:v1.1.0
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
```

### Service 配置

```yaml
# k8s/service.yml
apiVersion: v1
kind: Service
metadata:
  name: app-blue
  namespace: production
  labels:
    app: app
    version: blue
spec:
  selector:
    app: app
    version: blue
  ports:
  - name: http
    port: 80
    targetPort: 3000
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: app-green
  namespace: production
  labels:
    app: app
    version: green
spec:
  selector:
    app: app
    version: green
  ports:
  - name: http
    port: 80
    targetPort: 3000
  type: ClusterIP
```

### Ingress 配置 (可動態切換)

```yaml
# k8s/ingress.yml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - app.sugar-daddy.com
    secretName: app-tls
  rules:
  - host: app.sugar-daddy.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-blue  # 可動態更改為 app-green
            port:
              number: 80
```

---

## 📋 檢查清單

### 部署前

- [ ] 綠色環境資源準備充足
- [ ] 數據庫連接配置正確
- [ ] 備份已完成
- [ ] 監控告警已配置

### 部署期間

- [ ] 綠色環境部署成功
- [ ] 綠色環境所有測試通過
- [ ] 綠色環境 5 分鐘監控無異常
- [ ] 性能指標無回退

### 流量切換

- [ ] Ingress 配置驗證
- [ ] 流量成功切換
- [ ] 30 分鐘監控無異常
- [ ] 用戶報告無問題

### 部署後

- [ ] 藍色環境保留用於回滾
- [ ] 監控告警持續運行
- [ ] 日誌聚合正常
- [ ] 部署報告已生成

---

## 何時使用藍綠 vs 灰度

| 場景 | 推薦方案 | 原因 |
|------|---------|------|
| 主要功能改動 | 灰度 | 逐步驗證，降低風險 |
| 性能優化 | 灰度 | 監控指標變化 |
| Bug 修復 | 藍綠 | 快速切換，快速回滾 |
| 數據庫遷移 | 灰度 | 監控數據完整性 |
| 緊急修復 | 藍綠 | 最快回滾 |
| 新服務發布 | 灰度 | 逐步接收流量 |

---

**建議**: 大多數情況下使用灰度部署，僅在需要快速回滾時使用藍綠部署。
