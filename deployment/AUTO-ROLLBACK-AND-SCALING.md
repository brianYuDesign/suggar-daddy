# ⚙️ 自動回滾和自動擴展配置

## 🚨 自動回滾 (Automatic Rollback)

### 1. 基於指標的回滾

```yaml
# k8s/rollback-policy.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rollback-policy
  namespace: production
data:
  policy.json: |
    {
      "rollback_triggers": [
        {
          "metric": "error_rate",
          "threshold": 0.05,
          "duration": "3m",
          "severity": "CRITICAL"
        },
        {
          "metric": "latency_p99",
          "threshold": 5000,
          "duration": "5m",
          "severity": "WARNING"
        },
        {
          "metric": "pod_ready_ratio",
          "threshold": 0.5,
          "duration": "2m",
          "severity": "CRITICAL"
        },
        {
          "metric": "memory_usage",
          "threshold": 0.9,
          "duration": "10m",
          "severity": "WARNING"
        },
        {
          "metric": "restart_count",
          "threshold": 3,
          "duration": "5m",
          "severity": "CRITICAL"
        }
      ],
      "rollback_strategy": {
        "automatic": true,
        "max_rollback_attempts": 3,
        "wait_between_attempts_seconds": 30
      }
    }
```

### 2. 自動回滾控制器

```bash
#!/bin/bash
# scripts/auto-rollback-controller.sh

set -e

NAMESPACE="production"
PROMETHEUS_URL="http://prometheus:9090"
CHECK_INTERVAL=30
ALERT_WEBHOOK="${SLACK_WEBHOOK_URL}"

# 回滾配置
declare -A ROLLBACK_THRESHOLDS=(
    ["error_rate"]=0.05
    ["latency_p99"]=5000
    ["pod_ready"]=0.5
)

declare -A ROLLBACK_DURATION=(
    ["error_rate"]="3m"
    ["latency_p99"]="5m"
    ["pod_ready"]="2m"
)

log_alert() {
    local message=$1
    echo "[$(date)] 🚨 ALERT: $message"
    
    # 發送到 Slack
    curl -X POST "$ALERT_WEBHOOK" \
        -H 'Content-type: application/json' \
        --data "{
            \"text\": \"🚨 Auto-Rollback Triggered\",
            \"attachments\": [{
                \"color\": \"danger\",
                \"text\": \"$message\"
            }]
        }"
}

query_prometheus() {
    local query=$1
    curl -s "${PROMETHEUS_URL}/api/v1/query" \
        --data-urlencode "query=$query" | \
        jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0"
}

check_error_rate() {
    local query='rate(http_requests_total{namespace="'$NAMESPACE'",status=~"5.."}[3m])'
    local error_rate=$(query_prometheus "$query")
    local threshold=${ROLLBACK_THRESHOLDS["error_rate"]}
    
    if (( $(echo "$error_rate > $threshold" | bc -l) )); then
        return 0  # 觸發回滾
    fi
    return 1
}

check_latency() {
    local query='histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{namespace="'$NAMESPACE'"}[5m]))'
    local latency=$(query_prometheus "$query")
    local threshold=${ROLLBACK_THRESHOLDS["latency_p99"]}
    
    if (( $(echo "$latency > $threshold" | bc -l) )); then
        return 0  # 觸發回滾
    fi
    return 1
}

check_pod_health() {
    local ready_pods=$(kubectl get pods -n "$NAMESPACE" \
        -l app=recommendation-service \
        -o jsonpath='{.items[?(@.status.conditions[?(@.type=="Ready")].status=="True")].metadata.name}' | \
        wc -w)
    
    local total_pods=$(kubectl get pods -n "$NAMESPACE" \
        -l app=recommendation-service \
        -o jsonpath='{.items[*].metadata.name}' | \
        wc -w)
    
    if [ "$total_pods" -gt 0 ]; then
        local ready_ratio=$(echo "scale=2; $ready_pods / $total_pods" | bc)
        local threshold=${ROLLBACK_THRESHOLDS["pod_ready"]}
        
        if (( $(echo "$ready_ratio < $threshold" | bc -l) )); then
            return 0  # 觸發回滾
        fi
    fi
    return 1
}

perform_rollback() {
    local deployment=$1
    local namespace=$2
    
    log_alert "Initiating automatic rollback for $deployment in $namespace"
    
    # 執行回滾
    kubectl rollout undo deployment/"$deployment" -n "$namespace"
    
    # 等待回滾完成
    kubectl rollout status deployment/"$deployment" -n "$namespace" --timeout=10m
    
    log_alert "Rollback completed for $deployment"
}

main() {
    echo "Starting Auto-Rollback Controller"
    
    while true; do
        # 檢查各項指標
        if check_error_rate; then
            log_alert "Error rate exceeded threshold"
            perform_rollback "recommendation-service" "$NAMESPACE"
        elif check_latency; then
            log_alert "Latency exceeded threshold"
            perform_rollback "recommendation-service" "$NAMESPACE"
        elif check_pod_health; then
            log_alert "Pod health check failed"
            perform_rollback "recommendation-service" "$NAMESPACE"
        fi
        
        sleep $CHECK_INTERVAL
    done
}

trap 'echo "Auto-Rollback Controller stopped"; exit 0' SIGTERM SIGINT
main
```

### 3. Kubernetes Deployment 配置

