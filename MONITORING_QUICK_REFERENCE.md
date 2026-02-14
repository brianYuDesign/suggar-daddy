# 🚀 監控系統快速參考

## 一鍵命令

```bash
# 進入監控目錄
cd infrastructure/monitoring

# 啟動監控系統
docker-compose -f docker-compose.monitoring.yml up -d

# 查看狀態
docker-compose -f docker-compose.monitoring.yml ps

# 查看日誌
docker-compose -f docker-compose.monitoring.yml logs -f

# 停止監控系統
docker-compose -f docker-compose.monitoring.yml down

# 重啟特定服務
docker restart suggar-daddy-prometheus
docker restart suggar-daddy-grafana
docker restart suggar-daddy-alertmanager
```

---

## 訪問地址

| 服務 | URL | 帳號密碼 |
|------|-----|----------|
| 🎨 Grafana | http://localhost:3001 | admin / admin123 |
| 🔍 Prometheus | http://localhost:9090 | - |
| 🔔 Alertmanager | http://localhost:9093 | - |
| 📊 Node Exporter | http://localhost:9100/metrics | - |
| 🐳 cAdvisor | http://localhost:8081 | - |

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

# 容器重啟次數
rate(kube_pod_container_status_restarts_total[15m])
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
# 1. 檢查數據源
# Grafana UI > Configuration > Data Sources > Prometheus > Test

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

## 監控指標理解

### 系統指標
- **CPU 使用率**: 70% 以下正常，> 80% 需要關注
- **記憶體使用率**: 80% 以下正常，> 90% 需要關注
- **磁碟使用率**: 85% 以下正常，> 95% 緊急

### 應用指標
- **錯誤率**: < 1% 正常，> 5% 需要立即處理
- **P95 延遲**: < 500ms 正常，> 1s 需要關注
- **RPS**: 根據業務量判斷

### 資料庫指標
- **PostgreSQL 連線**: < 80% 正常
- **Redis 記憶體**: < 80% 正常
- **查詢時長**: 根據業務判斷

---

## 緊急聯絡

- **On-Call**: #devops-oncall
- **告警頻道**: #alerts-critical
- **技術支援**: devops@suggar-daddy.com

---

**快速參考版本**: 1.0.0  
**更新日期**: 2024-02-14
