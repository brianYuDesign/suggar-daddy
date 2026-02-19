# 故障排查指南 - Sugar Daddy 監控系統

## 快速診斷檢查清單

### ✅ 啟動前檢查

```bash
# 1. 檢查 Docker
docker --version
docker-compose --version

# 2. 檢查磁盤空間
df -h
# 確保至少有 5GB 自由空間

# 3. 檢查埠可用性
lsof -i :9090 :3010 :9200 :5601 :3000 :3001
# 如果有占用，需要停止相應服務或更改埠

# 4. 創建日誌目錄
mkdir -p /var/log/sugar-daddy
```

### ✅ 啟動檢查

```bash
# 1. 啟動服務
cd /Users/brianyu/.openclaw/workspace
docker-compose up -d

# 2. 等待 30 秒（容器啟動需要時間）
sleep 30

# 3. 檢查容器狀態
docker-compose ps
# 所有容器應該顯示 "Up" 狀態

# 4. 檢查關鍵服務日誌
docker-compose logs prometheus | tail -20
docker-compose logs elasticsearch | tail -20
docker-compose logs grafana | tail -20
```

---

## 問題分類和解決

### 🔴 級別 1: 服務完全無法啟動

#### 問題 1.1: 容器啟動失敗

```bash
# 症狀: docker-compose up 出現錯誤

# 診斷
docker-compose logs --tail=50

# 常見原因和解決方案
# 原因1: 埠被占用
netstat -tlnp | grep -E '9090|3010|9200|5601'
# 解決: 停止占用埠的服務或更改 docker-compose.yml 中的埠

# 原因2: 磁盤空間不足
df -h /
# 解決: 清理磁盤空間或擴展分區

# 原因3: 記憶體不足
free -h
# 解決: 增加 Docker 分配的記憶體，或停止其他容器

# 原因4: Docker 網絡問題
docker network ls
docker-compose down
docker-compose up -d
```

#### 問題 1.2: 某個容器無法啟動

```bash
# 找出無法啟動的容器
docker-compose ps

# 查看詳細錯誤
docker-compose logs <service-name>

# 示例排查

# PostgreSQL 無法啟動
docker-compose logs postgres
# 常見錯誤: "could not create shared memory segment"
# 解決: docker-compose down && docker-compose up -d

# Elasticsearch 無法啟動
docker-compose logs elasticsearch
# 常見錯誤: "max virtual memory areas vm.max_map_count"
# 解決 (Linux):
sudo sysctl -w vm.max_map_count=262144
# 解決 (macOS): Docker Desktop 設置中增加記憶體

# Redis 無法啟動
docker-compose logs redis
# 常見錯誤: "AOF is corrupted"
# 解決: 刪除 volume 並重啟
docker-compose down
docker volume rm sugar-daddy_redis_data
docker-compose up -d
```

---

### 🟠 級別 2: 服務運行但無法訪問

#### 問題 2.1: 無法訪問 Web UI

```bash
# 症狀: 訪問 http://localhost:3010 返回連接錯誤

# 診斷步驟

# 1. 檢查容器是否運行
docker-compose ps grafana
# 應該顯示 "Up"

# 2. 檢查埠映射
docker port sugar-daddy-grafana
# 應該顯示 "3000/tcp -> 0.0.0.0:3010"

# 3. 檢查容器日誌
docker-compose logs grafana
# 查找錯誤信息

# 4. 測試網絡連通性
docker-compose exec grafana curl -f http://localhost:3000/api/health
# 應該返回 200 OK

# 5. 重啟容器
docker-compose restart grafana
sleep 10
# 重新訪問 UI
```

#### 問題 2.2: 無法連接到數據源

