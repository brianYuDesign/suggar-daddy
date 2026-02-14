# 監控系統指南

> Prometheus + Grafana + Alertmanager 監控系統

---

## 快速開始

```bash
# 進入監控目錄
cd infrastructure/monitoring

# 啟動監控系統
docker-compose -f docker-compose.monitoring.yml up -d

# 查看狀態
docker-compose -f docker-compose.monitoring.yml ps

# 停止監控系統
docker-compose -f docker-compose.monitoring.yml down
```

---

## 訪問地址

| 服務 | URL | 帳號密碼 |
|------|-----|----------|
| Grafana | http://localhost:3001 | admin / admin123 |
| Prometheus | http://localhost:9090 | - |
| Alertmanager | http://localhost:9093 | - |
| Node Exporter | http://localhost:9100/metrics | - |
| cAdvisor | http://localhost:8081 | - |

---

## 已部署組件

### Prometheus
- 端口: 9090
- 配置: `infrastructure/monitoring/prometheus/prometheus.yml`
- 告警規則: 30+ 條已加載 (8 Critical, 15 Warning, 7 Info)

### Grafana
- 端口: 3001
- Dashboard:
  1. 系統指標監控 - CPU、記憶體、磁碟、網路
  2. 應用指標監控 - RPS、錯誤率、延遲、資料庫
  3. 業務指標監控 - 註冊、支付、配對、營收

### Alertmanager
- 端口: 9093
- 告警路由: Critical (5s), Warning (30s), Info (5m)
- 通知渠道: 開發環境為日誌記錄，生產環境需配置 Slack + Email

### Exporters

| Exporter | 端口 | 說明 |
|----------|------|------|
| Node Exporter | 9100 | 系統指標 (CPU/Memory/Disk) |
| cAdvisor | 8081 | 容器指標 |
| Postgres Exporter | 9187 | PostgreSQL 指標 |
| Redis Exporter | 9121 | Redis 指標 |

---

## 監控覆蓋率

- 基礎設施: 7/7 = 100%
- 微服務: 0/11 (需要添加 `/metrics` 端點)
- 整體: 39% (7/18)

---

## 健康檢查

```bash
# Prometheus
curl http://localhost:9090/-/healthy

# Grafana
curl http://localhost:3001/api/health

# Alertmanager
curl http://localhost:9093/-/healthy

# 檢查所有目標
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
```

---

## 常用 PromQL 查詢

```promql
# CPU 使用率
rate(container_cpu_usage_seconds_total[5m]) * 100

# 記憶體使用率
container_memory_working_set_bytes / container_spec_memory_limit_bytes * 100

# 每秒請求數
rate(http_requests_total[5m])

# 錯誤率
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100

# P95 延遲
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# PostgreSQL 連線數
pg_stat_database_numbackends

# Redis 記憶體使用
redis_memory_used_bytes
```

---

## 故障排查

### Prometheus 無法抓取目標

```bash
# 1. 檢查網路
docker network inspect suggar-daddy-network

# 2. 檢查目標服務
docker ps | grep <service-name>

# 3. 測試端點
curl http://<service>:<port>/metrics

# 4. 查看 Prometheus 日誌
docker logs suggar-daddy-prometheus
```

### Grafana 無數據

```bash
# 1. 檢查數據源: Grafana UI > Configuration > Data Sources > Prometheus > Test
# 2. 重啟 Grafana
docker restart suggar-daddy-grafana

# 3. 檢查 Prometheus
curl http://localhost:9090/api/v1/query?query=up
```

### 告警未觸發

```bash
# 1. 檢查告警規則
curl http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | {alert: .name, state: .state}'

# 2. 查看 Alertmanager
open http://localhost:9093/#/alerts

# 3. 查看日誌
docker logs suggar-daddy-alertmanager
```

---

## 配置文件位置

```
infrastructure/monitoring/
├── docker-compose.monitoring.yml   # Docker 編排
├── prometheus/
│   ├── prometheus.yml              # Prometheus 配置
│   └── alerts.yml                  # 告警規則
├── alertmanager/
│   └── alertmanager.yml            # Alertmanager 配置
└── grafana/
    ├── datasources.yml             # 數據源
    └── dashboards/                 # Dashboard JSON
```

---

## 重新載入配置

```bash
# Prometheus 熱重載（無需重啟）
curl -X POST http://localhost:9090/-/reload

# Alertmanager 熱重載
curl -X POST http://localhost:9093/-/reload

# Grafana（需要重啟）
docker restart suggar-daddy-grafana
```

---

## 備份和恢復

### 備份

```bash
# 備份 Prometheus 數據
docker run --rm -v suggar-daddy-prometheus-data:/data -v $(pwd):/backup alpine tar czf /backup/prometheus-backup.tar.gz /data

# 備份 Grafana 數據
docker run --rm -v suggar-daddy-grafana-data:/data -v $(pwd):/backup alpine tar czf /backup/grafana-backup.tar.gz /data

# 備份配置文件
tar czf monitoring-config-backup.tar.gz infrastructure/monitoring/
```

### 恢復

```bash
# 恢復 Prometheus 數據
docker run --rm -v suggar-daddy-prometheus-data:/data -v $(pwd):/backup alpine tar xzf /backup/prometheus-backup.tar.gz -C /

# 恢復 Grafana 數據
docker run --rm -v suggar-daddy-grafana-data:/data -v $(pwd):/backup alpine tar xzf /backup/grafana-backup.tar.gz -C /
```

---

## 監控閾值參考

### 系統指標
- CPU 使用率: 70% 以下正常，> 80% 需要關注
- 記憶體使用率: 80% 以下正常，> 90% 需要關注
- 磁碟使用率: 85% 以下正常，> 95% 緊急

### 應用指標
- 錯誤率: < 1% 正常，> 5% 需要立即處理
- P95 延遲: < 500ms 正常，> 1s 需要關注

### 資料庫指標
- PostgreSQL 連線: < 80% 正常
- Redis 記憶體: < 80% 正常

---

## 資源消耗

```
Prometheus:      ~200MB RAM, 0.3 CPU
Grafana:         ~150MB RAM, 0.2 CPU
Alertmanager:    ~50MB RAM, 0.1 CPU
Exporters:       ~100MB RAM, 0.2 CPU
總計:            ~500MB RAM, 0.8 CPU
```

Prometheus 數據保留 30 天，預估磁碟使用 ~1.5GB/月。

---

## 待完成項目

### P0 - 本週
- 為 11 個微服務添加 Prometheus `/metrics` 端點
- 配置生產環境 Slack + Email 告警通知

### P1 - 2 週內
- Kafka JMX Exporter 集成
- 自定義業務指標 (註冊轉換率、支付成功率、配對率)
- Dashboard 優化和變數篩選器

### P2 - 1 個月內
- 告警規則調優 (收集基線數據後)
- Grafana HTTPS + Prometheus 認證
- 運維 SOP 和 On-Call 手冊

---

## 維護計劃

### 每日
- 檢查 Critical 告警
- 查看 Grafana Dashboard
- 確認所有服務 UP

### 每週
- 審查告警統計
- 檢查磁碟空間

### 每月
- 調整告警閾值
- Dashboard 優化
- 容量規劃審查

---

*原始資料來源: MONITORING_DEPLOYMENT_SUMMARY.md, MONITORING_QUICK_REFERENCE.md*