```yaml
# k8s/deployment-with-rollback.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: recommendation-service
  namespace: production
  labels:
    app: recommendation-service
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  
  revisionHistoryLimit: 10  # 保留最後 10 個版本用於回滾
  
  progressDeadlineSeconds: 600  # 10 分鐘內未完成則失敗
  
  selector:
    matchLabels:
      app: recommendation-service
  
  template:
    metadata:
      labels:
        app: recommendation-service
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    
    spec:
      containers:
      - name: app
        image: registry.example.com/recommendation-service:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9090
          name: metrics
        
        # 就緒探針 (Readiness Probe)
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        
        # 活躍探針 (Liveness Probe)
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 20
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
        
        # 啟動探針 (Startup Probe) - K8s 1.16+
        startupProbe:
          httpGet:
            path: /health
            port: 3000
          failureThreshold: 30
          periodSeconds: 5
        
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        
        env:
        - name: NODE_ENV
          value: "production"
        - name: LOG_LEVEL
          value: "info"
```

---

## 📈 自動擴展 (Autoscaling)

### 1. 水平 Pod 自動擴展 (HPA)

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: recommendation-service-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: recommendation-service
  
  minReplicas: 3
  maxReplicas: 20
  
  metrics:
  # 基於 CPU 使用率
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  
  # 基於內存使用率
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  
  # 基於自定義指標 (請求數)
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Min
    
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 4
        periodSeconds: 30
      selectPolicy: Max

---
# 其他服務的 HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: content-service-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: content-streaming-service
  minReplicas: 2
  maxReplicas: 15
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
```

### 2. 節點自動擴展 (Cluster Autoscaler)

```yaml
# k8s/cluster-autoscaler-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-config
  namespace: kube-system
data:
  config.yaml: |
    nodeGroups:
    - name: compute-pool-1
      minSize: 3
      maxSize: 10
      desiredSize: 5
      machineType: t3.large
      autoRepair: true
      autoUpgrade: true
    
    - name: compute-pool-2
      minSize: 2
      maxSize: 8
      desiredSize: 3
      machineType: t3.xlarge
      autoRepair: true
      autoUpgrade: true
    
    scaling:
      scaleDownEnabled: true
      scaleDownDelay: 10m
      scaleDownUnneededTime: 10m
      skipNodesWithLocalStorage: true
```

### 3. 垂直 Pod 自動調整 (VPA - 可選)

```yaml
# k8s/vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: recommendation-service-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: recommendation-service
  
  updatePolicy:
    updateMode: "Auto"  # 自動更新資源請求
  
  resourcePolicy:
    containerPolicies:
    - containerName: "app"
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2
        memory: 2Gi
```

---

## 📊 監控和告警

### CloudWatch / Prometheus 告警規則

```yaml
# monitoring/alert-rules.yaml
groups:
- name: auto-scaling.rules
  interval: 30s
  rules:
  
  # 擴展事件
  - alert: PodScalingUp
    expr: |
      increase(hpa_desired_replicas{namespace="production"}[1m]) > 0
    for: 1m
    annotations:
      summary: "HPA 正在擴展"
      description: "{{ $labels.hpa }} 在擴展中"
  
  # 達到最大副本數
  - alert: HPAAtMaxReplicas
    expr: |
      hpa_desired_replicas{namespace="production"} >= hpa_max_replicas
    for: 5m
    annotations:
      summary: "HPA 已達到最大副本數"
      description: "{{ $labels.hpa }} 無法繼續擴展"
  
  # 頻繁擴縮
  - alert: FrequentScaling
    expr: |
      rate(hpa_scaling_activity_total[5m]) > 0.1
    for: 10m
    annotations:
      summary: "檢測到頻繁的自動擴展"
      description: "{{ $labels.hpa }} 擴展頻率過高，可能需要調整閾值"
  
  # 回滾事件
  - alert: RollbackDetected
    expr: |
      increase(deployment_rollback_total{namespace="production"}[1m]) > 0
    for: 1m
    annotations:
      summary: "檢測到部署回滾"
      description: "{{ $labels.deployment }} 已觸發自動回滾"
```

---

## 🔧 故障排查

### 檢查 HPA 狀態

```bash
# 查看 HPA 配置
kubectl get hpa -n production
kubectl describe hpa recommendation-service-hpa -n production

# 檢查 HPA 事件
kubectl get events -n production | grep -i hpa

# 查看指標值
kubectl get hpa recommendation-service-hpa -n production -w

# 檢查當前副本數
kubectl get deployment recommendation-service -n production
```

### 常見問題

| 問題 | 症狀 | 解決方案 |
|------|------|---------|
| HPA 無法工作 | 副本數不變 | 檢查 Metrics Server 是否運行 |
| 無法獲取指標 | "unable to compute replica count" | 確認 Pod 導出了正確的指標 |
| 頻繁擴縮 | Pod 不斷重啟 | 調整 stabilizationWindowSeconds |
| 無法擴展到最大 | 無法擴展到 maxReplicas | 檢查資源配額限制 |

---

## 📋 檢查清單

### 部署前配置

- [ ] HPA 配置已驗證
- [ ] 資源請求和限制已設置
- [ ] 健康檢查已配置
- [ ] 告警規則已配置
- [ ] 日誌已配置

### 部署後驗證

- [ ] HPA 正常工作
- [ ] 自動擴展在高負載下觸發
- [ ] 自動縮容工作正常
- [ ] 告警通知正常運行
- [ ] 無頻繁的擴縮事件

---

**建議**: 定期檢查和調整 HPA 閾值，確保資源使用效率和應用穩定性。
