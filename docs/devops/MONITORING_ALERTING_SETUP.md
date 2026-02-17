# 監控告警系統配置指南

**文檔版本**: 1.0.0  
**最後更新**: 2026-02-17  
**負責人**: DevOps Team

---

## 📋 目錄

1. [系統概覽](#系統概覽)
2. [快速開始](#快速開始)
3. [Slack 通知配置](#slack-通知配置)
4. [Email 通知配置](#email-通知配置)
5. [告警規則說明](#告警規則說明)
6. [測試告警系統](#測試告警系統)
7. [故障排除](#故障排除)

---

## 🎯 系統概覽

### 監控架構

```
┌─────────────┐
│   Services  │ → Metrics
└─────────────┘
      ↓
┌─────────────┐
│ Prometheus  │ → Collects & Evaluates
└─────────────┘
      ↓
┌─────────────┐
│Alertmanager │ → Routes & Notifies
└─────────────┘
      ↓
┌─────────────┐     ┌──────┐     ┌───────┐
│   Slack     │     │Email │     │PagerDuty│
└─────────────┘     └──────┘     └───────┘
```

### 組件說明

| 組件 | 用途 | 端口 |
|-----|------|------|
| **Prometheus** | 指標收集、存儲、告警評估 | 9090 |
| **Alertmanager** | 告警路由、分組、通知 | 9093 |
| **Grafana** | 數據視覺化、Dashboard | 3001 |
| **Node Exporter** | 系統指標收集 | 9100 |
| **cAdvisor** | 容器指標收集 | 8081 |
| **Postgres Exporter** | PostgreSQL 指標 | 9187 |
| **Redis Exporter** | Redis 指標 | 9121 |

---

## 🚀 快速開始

### 1. 啟動監控服務

```bash
# 進入監控目錄
cd infrastructure/monitoring

# 啟動所有監控服務
docker-compose up -d

# 檢查服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f prometheus alertmanager
```

### 2. 訪問監控面板

- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093
- **Grafana**: http://localhost:3001 (admin/admin123)

### 3. 配置告警通知（生產環境必需）

```bash
# 複製配置範例
cp .env.alerting.example .env.alerting

# 編輯配置文件
vim .env.alerting

# 填入實際的 Slack Webhook 和 Email SMTP 配置
```

### 4. 啟用生產環境配置

```bash
# 切換到生產環境 Alertmanager 配置
cd infrastructure/monitoring/alertmanager

# 備份開發環境配置
mv alertmanager.yml alertmanager-dev.yml

# 啟用生產環境配置
cp alertmanager-production.yml alertmanager.yml

# 重啟 Alertmanager
docker-compose restart alertmanager
```

### 5. 測試告警系統

```bash
# 執行測試腳本
./scripts/test-alerts.sh

# 檢查 Slack/Email 是否收到測試告警
```

---

## 💬 Slack 通知配置

### 步驟 1：創建 Slack App

1. 訪問 https://api.slack.com/apps
2. 點擊 **"Create New App"**
3. 選擇 **"From scratch"**
4. 輸入 App 名稱：`Suggar Daddy Alerts`
5. 選擇工作區

### 步驟 2：啟用 Incoming Webhooks

1. 在左側選單選擇 **"Incoming Webhooks"**
2. 切換開關至 **"On"**
3. 點擊 **"Add New Webhook to Workspace"**
4. 選擇要發送通知的頻道（例如 `#alerts`）
5. 點擊 **"Allow"**
6. 複製生成的 Webhook URL

### 步驟 3：配置多個頻道（推薦）

建議為不同嚴重程度的告警配置不同頻道：

```
#critical-alerts     → P0 Critical 告警
#warnings           → P1 Warning 告警
#info-alerts        → P2 Info 告警
#payment-alerts     → 支付系統告警
#database-alerts    → 資料庫告警
#security           → 安全告警
#business-metrics   → 業務指標告警
```

為每個頻道創建一個 Webhook URL。

### 步驟 4：配置環境變數

編輯 `.env.alerting` 文件：

```bash
# 主 Webhook（用於所有告警）
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX

# 各頻道配置（在 alertmanager.yml 中使用）
SLACK_CHANNEL_CRITICAL=#critical-alerts
SLACK_CHANNEL_WARNING=#warnings
SLACK_CHANNEL_INFO=#info-alerts
```

### 步驟 5：自定義通知格式

在 `alertmanager-production.yml` 中，Slack 通知已包含：

- 告警名稱和嚴重程度
- 服務和實例資訊
- 詳細描述和影響
- 建議的處理步驟
- 時間戳和持續時間

---

## 📧 Email 通知配置

### Gmail SMTP 配置

#### 步驟 1：啟用 Gmail SMTP

1. 登入 Gmail 帳戶
2. 進入 **"Google Account"** → **"Security"**
3. 啟用 **"2-Step Verification"**（如未啟用）
4. 進入 **"App passwords"**
5. 選擇 **"Mail"** 和 **"Other (Custom name)"**
6. 輸入名稱：`Suggar Daddy Alerts`
7. 點擊 **"Generate"**
8. 複製生成的 16 位密碼

#### 步驟 2：配置環境變數

編輯 `.env.alerting` 文件：

```bash
# Gmail SMTP 配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-digit-app-password  # 步驟 1 生成的密碼

# 發件人
ALERT_EMAIL_FROM=alerts@your-company.com

# 收件人
CRITICAL_ALERT_EMAIL=devops@your-company.com,oncall@your-company.com
WARNING_ALERT_EMAIL=devops@your-company.com
ON_CALL_EMAIL=oncall@your-company.com
PAYMENT_TEAM_EMAIL=payment-team@your-company.com
DBA_EMAIL=dba@your-company.com
```

### 其他 SMTP 提供商

#### SendGrid

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### AWS SES

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
```

#### Office 365

```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASSWORD=your-password
```

---

## 🔔 告警規則說明

### P0 - Critical 告警

#### ServiceDown
**觸發條件**: 服務不可用超過 1 分鐘  
**影響**: 用戶無法訪問該服務的功能  
**處理**:
1. 檢查容器狀態：`docker ps`
2. 查看服務日誌：`docker logs <container>`
3. 檢查資源使用：`docker stats`

#### HighErrorRate
**觸發條件**: 5xx 錯誤率 > 5%（持續 5 分鐘）  
**影響**: 大量用戶請求失敗  
**處理**:
1. 查看錯誤日誌
2. 檢查資料庫連線
3. 檢查依賴服務狀態

#### CircuitBreakerOpen
**觸發條件**: Circuit Breaker 開路超過 2 分鐘  
**影響**: 對下游服務的請求被阻斷  
**處理**:
1. 檢查下游服務狀態
2. 查看錯誤日誌
3. 確認是否需要擴容或修復

#### OrphanTransactionDetected
**觸發條件**: 檢測到孤兒交易  
**影響**: 用戶已付款但系統未記錄  
**處理**:
1. 立即檢查孤兒交易處理器狀態
2. 手動檢查交易記錄
3. 聯絡支付團隊協調處理

---

### P1 - Warning 告警

#### ElevatedErrorRate
**觸發條件**: 5xx 錯誤率 > 0.5%（持續 5 分鐘）  
**影響**: 錯誤率超過上線標準  
**處理**:
1. 查看錯誤日誌
2. 檢查最近的部署變更
3. 監控是否持續升高

#### HighP95Latency
**觸發條件**: P95 延遲 > 500ms（持續 5 分鐘）  
**影響**: 用戶體驗下降  
**處理**:
1. 檢查資料庫查詢效能
2. 檢查外部 API 調用
3. 分析慢請求日誌

#### HighRateLimitHitRate
**觸發條件**: Rate Limit 觸發頻率 > 5/s（持續 5 分鐘）  
**影響**: 可能遭受 DDoS 攻擊  
**處理**:
1. 檢查請求來源 IP
2. 分析請求模式
3. 考慮加強防護或封鎖 IP

---

### P2 - Info 告警

#### HighAverageLatency
**觸發條件**: 平均延遲 > 200ms（持續 10 分鐘）  
**影響**: 效能需要優化  
**處理**: 記錄並排程優化

---

## 🧪 測試告警系統

### 方法 1：使用測試腳本（推薦）

```bash
# 執行完整測試
./scripts/test-alerts.sh

# 測試內容：
# - Prometheus 配置驗證
# - Alertmanager 配置驗證
# - 發送測試告警
# - 告警靜默測試
# - 特定告警規則測試
```

### 方法 2：手動發送測試告警

```bash
# 發送測試告警到 Alertmanager
curl -X POST http://localhost:9093/api/v2/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning",
      "service": "test-service"
    },
    "annotations": {
      "summary": "測試告警",
      "description": "這是一個測試告警"
    },
    "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }]'
```

### 方法 3：觸發真實告警

```bash
# 停止一個服務來觸發 ServiceDown 告警
docker-compose stop api-gateway

# 等待 1-2 分鐘，應該收到告警

# 重啟服務
docker-compose start api-gateway

# 應該收到恢復通知
```

### 驗證檢查清單

- [ ] Slack 收到測試告警
- [ ] Email 收到測試告警
- [ ] 告警包含正確的資訊（服務、嚴重程度、描述）
- [ ] 告警包含處理建議
- [ ] 收到恢復通知
- [ ] Alertmanager UI 顯示告警

---

## 🔍 故障排除

### 問題 1：沒有收到 Slack 通知

**可能原因**:
1. Webhook URL 配置錯誤
2. Slack App 權限不足
3. Alertmanager 配置錯誤
4. 網路連線問題

**解決方案**:

```bash
# 檢查 Alertmanager 日誌
docker logs suggar-daddy-alertmanager

# 測試 Webhook URL
curl -X POST "${SLACK_WEBHOOK_URL}" \
  -H 'Content-Type: application/json' \
  -d '{"text": "Test from Alertmanager"}'

# 驗證 Alertmanager 配置
docker exec suggar-daddy-alertmanager amtool config routes show

# 檢查告警狀態
curl http://localhost:9093/api/v2/alerts
```

### 問題 2：沒有收到 Email 通知

**可能原因**:
1. SMTP 配置錯誤
2. 密碼過期或無效
3. SMTP 端口被阻擋
4. 郵件被標記為垃圾郵件

**解決方案**:

```bash
# 測試 SMTP 連線
telnet smtp.gmail.com 587

# 檢查 Alertmanager 日誌中的錯誤
docker logs suggar-daddy-alertmanager | grep -i email

# 測試發送郵件
docker exec suggar-daddy-alertmanager \
  amtool --alertmanager.url=http://localhost:9093 \
  alert add alertname=test severity=warning
```

### 問題 3：告警規則沒有觸發

**可能原因**:
1. 指標沒有收集到
2. 告警規則表達式錯誤
3. 告警閾值設置不合理
4. `for` 時間還沒到

**解決方案**:

```bash
# 檢查 Prometheus 指標
curl http://localhost:9090/api/v1/query?query=up

# 檢查告警規則狀態
curl http://localhost:9090/api/v1/rules

# 在 Prometheus UI 中測試 PromQL 查詢
# 訪問 http://localhost:9090/graph

# 查看待觸發的告警（pending）
curl http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.state == "pending")'
```

### 問題 4：告警太多（告警疲勞）

**解決方案**:

1. **調整閾值**: 修改 `alerts.yml` 中的閾值
2. **增加 `for` 時間**: 避免短暫波動觸發告警
3. **配置告警分組**: 相同類型的告警分組發送
4. **配置告警抑制**: 避免連鎖告警
5. **配置靜默**: 維護期間靜默已知告警

```bash
# 創建靜默規則（維護期間）
curl -X POST http://localhost:9093/api/v2/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [{"name": "service", "value": "api-gateway"}],
    "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "endsAt": "'$(date -u -d "+2 hours" +%Y-%m-%dT%H:%M:%SZ)'",
    "comment": "Scheduled maintenance"
  }'
```

---

## 📊 監控最佳實踐

### 1. 告警分級

- **P0 (Critical)**: 立即處理（5 分鐘內）
  - 系統不可用
  - 資料損壞
  - 支付失敗
  
- **P1 (Warning)**: 快速處理（15 分鐘內）
  - 效能下降
  - 錯誤率升高
  - 資源使用過高

- **P2 (Info)**: 記錄追蹤（1 小時內）
  - 一般性通知
  - 趨勢變化

### 2. 告警設計原則

- ✅ 告警要可操作（有明確的處理步驟）
- ✅ 告警要有意義（真正影響用戶）
- ✅ 避免告警疲勞（過多無用告警）
- ✅ 包含上下文資訊（服務、時間、影響）
- ✅ 提供處理建議

### 3. 監控指標選擇

**Golden Signals（四大黃金指標）**:
1. **Latency（延遲）**: 請求響應時間
2. **Traffic（流量）**: 請求數量
3. **Errors（錯誤）**: 錯誤率
4. **Saturation（飽和度）**: 資源使用率

### 4. Dashboard 設計

- 按服務分組
- 突出關鍵指標
- 使用合理的時間範圍
- 包含趨勢圖和即時狀態

---

## 📚 相關資源

- [Prometheus 官方文檔](https://prometheus.io/docs/)
- [Alertmanager 配置](https://prometheus.io/docs/alerting/latest/configuration/)
- [PromQL 查詢語言](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana 文檔](https://grafana.com/docs/)
- [災難恢復計劃](./DISASTER_RECOVERY.md)
- [運營手冊](../pm/OPERATIONS_MANUAL.md)

---

**最後更新**: 2026-02-17  
**維護者**: DevOps Team  
**版本**: 1.0.0