```bash
# 症狀: Grafana/Kibana 顯示 "Connection Refused"

# 診斷: 測試容器之間的連通性

# 1. 從 Grafana 測試到 Prometheus
docker-compose exec grafana curl -v http://prometheus:9090/api/v1/targets

# 2. 從 Kibana 測試到 Elasticsearch
docker-compose exec kibana curl -v http://elasticsearch:9200/_cluster/health

# 3. 從 Logstash 測試到 Elasticsearch
docker-compose exec logstash curl -v http://elasticsearch:9200/_cat/indices

# 常見原因和解決方案

# 原因1: DNS 解析失敗
docker-compose exec grafana nslookup prometheus
# 解決: 檢查 docker-compose.yml 中的服務名稱是否正確

# 原因2: 容器未啟動或已崩潰
docker-compose ps
# 解決: 重啟相應容器

# 原因3: 防火牆阻止
# macOS/Windows: Docker Desktop 防火牆設置
# Linux: 檢查 iptables 規則
sudo iptables -L -n

# 解決方案: 重新配置 docker-compose 網絡
docker network rm sugar-daddy-network
docker-compose down
docker-compose up -d
```

---

### 🟡 級別 3: 服務運行但無數據

#### 問題 3.1: Prometheus 無指標數據

```bash
# 症狀: Prometheus UI 顯示 "No data" 或 "Query timeout"

# 診斷步驟

# 1. 檢查 Prometheus 是否正常運行
curl -s http://localhost:9090/api/v1/query?query=up | jq .

# 2. 檢查目標狀態
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[].health'
# 應該大多數顯示 "up"

# 3. 查看特定目標的錯誤
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health=="down")'

# 4. 測試應用指標端點
docker-compose exec recommendation curl -s http://localhost:3000/metrics | head -20
# 應該返回 HELP 行

# 5. 檢查 Prometheus 配置
docker-compose exec prometheus cat /etc/prometheus/prometheus.yml

# 常見原因和解決方案

# 原因1: 應用未暴露指標端點
# 解決: 在應用中添加 /metrics 端點
# 參考: prometheus-metrics.ts 文件

# 原因2: 應用 /metrics 端點返回錯誤
docker-compose logs recommendation | grep -i metric
# 解決: 檢查應用日誌，修復指標導出代碼

# 原因3: Prometheus 配置錯誤
# 檢查 monitoring/prometheus.yml 中的:
# - 服務名稱是否正確
# - 埠號是否正確
# - metrics_path 是否正確
# 解決: 修改配置並重新加載
curl -X POST http://localhost:9090/-/reload
```

#### 問題 3.2: Grafana 面板無數據

```bash
# 症狀: Grafana 儀表板面板顯示 "No data"

# 診斷步驟

# 1. 驗證數據源連接
# 在 Grafana UI:
# - 設置 > Data Sources > Prometheus
# - 點擊 "Test"

# 2. 在 Prometheus 直接測試查詢
curl 'http://localhost:9090/api/v1/query?query=http_requests_total'

# 3. 檢查查詢語法
# 在 Prometheus UI (http://localhost:9090) 的 "Graph" 標籤中測試

# 常見原因和解決方案

# 原因1: 查詢語法錯誤
# 解決: 檢查 PromQL 語法
# 參考: MONITORING_GUIDE.md 中的 PromQL 示例

# 原因2: 時間範圍不正確
# Grafana 面板左上角設置正確的時間範圍
# 確保 "Last 1 hour" 或更長

# 原因3: 指標標籤不匹配
# 檢查查詢中的標籤名稱是否正確
# 在 Prometheus UI 查看可用標籤

# 原因4: 索引模式不存在
# 在 Elasticsearch 數據源中確認索引名稱
curl -s 'http://localhost:9200/_cat/indices'
```

#### 問題 3.3: Kibana 無日誌數據

