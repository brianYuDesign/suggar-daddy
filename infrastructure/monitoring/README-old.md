# 📊 Suggar Daddy 監控系統

> **Prometheus + Grafana + Alertmanager** 完整監控解決方案

[![Status](https://img.shields.io/badge/status-production_ready-success)](.)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](.)
[![Docs](https://img.shields.io/badge/docs-complete-brightgreen)](../../docs/MONITORING.md)

---

## 🚀 快速開始（30秒）

```bash
# 1. 進入監控目錄
cd infrastructure/monitoring

# 2. 啟動監控系統
./start-monitoring.sh
# 或
docker-compose -f docker-compose.monitoring.yml up -d

# 3. 訪問 Grafana
open http://localhost:3001
# 帳號: admin / 密碼: admin123
```

---

## 📊 訪問地址

| 服務 | 地址 | 用途 |
|------|------|------|
| 🎨 **Grafana** | http://localhost:3001 | 數據可視化（主要入口） |
| 🔍 **Prometheus** | http://localhost:9090 | 指標查詢和告警規則 |
| 🔔 **Alertmanager** | http://localhost:9093 | 告警管理 |
| 📈 **Node Exporter** | http://localhost:9100 | 系統指標 |
| 🐳 **cAdvisor** | http://localhost:8080 | 容器指標 |

---

## 📈 Dashboards

登入 Grafana 後可查看：

1. **系統指標監控** - CPU、記憶體、磁碟、網路
2. **應用指標監控** - RPS、錯誤率、延遲、資料庫
3. **業務指標監控** - 註冊、支付、配對、營收

---

## 🚨 監控範圍

### 微服務（11 個）
```
✅ API Gateway         ✅ Auth Service        ✅ User Service
✅ Matching Service    ✅ Notification Service ✅ Messaging Service
✅ Content Service     ✅ Payment Service     ✅ Media Service
✅ Subscription Service ✅ DB Writer Service   ✅ Admin Service
```

### 基礎設施
```
✅ PostgreSQL   ✅ Redis   ✅ Kafka   ✅ Docker Containers
```

---

## 🔔 告警級別

| 級別 | 響應時間 | 通知 | 範例 |
|------|---------|------|------|
| 🚨 **Critical (P0)** | 立即 | Slack + Email | 服務不可用、錯誤率 > 5% |
| ⚠️ **Warning (P1)** | 1小時內 | Slack | CPU > 80%、延遲 > 500ms |
| ℹ️ **Info (P2)** | 24小時內 | Slack | 快取命中率低 |

---

## 🛠️ 常用命令

### 啟動/停止
```bash
# 啟動
docker-compose -f docker-compose.monitoring.yml up -d

# 停止
docker-compose -f docker-compose.monitoring.yml down

# 重啟
docker-compose -f docker-compose.monitoring.yml restart

# 查看狀態
docker-compose -f docker-compose.monitoring.yml ps

# 查看日誌
docker-compose -f docker-compose.monitoring.yml logs -f [service]
```

### 健康檢查
```bash
# Prometheus
curl http://localhost:9090/-/healthy

# Grafana
curl http://localhost:3001/api/health

# Alertmanager
curl http://localhost:9093/-/healthy
```

### 重新載入配置
```bash
# Prometheus（熱重載）
curl -X POST http://localhost:9090/-/reload

# Alertmanager（熱重載）
curl -X POST http://localhost:9093/-/reload

# Grafana（重啟容器）
docker restart suggar-daddy-grafana
```

---

## 📁 目錄結構

```
infrastructure/monitoring/
├── docker-compose.monitoring.yml   # Docker Compose 配置
├── start-monitoring.sh             # 快速啟動腳本
├── MONITORING-SYSTEM-REPORT.md     # 完整實施報告
├── README.md                        # 本文件
│
├── prometheus/
│   ├── prometheus.yml              # Prometheus 主配置
│   └── alerts.yml                  # 告警規則
│
├── alertmanager/
│   └── alertmanager.yml            # Alertmanager 配置
│
└── grafana/
    ├── datasources.yml             # 數據源配置
    └── dashboards/
        ├── dashboards.yml          # Dashboard provisioning
        ├── system-metrics.json     # 系統指標 Dashboard
        ├── application-metrics.json # 應用指標 Dashboard
        └── business-metrics.json   # 業務指標 Dashboard
```

---

## 🔧 配置告警通知

編輯專案根目錄的 `.env` 文件：

```bash
# Slack Webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Email SMTP
SMTP_HOST=smtp.gmail.com:587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
ALERT_EMAIL_TO=devops@suggar-daddy.com
```

重啟 Alertmanager：
```bash
docker restart suggar-daddy-alertmanager
```

---

## 📊 PromQL 快速查詢

```promql
# 每秒請求數
rate(http_requests_total[5m])

# 錯誤率
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ sum(rate(http_requests_total[5m]))

# P95 延遲
histogram_quantile(0.95, 
  rate(http_request_duration_seconds_bucket[5m]))

# CPU 使用率
rate(container_cpu_usage_seconds_total[5m]) 
/ (container_spec_cpu_quota / 100000) * 100

# 記憶體使用率
container_memory_working_set_bytes 
/ container_spec_memory_limit_bytes * 100
```

---

## 🆘 故障排查

### Prometheus 無法抓取服務
```bash
# 1. 檢查服務是否運行
docker ps | grep <service-name>

# 2. 測試 metrics 端點
curl http://localhost:<port>/metrics

# 3. 檢查網路
docker network inspect suggar-daddy-network

# 4. 查看 Prometheus 日誌
docker logs suggar-daddy-prometheus
```

### Grafana 顯示 "No data"
```bash
# 1. 測試 Prometheus 連接
curl http://localhost:9090/-/healthy

# 2. 檢查數據源配置
# Grafana > Configuration > Data Sources > Prometheus > Test

# 3. 重啟 Grafana
docker restart suggar-daddy-grafana
```

### 告警未發送
```bash
# 1. 檢查 Alertmanager 狀態
open http://localhost:9093/#/alerts

# 2. 驗證通知配置
docker exec -it suggar-daddy-alertmanager \
  cat /etc/alertmanager/alertmanager.yml

# 3. 查看 Alertmanager 日誌
docker logs suggar-daddy-alertmanager --tail 100
```

---

## 📚 完整文檔

詳細文檔請參考：[docs/MONITORING.md](../../docs/MONITORING.md)

內容包括：
- 🏗️ 詳細架構說明
- 📊 Dashboard 使用指南
- 🚨 告警處理 SOP
- 🔧 配置說明
- 💡 最佳實踐
- ❓ 常見問題排查

---

## 📈 資源需求

| 組件 | CPU | 記憶體 | 磁碟 |
|------|-----|--------|------|
| Prometheus | 0.5-1.0 | 512MB-2GB | ~50MB/天 |
| Grafana | 0.25-0.5 | 256-512MB | ~100MB |
| Alertmanager | 0.1-0.25 | 128-256MB | ~10MB |
| Exporters | 0.3 | 512MB | - |
| **總計** | **~1.5 CPU** | **~2-3GB** | **~1.5GB/月** |

---

## ✅ 快速檢查清單

啟動後檢查：

- [ ] 所有容器運行中 (`docker-compose ps`)
- [ ] Prometheus Targets 為 UP (`http://localhost:9090/targets`)
- [ ] Grafana 可訪問 (`http://localhost:3001`)
- [ ] Dashboards 有數據
- [ ] 告警規則已加載 (`http://localhost:9090/alerts`)

---

## 🎯 監控指標

### 黃金信號
- ✅ **Latency（延遲）** - P50/P95/P99
- ✅ **Traffic（流量）** - RPS
- ✅ **Errors（錯誤）** - 錯誤率
- ✅ **Saturation（飽和度）** - CPU/Memory 使用率

### USE 方法（資源）
- ✅ **Utilization（使用率）** - CPU/Memory %
- ✅ **Saturation（飽和度）** - 等待隊列
- ✅ **Errors（錯誤）** - 錯誤數量

### RED 方法（服務）
- ✅ **Rate（速率）** - 每秒請求數
- ✅ **Errors（錯誤）** - 錯誤請求數
- ✅ **Duration（時長）** - 請求時長

---

## 🔄 維護計劃

### 每日
- [ ] 檢查 Critical 告警
- [ ] 查看系統資源趨勢

### 每週
- [ ] 審查告警統計
- [ ] 優化誤報告警
- [ ] 檢查磁碟空間

### 每月
- [ ] 審查 Dashboard 有效性
- [ ] 更新告警閾值
- [ ] 清理無用指標

---

## 📞 支持

- **文檔**: [docs/MONITORING.md](../../docs/MONITORING.md)
- **報告**: [MONITORING-SYSTEM-REPORT.md](./MONITORING-SYSTEM-REPORT.md)
- **Slack**: #devops-monitoring
- **Email**: devops@suggar-daddy.com

---

## 📜 版本資訊

- **版本**: 1.0.0
- **狀態**: ✅ Production Ready
- **建立日期**: 2024-02-14
- **最後更新**: 2024-02-14

---

**🎉 監控系統已就緒！開始守護你的應用吧！**
