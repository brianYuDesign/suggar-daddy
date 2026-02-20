# 灰度部署 - 快速參考卡

## 🚀 快速啟動 (5 分鐘)

### 1. 驗證前置條件
```bash
kubectl version && helm version && curl --version && jq --version
kubectl cluster-info
```

### 2. 一鍵部署
```bash
cd /path/to/monitoring
chmod +x setup-canary-deployment.sh
./setup-canary-deployment.sh --namespace production --enable-slack
```

### 3. 訪問儀表板
```bash
kubectl port-forward -n monitoring svc/grafana 3000:3000
# 打開 http://localhost:3000
# Username: admin
# Password: (來自 Helm values)
```

---

## 📊 監控儀表板位置

| 組件 | 地址 | 用途 |
|------|------|------|
| **Prometheus** | http://prometheus:9090 | 指標查詢和告警配置 |
| **Grafana** | http://grafana:3000 | 可視化儀表板 |
| **AlertManager** | http://alertmanager:9093 | 告警管理 |
| **Nginx 網關** | http://gateway:80 | 流量分配 |

---

## 🔍 常用查詢命令

### Prometheus PromQL 查詢

```promql
# 1. Canary 流量比例
(rate(http_requests_total{deployment="canary"}[1m]) / 
 (rate(http_requests_total{deployment="canary"}[1m]) + 
  rate(http_requests_total{deployment="stable"}[1m])) * 100)

# 2. Canary 錯誤率
(rate(http_requests_total{deployment="canary",status=~"5.."}[2m]) / 
 rate(http_requests_total{deployment="canary"}[2m]))

# 3. Canary P95 延遲
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{deployment="canary"}[2m]))

# 4. 實例健康狀態
up{deployment="canary"}

# 5. CPU 使用率
rate(process_cpu_seconds_total{deployment="canary"}[1m]) * 100

# 6. 記憶體使用率 (GB)
process_resident_memory_bytes{deployment="canary"} / 1073741824
```

### kubectl 常用命令

```bash
# 查看 Nginx 部署
kubectl get deployment nginx-canary-gateway -n production
kubectl logs -f deployment/nginx-canary-gateway -n production

# 查看告警規則
kubectl get configmap canary-alert-rules -n monitoring
kubectl describe configmap canary-alert-rules -n monitoring

# 查看回滾監控日誌
kubectl logs -f deployment/canary-rollback-monitor -n monitoring

# 強制更新 Nginx 配置
kubectl rollout restart deployment/nginx-canary-gateway -n production

# 查看部署歷史
kubectl rollout history deployment/recommendation-service -n production

# 手動回滾
kubectl rollout undo deployment/recommendation-service -n production
```

---

## ⚠️ 告警觸發條件 (實時)

| 告警 | 條件 | 持續時間 | 回滾 |
|------|------|---------|------|
| **CanaryHighErrorRate** | 錯誤率 > 5% | 2 分鐘 | ✅ |
| **CanaryHighLatency** | P95 > 500ms | 2 分鐘 | ✅ |
| **CanaryUnhealthyInstances** | Pod 宕機 | 1 分鐘 | ✅ |
| **CanaryHighCPU** | CPU > 80% | 2 分鐘 | ❌ |
| **CanaryHighMemory** | 記憶體 > 85% | 2 分鐘 | ❌ |
| **CanaryTrafficAllocationAbnormal** | 流量 > 10% | 2 分鐘 | ❌ |

---

## 🔄 灰度部署流程

```
┌─────────────────────────────────────────────────────┐
│ 步驟 1: 開始部署 (Phase 1: 5% Canary)              │
│ ├─ 部署新版本到 Canary 環境                         │
│ ├─ 等待 5-10 分鐘                                   │
│ ├─ 監控: 錯誤率 < 1%, P95 < 300ms                  │
│ └─ 決定: 繼續 → Phase 2 或 回滾                    │
└─────────────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│ 步驟 2: 25% Canary                                  │
│ ├─ 增加流量到 25%                                   │
│ ├─ 等待 5-10 分鐘                                   │
│ ├─ 監控: 對比 Stable 版本指標                       │
│ └─ 決定: 繼續 → Phase 3 或 回滾                    │
└─────────────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│ 步驟 3: 50% Canary                                  │
│ ├─ 增加流量到 50%                                   │
│ ├─ 等待 5-10 分鐘                                   │
│ ├─ 深度驗證: 性能、功能、用戶反饋                    │
│ └─ 決定: 繼續 → Phase 4 或 回滾                    │
└─────────────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│ 步驟 4: 100% Canary (全量發佈)                      │
│ ├─ 升級所有流量到新版本                             │
│ ├─ 進行最終驗證                                     │
│ ├─ 監控 1 小時以上                                  │
│ └─ 完成: 新版本成為 Stable                         │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 部署決策樹

```
監控指標良好? (錯誤率 <1%, 延遲 <300ms, CPU/Memory 正常)
├─ 是 → 是否收到用戶負面反饋?
│       ├─ 是 → 調查問題 → 回滾或修復
│       └─ 否 → 繼續下一階段
└─ 否 → 立即檢查問題
        ├─ 可修復 → 修復 + 繼續部署
        └─ 不可修復 → 立即回滾
