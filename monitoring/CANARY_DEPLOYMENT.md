# 灰度部署基礎設施設置指南

**完成日期**: 2026-02-19  
**版本**: 1.0  
**環境**: Production  
**目標**: 建立完整的灰度部署監控和自動回滾基礎設施

---

## 📋 目錄

1. [系統架構](#系統架構)
2. [核心組件](#核心組件)
3. [部署步驟](#部署步驟)
4. [配置說明](#配置說明)
5. [監控儀表板](#監控儀表板)
6. [測試和驗證](#測試和驗證)
7. [故障排除](#故障排除)
8. [最佳實踐](#最佳實踐)

---

## 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                     用戶請求                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────▼───────────────┐
         │    Nginx 金絲雀網關          │
         │  (流量分配 5%→25%→50%→100%)  │
         └───┬───────────────────────┬───┘
             │                       │
      ┌──────▼──┐              ┌──────▼──┐
      │ Stable  │              │ Canary  │
      │Service  │              │Service  │
      │(95%)    │              │(5%)     │
      └──────┬──┘              └──────┬──┘
             │                       │
     ┌───────▼───────────┬───────────▼──────┐
     │                   │                  │
┌────▼────┐        ┌────▼────┐      ┌────▼────┐
│Prometheus│        │Grafana   │      │Alert    │
│  指標採集│        │儀表板    │      │Manager  │
└────┬────┘        └────┬────┘      └────┬────┘
     │                  │                │
     │    ┌─────────────▼────────────┐   │
     │    │  自動回滾監控器          │   │
     │    │ (Canary-Auto-Rollback)   │   │
     │    │  - 錯誤率監控 (5%)       │   │
     │    │  - 延遲監控 (500ms)      │   │
     │    │  - 健康檢查監控          │   │
     │    └───────────┬──────────────┘   │
     │                │                  │
     └────────────────▼──────────────────┘
                自動回滾觸發
```

---

## 核心組件

### 1. Prometheus 監控配置

**文件**: `prometheus.yml`

**功能**:
- 採集 Canary 和 Stable 版本的指標
- 15 秒採集間隔
- 支持 10+ 個監控目標

**關鍵指標**:
```
http_requests_total{deployment="canary|stable",status="..."}
http_request_duration_seconds{deployment="canary|stable"}
process_cpu_seconds_total{deployment="canary|stable"}
process_resident_memory_bytes{deployment="canary|stable"}
up{deployment="canary|stable"}
```

### 2. 告警規則

**文件**: `canary-alert-rules.yml`

**告警列表**:

| 告警名稱 | 觸發條件 | 回滾 | 詳情 |
|---------|--------|------|------|
| CanaryHighErrorRate | 錯誤率 > 5% | ✅ | 持續 2 分鐘 |
| CanaryHighLatency | P95 延遲 > 500ms | ✅ | 持續 2 分鐘 |
| CanaryUnhealthyInstances | 實例宕機 | ✅ | 立即觸發 |
| CanaryHighCPU | CPU > 80% | ❌ | 警告級別 |
| CanaryHighMemory | 記憶體 > 85% | ❌ | 警告級別 |
| AutoRollbackErrorRateThreshold | 錯誤率 > 5% | ✅ | 2 分鐘 |
| AutoRollbackLatencyThreshold | 延遲 > 500ms | ✅ | 2 分鐘 |
| AutoRollbackHealthCheckFailure | 健康檢查失敗 | ✅ | 1 分鐘 |

### 3. Nginx 金絲雀配置

**文件**: `nginx-canary.conf`

**流量分配方式**:

#### 方式 1: Header-based Routing
```
X-Canary-User: true  →  100% 走 Canary
```

#### 方式 2: Cookie-based Routing
```
Cookie: canary=true  →  100% 走 Canary
```

#### 方式 3: IP 白名單
```
192.168.1.100-102  →  100% 走 Canary (QA 團隊)
```

#### 方式 4: 百分比流量分配
```
客戶端 IP 最後一位 = 0 或 4  →  5% 走 Canary
基於客戶端 IP 的雜湊分配
```

**配置示例**:
```nginx
# 5% 流量分配
upstream stable_backend {
    server stable-1:3000;
    server stable-2:3000;
    server stable-3:3000;
}

upstream canary_backend {
    server canary-1:3000;
    server canary-2:3000;
}

location /api/ {
    # 根據條件選擇後端
    set $backend "stable_backend";
    
    if ($http_x_canary_user = "true") {
        set $backend "canary_backend";
    }
    
    proxy_pass http://$backend;
}
```

### 4. Grafana 儀表板

**文件**: `grafana/provisioning/dashboards/canary-deployment.json`

**儀表板面板**:

1. **金絲雀流量分配進度** (時間序列圖)
   - 顯示當前流量比例 (0% → 100%)
   - X 軸：時間，Y 軸：流量百分比

2. **錯誤率對比** (統計圖)
   - Canary 錯誤率 vs Stable 錯誤率
   - 紅色警告阈值：5%

3. **延遲對比** (時間序列圖)
   - P95、P99 延遲對比
   - 上下限參考線

4. **CPU 使用率對比** (時間序列圖)
   - Canary CPU vs Stable CPU
   - 警告級：70%，臨界：90%

5. **記憶體使用率對比** (時間序列圖)
   - Canary Memory vs Stable Memory
   - 警告級：75%，臨界：85%

6. **吞吐量對比** (時間序列圖)
   - 請求數/秒對比

7. **實例健康狀態** (狀態圖)
   - 綠色：健康，紅色：宕機

8. **5 分鐘錯誤計數** (柱狀圖)
   - 5xx 錯誤計數堆疊

### 5. 自動回滾機制

**文件**: `canary-auto-rollback.sh`

**回滾觸發條件**:

| 條件 | 閾值 | 持續時間 | 優先級 |
|------|------|---------|--------|
| 錯誤率 | > 5% | 2 分鐘 | 🔴 Critical |
| P95 延遲 | > 500ms | 2 分鐘 | 🔴 Critical |
| 健康檢查 | 失敗 | 1 分鐘 | 🔴 Critical |
| CPU 使用率 | > 90% | 3 分鐘 | 🟡 Warning |
| 記憶體 | > 85% | 5 分鐘 | 🟡 Warning |

**回滾過程**:
1. 檢測到觸發條件 → 記錄事件
2. 逐步降低 Canary 流量 (每 10 秒降 10%)
3. 完全切回 Stable 版本 (0% Canary)
4. 執行 `kubectl rollout undo`
5. 等待部署穩定
6. 發送告警通知 (Slack/PagerDuty/Email)

---

## 部署步驟

### 步驟 1: 準備環境

```bash
# 確保已安裝依賴
kubectl version
helm version
curl --version
jq --version

# 檢查集群連接
kubectl cluster-info
kubectl get nodes
```

### 步驟 2: 部署 Prometheus

```bash
# 使用已有配置（如果使用 Helm）
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# 部署 Prometheus
helm install prometheus prometheus-community/prometheus \
  -f prometheus-values.yml \
  -n monitoring --create-namespace

# 驗證
kubectl get pods -n monitoring | grep prometheus
```

### 步驟 3: 部署告警規則

```bash
# 創建 ConfigMap
kubectl create configmap canary-alert-rules \
  --from-file=canary-alert-rules.yml \
  -n monitoring

# 更新 Prometheus 配置
kubectl apply -f prometheus-config.yml
```

### 步驟 4: 部署 Nginx 網關

```bash
# 創建 ConfigMap
kubectl create configmap nginx-canary-config \
  --from-file=nginx-canary.conf \
  -n production

# 部署 Nginx
kubectl apply -f nginx-canary-deployment.yml

# 驗證
kubectl get svc -n production | grep nginx
```

### 步驟 5: 部署 Grafana

```bash
# 創建 Grafana 儀表板
kubectl apply -f grafana-dashboard.yml -n monitoring

# 訪問 Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000
# 打開 http://localhost:3000
```

### 步驟 6: 啟動自動回滾監控

```bash
# 複製腳本到 Pod
kubectl cp canary-auto-rollback.sh <pod-name>:/scripts/ -n monitoring

# 執行監控
kubectl exec -it <pod-name> -n monitoring -- /scripts/canary-auto-rollback.sh \
  --service recommendation-service \
  --namespace production \
  --check-interval 15

# 或作為後台 Job
kubectl apply -f canary-rollback-job.yml -n monitoring
```

---

## 配置說明

### Prometheus 配置

```yaml
global:
  scrape_interval: 15s      # 採集間隔
  evaluation_interval: 15s  # 評估告警規則間隔

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093  # AlertManager 地址

rule_files:
  - '/etc/prometheus/canary-alert-rules.yml'

scrape_configs:
  # Canary 服務監控
  - job_name: 'recommendation-service'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['recommendation:3000']
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_deployment]
        target_label: deployment
```

### 環境變量配置

```bash
# Prometheus URL
export PROMETHEUS_URL="http://prometheus:9090"

# AlertManager URL
export ALERTMANAGER_URL="http://alertmanager:9093"

# Slack 通知
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/T.../B.../..."

# PagerDuty (可選)
export PAGERDUTY_INTEGRATION_KEY="..."

# 日誌文件
export LOG_FILE="/var/log/canary-rollback.log"
```

---

## 監控儀表板

### 訪問方式

```bash
# 本地訪問
kubectl port-forward -n monitoring svc/grafana 3000:3000
open http://localhost:3000

# 使用 Ingress (生產)
https://monitoring.example.com/grafana

# 默認認證
Username: admin
Password: (來自 Helm values)
```

### 關鍵指標解讀

#### 流量分配進度
- **含義**: Canary 版本當前承載的流量百分比
- **正常範圍**: 5% → 25% → 50% → 100%（每階段 5-10 分鐘）
- **異常情況**: 
  - 流量停滯：部署卡住
  - 流量下降：觸發了回滾

#### 錯誤率對比
- **正常**: Canary 錯誤率 ≈ Stable 錯誤率（±1%）
- **警告**: Canary 錯誤率 > Stable + 2%
- **臨界**: Canary 錯誤率 > 5%（自動回滾）

#### 延遲對比
- **正常**: Canary P95 ≤ Stable P95 + 100ms
- **警告**: Canary P95 > Stable P95 + 200ms
- **臨界**: Canary P95 > 500ms（自動回滾）

---

## 測試和驗證

### 測試 1: 流量分配驗證

```bash
# 發送 100 個請求，檢查分配情況
for i in {1..100}; do
  curl -s http://gateway:80/api/test -H "X-Deployment: check" | grep -o "deployment: [a-z]*"
done | sort | uniq -c

# 預期: 95% stable, 5% canary
```

### 測試 2: 錯誤率觸發回滾

```bash
# 在 Canary Pod 中注入錯誤
kubectl exec -it <canary-pod> -c app -- \
  export ERROR_RATE=0.1  # 10% 錯誤率

# 觀察 Grafana 儀表板
# 預期: 2 分鐘後自動回滾

# 驗證回滾完成
kubectl get deployment recommendation-service -o yaml | grep image
```

### 測試 3: 延遲觸發回滾

```bash
# 注入延遲
kubectl exec -it <canary-pod> -c app -- \
  export LATENCY=600ms  # 600ms 延遲

# 觀察 Grafana
# 預期: 2 分鐘後自動回滾
```

### 測試 4: 健康檢查失敗

```bash
# 停止 Canary Pod 的健康檢查服務
kubectl exec -it <canary-pod> -c app -- \
  kill $(pgrep -f health-check)

# 觀察告警
# 預期: 立即觸發回滾

# 驗證
kubectl logs <canary-pod> -c app | grep -i rollback
```

### 測試 5: Header-based Routing

```bash
# 測試 X-Canary-User header
curl -H "X-Canary-User: true" http://gateway:80/api/test
# 檢查響應頭 X-Deployment: canary

curl -H "X-Canary-User: false" http://gateway:80/api/test
# 檢查響應頭 X-Deployment: stable
```

---

## 故障排除

### 問題 1: Prometheus 無法採集指標

**症狀**: Grafana 顯示 "No data"

**排查步驟**:
```bash
# 1. 檢查 Prometheus 目標狀態
curl http://prometheus:9090/api/v1/targets | jq

# 2. 檢查服務連通性
kubectl get svc -A | grep recommendation
kubectl exec -it <prometheus-pod> -- curl http://recommendation:3000/metrics

# 3. 檢查 Pod 標籤
kubectl get pods -l app=recommendation -o yaml | grep labels
```

**解決方案**:
- 確保 Pod 暴露 `/metrics` 端點
- 確保 Service Port 正確
- 更新 Prometheus scrape_config

### 問題 2: 告警未觸發

**症狀**: 即使指標超閾值，也無告警

**排查步驟**:
```bash
# 1. 驗證告警規則
curl http://prometheus:9090/api/v1/rules | jq '.data.groups[0].rules'

# 2. 檢查 AlertManager
curl http://alertmanager:9093/api/v1/alerts

# 3. 檢查 Prometheus 日誌
kubectl logs -f <prometheus-pod> -n monitoring | grep -i alert
```

**解決方案**:
- 確保 alert_rules.yml 被正確加載
- 檢查告警表達式語法
- 驗證 AlertManager 連接

### 問題 3: 自動回滾不執行

**症狀**: 檢測到問題但不回滾

**排查步驟**:
```bash
# 1. 檢查回滾監控進程
ps aux | grep canary-auto-rollback

# 2. 查看監控日誌
tail -f /var/log/canary-rollback.log

# 3. 驗證 kubectl 權限
kubectl auth can-i rollout undo deployment --as=system:serviceaccount:monitoring:prometheus

# 4. 檢查 VirtualService
kubectl get vs recommendation-service -n production -o yaml
```

**解決方案**:
- 啟動回滾監控: `./canary-auto-rollback.sh`
- 檢查 RBAC 權限
- 驗證 Kubernetes 版本支持

### 問題 4: Grafana 儀表板無數據

**症狀**: 面板顯示 "No data in response"

**排查步驟**:
```bash
# 1. 驗證 Prometheus 數據源
curl http://prometheus:9090/api/v1/query?query=up

# 2. 檢查 PromQL 語句
# 在 Prometheus UI 中測試: http://prometheus:9090

# 3. 檢查指標標籤
curl http://prometheus:9090/api/v1/labels | jq '.data[]'
```

**解決方案**:
- 確保指標被正確採集
- 驗證 PromQL 查詢語法
- 檢查標籤選擇器

---

## 最佳實踐

### 1. 告警管理

✅ **推薦**:
- 設置分級告警（Info、Warning、Critical）
- 配置時間段告警規則（如：避免夜間低優先級告警）
- 使用告警沉默期避免風暴

❌ **避免**:
- 過多敏感告警導致告警疲勞
- 缺乏上下文信息的告警
- 不配置 AlertManager 路由

### 2. 流量分配策略

✅ **推薦**:
- 遵循 5% → 25% → 50% 進度
- 每階段至少 5-10 分鐘監控
- 優先使用 Header 路由進行 QA 測試
- 生產環境使用百分比流量分配

❌ **避免**:
- 跳過階段直接 100% 部署
- 過快推進（<3 分鐘）
- 在高峰期部署

### 3. 監控和告警

✅ **推薦**:
- 監控 SLO/SLI（99.95% 可用性、P99 <500ms）
- 設置多維度告警（error rate、latency、CPU、Memory）
- 定期審查監控指標

❌ **避免**:
- 只監控單一指標（如只看錯誤率）
- 忽視資源使用率告警
- 不記錄部署歷史

### 4. 回滾管理

✅ **推薦**:
- 保持完整的回滾歷史記錄
- 設置合理的回滾閾值
- 在回滾後進行 RCA（根本原因分析）
- 建立回滾後的驗證流程

❌ **避免**:
- 過敏感的回滾條件（誤觸發多次）
- 回滾後不分析原因
- 沒有回滾前的備份

### 5. 測試和驗證

✅ **推薦**:
- 部署前在 Staging 環境進行完整測試
- 使用 A/B 測試驗證新功能
- 建立自動化測試套件
- 收集用戶反饋

❌ **避免**:
- 跳過 Staging 階段直接 Production
- 沒有功能測試
- 忽視用戶反饋

---

## SLO/SLI 定義

### Service Level Objectives (SLO)

| 指標 | 目標 | 詳情 |
|------|------|------|
| 可用性 | 99.95% | 每月最多 21 分鐘宕機 |
| 延遲 P99 | < 500ms | 99% 請求在 500ms 內響應 |
| 延遲 P95 | < 300ms | 95% 請求在 300ms 內響應 |
| 錯誤率 | < 0.1% | 99.9% 請求成功 |

### Service Level Indicators (SLI)

- `http_requests_total` - 請求計數
- `http_request_duration_seconds` - 請求延遲
- `http_requests_total{status=~"5.."}` - 5xx 錯誤
- `up{deployment="canary"}` - 實例健康狀態

---

## 完成清單

- ✅ Prometheus 監控配置
- ✅ 灰度部署告警規則 (10+ 條)
- ✅ Nginx 金絲雀網關配置
- ✅ 流量分配機制 (4 種方式)
- ✅ Grafana 儀表板 (8 個面板)
- ✅ 自動回滾機制腳本
- ✅ 回滾觸發條件 (5 種)
- ✅ 多渠道通知 (Slack、PagerDuty)
- ✅ 詳細文檔和示例
- ✅ 測試驗證方案

---

## 下一步

1. **部署到生產**: 按照部署步驟逐個執行
2. **持續優化**: 根據實際運行調整閾值
3. **團隊培訓**: 進行 DevOps 團隊培訓
4. **監控完善**: 添加更多自定義指標
5. **自動化升級**: 實現完全自動化的灰度部署流程

---

**支持與聯繫**:
- 文檔: `/monitoring/CANARY_DEPLOYMENT.md`
- 腳本: `/monitoring/canary-auto-rollback.sh`
- 配置: `/monitoring/canary-alert-rules.yml`
- 儀表板: `/monitoring/grafana/provisioning/dashboards/canary-deployment.json`

**最後更新**: 2026-02-19 13:24 GMT+8