```bash
# 症狀: Kibana Discover 頁面顯示 "No data"

# 診斷步驟

# 1. 檢查 Elasticsearch 索引
curl -s 'http://localhost:9200/_cat/indices'
# 應該看到名如 "logs-2024.02.19" 的索引

# 2. 檢查索引中的文檔
curl -s 'http://localhost:9200/logs-*/_count' | jq .

# 3. 查詢索引數據
curl -s 'http://localhost:9200/logs-*/_search?size=5' | jq .

# 4. 測試 Logstash
docker-compose logs logstash | tail -50

# 5. 手動發送測試日誌
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"message": "test log", "level": "INFO", "timestamp": "'$(date -Iseconds)'"}'

# 常見原因和解決方案

# 原因1: Logstash 未運行或已崩潰
docker-compose restart logstash
sleep 10

# 原因2: Elasticsearch 未運行
docker-compose restart elasticsearch
sleep 30  # Elasticsearch 需要更多時間啟動

# 原因3: 日誌未發送到 Logstash
# 檢查應用日誌配置
# 確保應用正確發送日誌到 Logstash (localhost:5000)

# 原因4: Kibana 索引模式不存在
# 在 Kibana UI 創建索引模式:
# - 點擊 "Discover" 或 "Index Patterns"
# - 點擊 "Create index pattern"
# - 輸入 "logs-*"
# - 選擇 "@timestamp" 作為時間字段

# 原因5: Logstash 配置錯誤
docker-compose logs logstash | grep -i error
# 檢查 monitoring/logstash.conf 語法
# 在線驗證: https://www.json.org/ (用於 JSON 驗證)
```

---

### 🟢 級別 4: 性能問題

#### 問題 4.1: 查詢速度慢

```bash
# 症狀: Prometheus 查詢需要 10+ 秒才能返回結果

# 診斷步驟

# 1. 檢查 Prometheus 記憶體使用
docker stats sugar-daddy-prometheus

# 2. 檢查磁盤 I/O
# macOS:
iostat -d -w 1 10
# Linux:
iostat -x 1 10

# 3. 查看 Prometheus 日誌
docker-compose logs prometheus | grep -i "slow\|memory\|timeout"

# 4. 測試簡單查詢
curl 'http://localhost:9090/api/v1/query?query=up'

# 解決方案

# 方案1: 優化 PromQL 查詢
# - 減少時間窗口 [5m] → [1m]
# - 使用 offset 修飾符避免子查詢
# - 使用 recording rules 預計算複雜查詢

# 方案2: 增加 Prometheus 資源
# 在 docker-compose.yml 中添加:
# deploy:
#   resources:
#     limits:
#       memory: 2G

# 方案3: 清理舊數據
# 減少保留時間或配置遠程存儲
```

#### 問題 4.2: 磁盤空間快速填滿

```bash
# 症狀: 磁盤空間快速減少

# 診斷步驟

# 1. 檢查各組件磁盤占用
du -sh ./prometheus_data
du -sh ./elasticsearch_data
du -sh ./grafana_data
du -sh ./logstash_data

# 2. 檢查 Elasticsearch 索引大小
curl -s 'http://localhost:9200/_cat/indices?h=index,store.size,docs.count'

# 3. 監控磁盤使用
watch -n 5 'df -h | grep -E "Filesystem|/$"'

# 解決方案

# 方案1: 刪除舊索引
# 保留最近 30 天的日誌
curl -X DELETE 'http://localhost:9200/logs-2024-01-*'

# 方案2: 配置 Elasticsearch ILM (Index Lifecycle Management)
# 自動刪除舊索引

# 方案3: 減少 Prometheus 保留時間
# 編輯 docker-compose.yml:
# - '--storage.tsdb.retention.time=7d'

# 方案4: 備份和清理
docker-compose exec elasticsearch curl -X PUT http://localhost:9200/_snapshot/backup \
  -H "Content-Type: application/json" \
  -d '{"type": "fs", "settings": {"location": "/mnt/backups"}}'

# 手動清理無用的 Docker volumes
docker volume ls -f dangling=true
docker volume prune
```

---

### 🔵 級別 5: 告警相關問題

#### 問題 5.1: 告警未觸發

```bash
# 症狀: Prometheus 規則正常但沒有告警

# 診斷步驟

# 1. 檢查 Prometheus 規則
curl -s http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | select(.state=="firing")'

# 2. 檢查規則狀態
curl -s http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[]'

# 3. 測試 PromQL 查詢
# 在 Prometheus UI 測試觸發條件查詢
# 例如: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1.0

# 4. 檢查 Alertmanager 是否接收告警
curl -s http://localhost:9093/api/v1/alerts

# 5. 測試告警發送
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{"labels": {"alertname": "TestAlert"}, "annotations": {"summary": "This is a test"}}]'

# 常見原因和解決方案

# 原因1: 規則未加載
# 檢查 monitoring/alert_rules.yml 語法
# 使用在線 YAML 驗證工具

# 原因2: 規則條件永不觸發
# 驗證查詢確實返回值
curl 'http://localhost:9090/api/v1/query?query=<your-query>'

# 原因3: 規則等待時間未到
# "for: 5m" 意味著需要持續 5 分鐘才能觸發
# 在測試時可以臨時改為 "for: 1m"

# 原因4: Alertmanager 配置錯誤
docker-compose logs alertmanager
```