```

---

## 📈 Grafana 儀表板面板說明

### Panel 1: 金絲雀流量分配進度
- **X 軸**: 時間 (5-30 分鐘範圍)
- **Y 軸**: 流量百分比 (0-100%)
- **正常曲線**: 5% → 25% → 50% → 100% (階梯式上升)
- **異常情況**: 
  - 平坦線 = 部署卡住
  - 下降線 = 觸發了回滾

### Panel 2: 錯誤率對比
- **藍線**: Canary 錯誤率
- **橙線**: Stable 錯誤率
- **紅線**: 5% 警告閾值
- **異常**: Canary 線大幅上升

### Panel 3-4: 延遲對比 (P95/P99)
- **正常**: 兩條線應該接近
- **警告**: Canary 線超過 Stable 200ms+
- **臨界**: Canary P95 > 500ms

### Panel 5-6: 資源使用率
- **綠色區域**: 正常 (CPU <70%, Memory <75%)
- **黃色區域**: 警告 (CPU 70-90%, Memory 75-85%)
- **紅色區域**: 臨界 (CPU >90%, Memory >85%)

---

## 🔧 故障排除速查表

| 問題 | 症狀 | 解決方案 |
|------|------|--------|
| 無法採集指標 | Grafana 顯示 "No data" | 1. 檢查 Pod `/metrics` 端點<br>2. 驗證 Service Port<br>3. 更新 Prometheus scrape config |
| 告警未觸發 | 即使指標超閾值 | 1. 驗證 alert rules 語法<br>2. 檢查 Prometheus 評估間隔<br>3. 檢查 AlertManager 連接 |
| 回滾不執行 | 檢測到問題但不回滾 | 1. 檢查回滾監控進程<br>2. 驗證 kubectl RBAC 權限<br>3. 檢查 VirtualService 配置 |
| 流量分配不均 | Canary 流量 > 10% 或 < 1% | 1. 驗證 Nginx 配置<br>2. 檢查後端健康狀態<br>3. 重啟 Nginx |
| Slack 不通知 | 告警觸發但無 Slack 消息 | 1. 驗證 Webhook URL<br>2. 檢查網絡連接<br>3. 查看 AlertManager 日誌 |

---

## 📞 常用聯繫方式

### 查看服務日誌
```bash
# Prometheus
kubectl logs -f <prometheus-pod> -n monitoring

# Grafana
kubectl logs -f <grafana-pod> -n monitoring

# Nginx 網關
kubectl logs -f <nginx-pod> -n production | grep -i error

# 回滾監控
tail -f /var/log/canary-rollback.log
```

### 進入 Pod 調試
```bash
# 進入 Nginx Pod
kubectl exec -it <nginx-pod> -n production -- /bin/sh

# 進入 Prometheus Pod
kubectl exec -it <prometheus-pod> -n monitoring -- /bin/sh

# 查看實時流量
kubectl exec -it <nginx-pod> -n production -- \
  tail -f /var/log/nginx/access.log | grep canary
```

---

## 📝 部署檢查清單

部署前:
- [ ] 代碼通過 Code Review
- [ ] 所有單元測試通過
- [ ] 集成測試通過
- [ ] Staging 環境驗證通過
- [ ] 告警規則已驗證

部署中:
- [ ] 選擇合適的時間窗口 (避免高峰期)
- [ ] 備好 runbook
- [ ] 告知團隊成員
- [ ] 準備好通信渠道
- [ ] 監控儀表板已打開

部署後:
- [ ] 驗證 5% 金絲雀階段
- [ ] 檢查錯誤日誌
- [ ] 收集用戶反饋
- [ ] 決定是否繼續下一階段
- [ ] 部署完成後進行事後總結

---

## 🌐 環境變量配置

```bash
# Kubernetes
export KUBECONFIG=~/.kube/config
export NAMESPACE=production
export MONITORING_NS=monitoring

# Prometheus & Grafana
export PROMETHEUS_URL="http://prometheus:9090"
export GRAFANA_URL="http://grafana:3000"
export GRAFANA_ADMIN_PASSWORD="your-password"

# 通知渠道
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/T.../B.../..."
export PAGERDUTY_INTEGRATION_KEY="..."
export ALERTMANAGER_URL="http://alertmanager:9093"

# 回滾策略
export ERROR_RATE_THRESHOLD=0.05        # 5%
export LATENCY_THRESHOLD=0.5            # 500ms
export HEALTH_CHECK_TIMEOUT=60          # 60 秒
```

---

## 📚 相關文檔

- 📖 [完整部署指南](./CANARY_DEPLOYMENT.md)
- 🔧 [Nginx 配置詳解](./nginx-canary.conf)
- ⚠️ [告警規則列表](./canary-alert-rules.yml)
- 🤖 [自動回滾腳本](./canary-auto-rollback.sh)
- 🎯 [快速部署腳本](./setup-canary-deployment.sh)

---

**最後更新**: 2026-02-19  
**版本**: 1.0  
**責任人**: DevOps Team
