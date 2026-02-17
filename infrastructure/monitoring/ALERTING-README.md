# Suggar Daddy 監控告警系統

## 概述

本文檔說明如何配置和使用 Suggar Daddy 的監控告警系統。

## 架構

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Prometheus    │────▶│  Alertmanager   │────▶│  Slack/Email    │
│  (告警規則評估)  │     │  (告警路由通知)  │     │   (通知渠道)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 文件結構

```
infrastructure/monitoring/
├── prometheus/
│   ├── prometheus.yml          # Prometheus 主配置
│   ├── alerts.yml              # 現有告警規則
│   └── alert-rules.yml         # 新版完整告警規則
├── alertmanager/
│   ├── alertmanager.yml        # Alertmanager 配置（Slack 通知）
│   ├── alertmanager-production.yml  # 生產環境備份
│   └── templates/
│       ├── email.tmpl          # Email 通知模板
│       └── slack.tmpl          # Slack 通知模板
├── .env.alerting.example       # 環境變數範例
├── setup-alerts.sh             # 告警部署腳本
└── ALERTING-README.md          # 本文檔
```

## 告警規則

### P0 Critical 告警

| 告警名稱 | 條件 | 影響 |
|---------|------|------|
| `ServiceDown` | 服務宕機超過 1 分鐘 | 用戶無法訪問服務 |
| `HighErrorRate` | 5xx 錯誤率 > 1% | 大量請求失敗 |
| `HighP95Latency` | P95 響應時間 > 1000ms | 用戶體驗嚴重下降 |
| `DatabaseConnectionPoolExhausted` | 連線池使用率 > 90% | 新連線被拒絕 |
| `RedisMemoryCritical` | Redis 記憶體使用率 > 90% | 快取失效 |
| `KafkaConsumerLagHigh` | Consumer Lag > 10000 | 消息處理嚴重延遲 |

### P1 Warning 告警

| 告警名稱 | 條件 | 說明 |
|---------|------|------|
| `ServicePartiallyDown` | > 30% 實例不可用 | 服務容量下降 |
| `ElevatedErrorRate` | 5xx 錯誤率 > 0.1% | 錯誤率異常 |
| `ElevatedP95Latency` | P95 > 500ms | 響應時間升高 |
| `PostgresHighConnections` | 連線使用率 > 80% | 需要關注 |
| `RedisHighMemory` | 記憶體使用率 > 80% | 需要擴容規劃 |
| `KafkaConsumerLagWarning` | Consumer Lag > 1000 | 處理速度下降 |

### P2 Info 告警

| 告警名稱 | 條件 | 說明 |
|---------|------|------|
| `HighAverageLatency` | 平均延遲 > 200ms | 效能趨勢 |
| `RedisLowHitRate` | 命中率 < 80% | 快取策略問題 |

## 快速開始

### 1. 配置環境變數

```bash
cd infrastructure/monitoring

# 複製範例文件
cp .env.alerting.example .env.alerting

# 編輯配置
vim .env.alerting
```

### 2. 設置 Slack Webhook

1. 前往 Slack API: https://api.slack.com/messaging/webhooks
2. 創建新的 Incoming Webhook
3. 複製 Webhook URL
4. 添加到 `.env.alerting`:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 3. 部署告警配置

```bash
# 驗證配置
./setup-alerts.sh validate

# 部署配置
./setup-alerts.sh deploy

# 完整設置（驗證+部署+測試）
./setup-alerts.sh full-setup --env production
```

## 使用腳本

### 驗證配置

```bash
./setup-alerts.sh validate
```

### 部署配置

```bash
# 開發環境
./setup-alerts.sh deploy

# 生產環境
./setup-alerts.sh deploy --env production
```

### 測試通知

```bash
# 測試 Slack 通知
./setup-alerts.sh test --test-slack

# 測試告警流程
./setup-alerts.sh test
```

### 創建靜默規則

```bash
./setup-alerts.sh silence
```

選項：
1. 維護窗口 - 靜默所有告警
2. 特定服務 - 靜默指定服務
3. 特定告警 - 靜默指定告警
4. 取消所有靜默
5. 查看當前靜默規則

### 檢查狀態

```bash
./setup-alerts.sh status
```

## 告警抑制規則

系統配置了以下告警抑制規則，避免告警風暴：

1. **服務不可用時**：抑制該服務的所有 Warning 告警
2. **Critical 告警觸發時**：抑制同服務的 Warning 告警
3. **資料庫不可用時**：抑制所有資料庫相關告警
4. **API Gateway 不可用時**：抑制後端服務的可用性告警
5. **高錯誤率告警時**：抑制該服務的其他錯誤告警
6. **記憶體/CPU Critical 時**：抑制對應的 Warning 告警

## 通知路由

### Slack 頻道

| 頻道 | 用途 | 告警級別 |
|-----|------|---------|
| `#critical-alerts` | 關鍵告警 | P0 Critical |
| `#critical-availability` | 服務可用性 | P0 Critical |
| `#database-alerts` | 資料庫問題 | P0 Critical |
| `#cache-alerts` | Redis 問題 | P0 Critical |
| `#messaging-alerts` | Kafka 問題 | P0/P1 |
| `#business-critical` | 業務告警 | P0 Critical |
| `#warnings` | 一般警告 | P1 Warning |
| `#performance` | 效能問題 | P1 Warning |
| `#devops` | 基礎設施 | P1 Warning |
| `#security` | 安全告警 | P1 Warning |
| `#backend` | 後端問題 | P1 Warning |
| `#info-alerts` | 信息通知 | P2 Info |
| `#monitoring` | 監控系統 | 所有級別 |

## 維護窗口

預設維護窗口配置：
- **時間**：每週日 02:00-04:00 (Asia/Taipei)
- **操作**：自動靜默所有 Info 級別告警

手動創建維護窗口：

```bash
./setup-alerts.sh silence
# 選擇選項 1: 維護窗口
```

## 故障排除

### 告警未發送

1. 檢查 Slack Webhook URL 是否正確
2. 確認 Alertmanager 運行狀態：
   ```bash
   curl http://localhost:9093/-/healthy
   ```
3. 檢查 Alertmanager 日誌：
   ```bash
   docker logs suggar-daddy-alertmanager
   ```

### 告警規則未生效

1. 驗證配置語法：
   ```bash
   ./setup-alerts.sh validate
   ```
2. 重新加載 Prometheus：
   ```bash
   curl -X POST http://localhost:9090/-/reload
   ```
3. 檢查 Prometheus 告警規則：
   ```bash
   curl http://localhost:9090/api/v1/rules
   ```

### 重複告警過多

1. 調整 `repeat_interval` 配置
2. 檢查抑制規則是否生效
3. 考慮創建靜默規則

## 最佳實踐

1. **定期檢查**：每週檢查告警準確性和有效性
2. **避免噪音**：調整閾值以減少誤報
3. **及時響應**：Critical 告警應在 5 分鐘內響應
4. **文檔化**：為每個告警添加詳細的處理文檔
5. **定期測試**：每月測試一次告警通知流程

## 參考

- [Prometheus Alerting](https://prometheus.io/docs/alerting/latest/overview/)
- [Alertmanager Configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [Prometheus Recording Rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