#### 問題 5.2: 告警配置未生效

```bash
# 症狀: 修改了 alertmanager.yml 但沒有生效

# 解決方案

# 1. 重新加載配置
docker-compose restart alertmanager

# 或

curl -X POST http://localhost:9093/-/reload

# 2. 驗證配置語法
docker-compose exec alertmanager amtool config routes
docker-compose exec alertmanager amtool config receivers

# 3. 測試告警通知
# 檢查 Slack webhook 是否正確
# 測試 Slack 連接:
curl -X POST $SLACK_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{"text": "Test message"}'
```

---

## 常用診斷命令

### Docker Compose 命令

```bash
# 啟動所有服務
docker-compose up -d

# 停止所有服務
docker-compose down

# 重啟特定服務
docker-compose restart prometheus

# 查看特定服務日誌
docker-compose logs -f prometheus

# 進入容器執行命令
docker-compose exec prometheus sh

# 查看服務資源使用
docker stats

# 完全清理（警告：刪除所有數據）
docker-compose down -v
```

### API 診斷命令

```bash
# Prometheus 診斷
curl -s http://localhost:9090/api/v1/targets | jq .
curl -s http://localhost:9090/api/v1/query?query=up | jq .
curl -s http://localhost:9090/api/v1/rules | jq .

# Alertmanager 診斷
curl -s http://localhost:9093/api/v1/alerts | jq .
curl -s http://localhost:9093/api/v1/status | jq .

# Elasticsearch 診斷
curl -s http://localhost:9200/_cluster/health | jq .
curl -s http://localhost:9200/_cat/indices?v
curl -s http://localhost:9200/_cat/shards | head -20

# 應用健康檢查
curl -s http://localhost:3000/health | jq .
curl -s http://localhost:3000/ready | jq .
```

### 系統診斷

```bash
# 檢查磁盤空間
df -h

# 檢查記憶體使用
free -h
vm_stat  # macOS

# 檢查埠占用
lsof -i :9090
netstat -tlnp | grep 9090

# 檢查進程
ps aux | grep docker
```

---

## 恢復清單

### 完全重啟

```bash
# 1. 停止所有容器
docker-compose down

# 2. 移除舊的數據（可選）
# docker volume rm sugar-daddy_prometheus_data sugar-daddy_elasticsearch_data

# 3. 重新啟動
docker-compose up -d

# 4. 等待 60 秒
sleep 60

# 5. 驗證
docker-compose ps
curl http://localhost:3010  # Grafana
curl http://localhost:5601  # Kibana
curl http://localhost:9090  # Prometheus
```

### 備份和恢復

```bash
# 備份 Grafana 數據
docker cp sugar-daddy-grafana:/var/lib/grafana ./grafana_backup

# 備份 Prometheus 數據
docker cp sugar-daddy-prometheus:/prometheus ./prometheus_backup

# 備份 Elasticsearch 數據
docker exec sugar-daddy-elasticsearch elasticdump \
  --input=http://localhost:9200 \
  --output=./elasticsearch_backup.json \
  --all=true
```

---

## 聯繫支持

如果上述方案無法解決問題，請收集以下信息：

1. 完整的錯誤日誌
   ```bash
   docker-compose logs > logs.txt
   ```

2. 系統信息
   ```bash
   docker version
   docker-compose version
   uname -a
   ```

3. 資源使用情況
   ```bash
   docker stats
   df -h
   free -h
   ```

4. 網絡診斷
   ```bash
   docker network inspect sugar-daddy-network
   ```

---

**最後更新**: 2024-02-19  
**版本**: 1.0.0
