# 📊 Grafana Dashboard 使用指南

**版本**: 2.0.0  
**更新日期**: 2025-01-XX  
**負責人**: Data Analyst Team

---

## 目錄

1. [概覽](#概覽)
2. [Dashboard 說明](#dashboard-說明)
3. [關鍵指標定義](#關鍵指標定義)
4. [使用教學](#使用教學)
5. [告警設置](#告警設置)
6. [常見問題](#常見問題)
7. [最佳實踐](#最佳實踐)

---

## 概覽

### Dashboard 清單

| Dashboard | 用途 | 目標用戶 | 更新頻率 |
|-----------|------|----------|----------|
| **技術指標監控** | 系統健康、性能監控 | DevOps, Backend | 即時 |
| **業務指標監控** | 業務 KPI、營收追蹤 | PM, Business | 即時 |
| **實時營運監控** | 運營數據、用戶活動 | Operations, CS | 即時 |
| **系統資源監控** | 基礎設施、容器狀態 | DevOps, SRE | 即時 |
| **應用性能監控** | API 性能、錯誤追蹤 | Backend, QA | 即時 |

### 訪問方式

```
Grafana URL: http://localhost:3001
預設帳號: admin
預設密碼: admin123（首次登入需修改）
```

### 快速導航

1. **首頁** → Dashboards → Browse
2. **依類別篩選**：System, Business, Application
3. **搜尋功能**：使用關鍵字快速定位
4. **收藏功能**：星號標記常用 Dashboard

---

## Dashboard 說明

### 1. 技術指標監控 (Technical Metrics Dashboard)

**文件**: `technical-metrics.json`  
**用途**: 追蹤系統可用性、性能、錯誤率等技術指標

#### 📊 主要面板

##### 1.1 可用性追蹤（目標 99.5%）

**指標**: Service Uptime  
**計算方式**: 
```promql
# 服務可用性（最近 24 小時）
(1 - (
  sum(rate(http_requests_total{status=~"5.."}[24h])) 
  / 
  sum(rate(http_requests_total[24h]))
)) * 100
```

**顯示**：
- 📈 即時可用性百分比
- 📊 24h 趨勢圖
- 🎯 目標線（99.5%）
- 🚨 告警閾值（< 99.0%）

**解讀**：
- ✅ **綠色（≥ 99.5%）**: 達標，系統健康
- ⚠️ **黃色（99.0% - 99.5%）**: 接近目標，需關注
- 🚨 **紅色（< 99.0%）**: 未達標，需立即處理

---

##### 1.2 API 響應時間（P95 < 500ms）

**指標**: API Response Time (Percentiles)  
**計算方式**:
```promql
# P50（中位數）
histogram_quantile(0.50, 
  rate(http_request_duration_seconds_bucket[5m])
)

# P95（95% 請求）
histogram_quantile(0.95, 
  rate(http_request_duration_seconds_bucket[5m])
)

# P99（99% 請求）
histogram_quantile(0.99, 
  rate(http_request_duration_seconds_bucket[5m])
)
```

**顯示**：
- 📊 三條線：P50（藍）、P95（橙）、P99（紅）
- 🎯 目標線：P95 = 500ms
- 📈 最近 1h / 6h / 24h 趨勢

**解讀**：
- **P50 < 200ms**: 優秀
- **P95 < 500ms**: 達標
- **P99 < 1000ms**: 可接受
- **P95 > 500ms**: 需要優化

**優化建議**：
- 檢查慢查詢日誌
- 分析熱點 API
- 優化資料庫索引
- 考慮增加快取

---

##### 1.3 錯誤率（< 0.5%）

**指標**: Error Rate  
**計算方式**:
```promql
# 錯誤率（最近 5 分鐘）
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ 
sum(rate(http_requests_total[5m])) * 100

# 按服務分組
sum by (service) (rate(http_requests_total{status=~"5.."}[5m])) 
/ 
sum by (service) (rate(http_requests_total[5m])) * 100
```

**顯示**：
- 📊 整體錯誤率時序圖
- 📈 各服務錯誤率（條狀圖）
- 🚨 Top 5 錯誤 API
- 📋 錯誤類型分佈（5xx, 4xx）

**告警閾值**：
- ⚠️ **Warning**: > 0.5%
- 🚨 **Critical**: > 1.0%

**處理流程**：
1. 識別錯誤最多的服務
2. 檢查錯誤日誌（Jaeger）
3. 確認是否為已知問題
4. 緊急修復或降級處理

---

##### 1.4 測試覆蓋率趨勢

**指標**: Test Coverage  
**數據來源**: CI/CD Pipeline + 定期掃描

**顯示**：
- 📊 整體覆蓋率（前端 + 後端）
- 📈 歷史趨勢（最近 30 天）
- 🎯 目標線：前端 40%、後端 75%
- 📋 各服務覆蓋率表格

**目標**：
- **前端**: > 40%
- **後端**: > 75%

**注意**：
此指標通過 CI/CD Pipeline 更新，非即時數據。

---

### 2. 業務指標監控 (Business Metrics Dashboard)

**文件**: `business-metrics.json`  
**用途**: 追蹤業務 KPI、營收、用戶增長

#### 📊 主要面板

##### 2.1 註冊轉化率

**定義**: 訪問者 → 註冊用戶的轉化率

**計算方式**:
```sql
-- PostgreSQL 查詢
SELECT 
  DATE(created_at) as date,
  COUNT(*) as registrations,
  -- 假設有 page_views 表追蹤訪問
  ROUND(
    COUNT(*) * 100.0 / NULLIF(
      (SELECT COUNT(DISTINCT session_id) 
       FROM page_views 
       WHERE DATE(created_at) = DATE(u.created_at)
      ), 0
    ), 2
  ) as conversion_rate
FROM users u
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**PromQL** (如果有 metrics):
```promql
# 每日註冊數
sum(increase(user_registrations_total[1d]))

# 轉化率（需要 pageview metrics）
(
  sum(increase(user_registrations_total[1d]))
  /
  sum(increase(page_views_total{page="landing"}[1d]))
) * 100
```

**顯示**：
- 📊 每日註冊數（柱狀圖）
- 📈 轉化率趨勢（折線圖）
- 📋 本週 vs 上週對比
- 🎯 目標轉化率（根據行業基準設定）

**基準值**：
- **SaaS B2C**: 2-5%
- **Dating App**: 10-20%
- **Freemium**: 5-15%

---

##### 2.2 訂閱轉化率

**定義**: 註冊用戶 → 付費訂閱的轉化率

**計算方式**:
```sql
-- 7 天內訂閱轉化率
WITH cohort AS (
  SELECT 
    DATE(u.created_at) as cohort_date,
    COUNT(DISTINCT u.id) as registered_users,
    COUNT(DISTINCT s.subscriber_id) as subscribed_users
  FROM users u
  LEFT JOIN subscriptions s 
    ON u.id = s.subscriber_id 
    AND s.created_at <= u.created_at + INTERVAL '7 days'
    AND s.status = 'active'
  WHERE u.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(u.created_at)
)
SELECT 
  cohort_date,
  registered_users,
  subscribed_users,
  ROUND(subscribed_users * 100.0 / NULLIF(registered_users, 0), 2) as conversion_rate
FROM cohort
ORDER BY cohort_date DESC;
```

**顯示**：
- 📊 訂閱轉化率（7 天、14 天、30 天）
- 📈 Cohort 分析表
- 💰 按訂閱層級分佈
- 🎯 目標轉化率（5-10%）

---

##### 2.3 留存率（Day 1, 7, 30）

**定義**: 用戶在註冊後 N 天仍活躍的比例

**計算方式**:
```sql
-- Day 1 留存率
WITH cohort AS (
  SELECT 
    DATE(created_at) as cohort_date,
    id as user_id
  FROM users
  WHERE created_at >= CURRENT_DATE - INTERVAL '60 days'
),
retention AS (
  SELECT 
    c.cohort_date,
    COUNT(DISTINCT c.user_id) as cohort_size,
    COUNT(DISTINCT CASE 
      WHEN al.created_at BETWEEN c.cohort_date + INTERVAL '1 day' 
                             AND c.cohort_date + INTERVAL '2 days' - INTERVAL '1 second'
      THEN c.user_id 
    END) as day_1_active,
    COUNT(DISTINCT CASE 
      WHEN al.created_at BETWEEN c.cohort_date + INTERVAL '7 days' 
                             AND c.cohort_date + INTERVAL '8 days' - INTERVAL '1 second'
      THEN c.user_id 
    END) as day_7_active,
    COUNT(DISTINCT CASE 
      WHEN al.created_at BETWEEN c.cohort_date + INTERVAL '30 days' 
                             AND c.cohort_date + INTERVAL '31 days' - INTERVAL '1 second'
      THEN c.user_id 
    END) as day_30_active
  FROM cohort c
  LEFT JOIN audit_logs al 
    ON c.user_id = al.user_id 
    AND al.action IN ('login', 'view_content', 'post_like', 'send_message')
  GROUP BY c.cohort_date
)
SELECT 
  cohort_date,
  cohort_size,
  ROUND(day_1_active * 100.0 / NULLIF(cohort_size, 0), 2) as day_1_retention,
  ROUND(day_7_active * 100.0 / NULLIF(cohort_size, 0), 2) as day_7_retention,
  ROUND(day_30_active * 100.0 / NULLIF(cohort_size, 0), 2) as day_30_retention
FROM retention
ORDER BY cohort_date DESC;
```

**顯示**：
- 📊 留存率熱力圖（Cohort Heatmap）
- 📈 留存曲線（Retention Curve）
- 📋 每週平均留存率
- 🎯 行業基準對比

**基準值**（Dating Apps）：
- **Day 1**: 40-60%
- **Day 7**: 20-30%
- **Day 30**: 10-15%

---

##### 2.4 ARPU (Average Revenue Per User)

**定義**: 平均每用戶營收

**計算方式**:
```sql
-- 月度 ARPU
SELECT 
  DATE_TRUNC('month', t.created_at) as month,
  SUM(t.amount) as total_revenue,
  COUNT(DISTINCT t.user_id) as paying_users,
  ROUND(SUM(t.amount) / NULLIF(COUNT(DISTINCT t.user_id), 0), 2) as arpu
FROM transactions t
WHERE 
  t.status = 'succeeded'
  AND t.type IN ('subscription', 'tip', 'ppv_purchase')
  AND t.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', t.created_at)
ORDER BY month DESC;

-- ARPPU (付費用戶平均營收)
-- ARPU vs ARPPU
SELECT 
  DATE_TRUNC('month', t.created_at) as month,
  SUM(t.amount) / NULLIF(
    (SELECT COUNT(DISTINCT id) FROM users WHERE created_at < t.created_at), 0
  ) as arpu,
  SUM(t.amount) / NULLIF(COUNT(DISTINCT t.user_id), 0) as arppu
FROM transactions t
WHERE t.status = 'succeeded'
GROUP BY month;
```

**顯示**：
- 📊 月度 ARPU 趨勢
- 💰 ARPU vs ARPPU 對比
- 📈 按用戶類型分組（Creator vs Subscriber）
- 🎯 目標 ARPU

**基準值**（Subscription Platform）：
- **Overall ARPU**: $5-15/月
- **ARPPU**: $20-50/月

---

### 3. 實時營運監控 (Real-time Operations Dashboard)

**文件**: `realtime-operations.json`  
**用途**: 實時監控營運數據、用戶活動、系統健康

#### 📊 主要面板

##### 3.1 當前活躍用戶數

**定義**: 最近 5 分鐘內有活動的用戶數

**計算方式**:
```promql
# 活躍用戶數（最近 5 分鐘）
count(
  count by (user_id) (
    http_requests_total{status=~"2.."}
  ) offset 5m
)

# 如果使用 Redis Session
# redis_keys{key_pattern="session:*"}
```

**SQL 備用方案**:
```sql
SELECT COUNT(DISTINCT user_id) as active_users
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '5 minutes'
  AND action IN ('api_request', 'page_view');
```

**顯示**：
- 🟢 當前活躍用戶（大數字）
- 📊 最近 1 小時趨勢
- 📈 今日峰值時間
- 📋 在線用戶列表（Top 20）

---

##### 3.2 交易量與金額

**定義**: 實時交易監控

**計算方式**:
```promql
# 每分鐘交易數
sum(rate(payment_transactions_total[1m]))

# 每分鐘交易金額
sum(rate(payment_amount_total[1m]))
```

**SQL 查詢**:
```sql
-- 最近 1 小時交易
SELECT 
  DATE_TRUNC('minute', created_at) as time,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM transactions
WHERE 
  created_at >= NOW() - INTERVAL '1 hour'
  AND status = 'succeeded'
GROUP BY DATE_TRUNC('minute', created_at)
ORDER BY time DESC;

-- 今日交易統計
SELECT 
  COUNT(*) as total_transactions,
  SUM(amount) as total_revenue,
  AVG(amount) as average_transaction,
  SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
FROM transactions
WHERE created_at >= CURRENT_DATE;
```

**顯示**：
- 💰 今日總營收（大數字，USD）
- 📊 每小時交易量（柱狀圖）
- 📈 交易金額趨勢（折線圖）
- 🔥 熱門交易類型（餅圖）

---

##### 3.3 內容發布數量

**定義**: 實時內容創作監控

**計算方式**:
```sql
-- 今日發布統計
SELECT 
  content_type,
  COUNT(*) as count,
  COUNT(DISTINCT creator_id) as active_creators
FROM posts
WHERE created_at >= CURRENT_DATE
GROUP BY content_type;

-- 最近 24 小時趨勢
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as posts_count
FROM posts
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

**顯示**：
- 📝 今日發布數（大數字）
- 📊 按類型分佈（Photo, Video, Text）
- 📈 24h 發布趨勢
- 👥 活躍創作者數

---

##### 3.4 系統健康狀態

**定義**: 整體系統健康度

**檢查項目**:
```promql
# 所有服務是否 UP
up{job=~".*-service"}

# 資料庫連線健康
pg_up
redis_up

# 關鍵服務回應時間 < 1s
http_request_duration_seconds{quantile="0.95"} < 1
```

**顯示**：
- 🟢 健康服務數 / 總服務數
- 📊 各服務狀態列表（綠/黃/紅）
- 🚨 當前告警數量
- 📈 最近 1h 健康度趨勢

**健康等級**：
- 🟢 **健康**: 所有服務 UP，無告警
- 🟡 **警告**: 1-2 個服務異常或有 Warning 告警
- 🔴 **嚴重**: 3+ 個服務異常或有 Critical 告警

---

## 關鍵指標定義

### 技術指標 (SLI/SLO)

| 指標 | 定義 | 目標 (SLO) | 告警閾值 |
|------|------|------------|----------|
| **可用性** | (總請求數 - 5xx 錯誤) / 總請求數 | 99.5% | < 99.0% |
| **P95 延遲** | 95% 請求的回應時間 | < 500ms | > 800ms |
| **P99 延遲** | 99% 請求的回應時間 | < 1000ms | > 2000ms |
| **錯誤率** | 5xx 錯誤 / 總請求數 | < 0.5% | > 1.0% |
| **飽和度** | CPU/Memory 使用率 | < 80% | > 90% |

### 業務指標 (KPI)

| 指標 | 定義 | 計算週期 | 目標 |
|------|------|----------|------|
| **DAU** | Daily Active Users | 日 | 待設定 |
| **MAU** | Monthly Active Users | 月 | 待設定 |
| **註冊轉化率** | 註冊數 / 訪問數 | 週 | 10-20% |
| **訂閱轉化率** | 訂閱數 / 註冊數（7天內） | 週 | 5-10% |
| **Day 1 留存** | D1 活躍 / 註冊數 | 日 | 40-60% |
| **Day 7 留存** | D7 活躍 / 註冊數 | 週 | 20-30% |
| **Day 30 留存** | D30 活躍 / 註冊數 | 月 | 10-15% |
| **MRR** | Monthly Recurring Revenue | 月 | 成長 10%/月 |
| **ARPU** | 總營收 / 總用戶數 | 月 | $10-15 |
| **Churn Rate** | 取消訂閱 / 活躍訂閱 | 月 | < 5% |

---

## 使用教學

### 基本操作

#### 1. 選擇時間範圍

**位置**: 右上角時間選擇器

**常用範圍**:
- **Last 5 minutes**: 即時監控
- **Last 1 hour**: 最近趨勢
- **Last 24 hours**: 日常監控
- **Last 7 days**: 週度回顧
- **Last 30 days**: 月度分析

**自訂範圍**:
- 點擊時間範圍 → "Custom range"
- 設定開始和結束時間
- 點擊 "Apply time range"

**快速導航**:
- **←** / **→** 箭頭：前後移動相同時間長度
- **Zoom in**: 縮小時間範圍查看細節
- **Zoom out**: 擴大時間範圍看整體

---

#### 2. 使用變數過濾

**位置**: Dashboard 頂部下拉選單

**可用變數**:
- **Service**: 選擇特定微服務
- **Environment**: dev / staging / production
- **User Type**: creator / subscriber / admin
- **Region**: 地理區域（如有）

**操作**:
1. 點擊下拉選單
2. 選擇一個或多個選項（支持多選）
3. 面板會自動刷新顯示過濾後的數據

**技巧**:
- 使用 "All" 查看全部
- 支持搜尋功能（輸入關鍵字）
- Ctrl/Cmd + Click 多選

---

#### 3. 面板互動

**Hover（滑鼠懸停）**:
- 顯示精確數值
- 顯示時間戳
- 多條線時顯示所有數值

**Click（點擊）**:
- 圖表區域：查看詳細信息
- 標題欄：展開面板選單
- 圖例：隱藏/顯示該序列

**Zoom（縮放）**:
- 拖動選取區域：放大時間範圍
- 雙擊：重置縮放

**面板選單**（點擊面板標題）:
- **View**: 全螢幕查看
- **Edit**: 編輯面板配置
- **Share**: 分享面板或快照
- **Explore**: 在 Explore 模式查詢
- **Inspect**: 查看原始數據和查詢

---

#### 4. 設定告警

**方式 1: 面板告警**（推薦）
1. 編輯面板
2. 切換到 "Alert" 標籤
3. 點擊 "Create Alert"
4. 設定條件：
   - **Condition**: 觸發條件（例如 `avg() > 80`）
   - **Evaluate every**: 評估頻率（例如 `1m`）
   - **For**: 持續時間（例如 `5m`）
5. 設定通知渠道（Slack, Email）
6. 儲存

**方式 2: Prometheus Alert Rules**（已配置）
- 編輯 `prometheus/alerts.yml`
- 添加新規則
- 重啟 Prometheus

**告警最佳實踐**:
- ✅ 設定合理的閾值（避免誤報）
- ✅ 使用漸進式告警（Warning → Critical）
- ✅ 添加詳細的告警註解
- ✅ 定期審查和調整告警規則

---

### 進階技巧

#### 1. 建立自訂 Dashboard

**步驟**:
1. Dashboards → New Dashboard
2. Add Panel
3. 選擇視覺化類型：
   - **Time series**: 時序圖（最常用）
   - **Stat**: 單一數值
   - **Gauge**: 儀表盤
   - **Bar chart**: 長條圖
   - **Table**: 表格
   - **Pie chart**: 圓餅圖
4. 編寫查詢（PromQL 或 SQL）
5. 設定視覺化選項
6. 儲存

**PromQL 範例**:
```promql
# CPU 使用率
rate(process_cpu_seconds_total[5m]) * 100

# 記憶體使用率
(process_resident_memory_bytes / node_memory_MemTotal_bytes) * 100

# 請求速率
rate(http_requests_total[5m])

# 錯誤率
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ 
sum(rate(http_requests_total[5m]))
```

---

#### 2. 使用 Explore 模式

**用途**: 即時查詢和調試

**操作**:
1. 左側選單 → Explore
2. 選擇數據源（Prometheus 或 PostgreSQL）
3. 輸入查詢
4. 點擊 "Run Query"

**PromQL 調試技巧**:
- 使用 `{__name__=~".*"}` 列出所有 metrics
- 使用 `label_values()` 查看可用標籤
- 使用 `rate()` 計算變化率
- 使用 `increase()` 計算增量
- 使用 `histogram_quantile()` 計算百分位數

**SQL 查詢範例**:
```sql
-- 查詢最近 100 筆交易
SELECT * FROM transactions 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 100;

-- 查詢今日註冊用戶
SELECT COUNT(*) FROM users
WHERE created_at >= CURRENT_DATE;
```

---

#### 3. 匯出和分享

**匯出 Dashboard**:
1. Dashboard Settings → JSON Model
2. 複製 JSON
3. 儲存為 `.json` 文件

**分享面板**:
1. 面板選單 → Share
2. 選擇分享方式：
   - **Link**: 產生連結（需要權限）
   - **Snapshot**: 產生靜態快照（公開）
   - **Embed**: 嵌入 iframe
   - **Export**: 匯出為圖片或 CSV

**快照功能**:
- 保留當前數據狀態
- 可設定過期時間
- 不需要登入即可查看

---

## 告警設置

### 已配置告警規則

詳見 `prometheus/alerts.yml`，包含 30+ 條規則。

### 告警級別

| 級別 | 嚴重度 | 響應時間 | 通知渠道 |
|------|--------|----------|----------|
| **Critical (P0)** | 🔴 嚴重 | 立即（15分鐘內） | Slack + Email + SMS |
| **Warning (P1)** | 🟡 警告 | 1小時內 | Slack + Email |
| **Info (P2)** | 🔵 資訊 | 24小時內 | Slack |

### 告警處理 SOP

詳見 `docs/MONITORING.md` 第 5 章。

**快速參考**:
1. **確認告警** - 檢查 Grafana Dashboard
2. **識別影響** - 確認受影響服務和用戶
3. **緊急處理** - 重啟服務、切換流量、降級功能
4. **根因分析** - 檢查日誌、Traces、Metrics
5. **修復驗證** - 確認指標恢復正常
6. **後續跟進** - 撰寫 Post-mortem

---

## 常見問題

### Q1: Dashboard 無法載入或顯示 "No Data"

**可能原因**:
- Prometheus 未運行或無法連接
- 服務未暴露 metrics endpoint
- 查詢語法錯誤

**解決方法**:
1. 檢查 Prometheus Targets: http://localhost:9090/targets
2. 確認所有服務狀態為 "UP"
3. 在 Explore 模式測試查詢
4. 檢查時間範圍是否合理

---

### Q2: 數據延遲或不準確

**可能原因**:
- Scrape interval 設定過長
- 資料庫查詢效能問題
- 快取未更新

**解決方法**:
1. 檢查 Prometheus scrape_interval（預設 15s）
2. 調整查詢時間範圍
3. 清除瀏覽器快取
4. 確認系統時間同步（NTP）

---

### Q3: 告警未收到通知

**可能原因**:
- Alertmanager 未運行
- 通知渠道配置錯誤（Slack/Email）
- 告警規則未觸發或被抑制

**解決方法**:
1. 檢查 Alertmanager 狀態: http://localhost:9093
2. 查看 Alertmanager 日誌
3. 驗證 Slack Webhook 或 SMTP 配置
4. 測試告警發送（`amtool`）

---

### Q4: Dashboard 效能緩慢

**可能原因**:
- 查詢範圍過大（例如 30 天）
- 高基數 metrics（太多標籤組合）
- Prometheus 記憶體不足

**優化方法**:
1. 縮小時間範圍
2. 使用 recording rules 預計算
3. 增加 Prometheus 記憶體
4. 使用 `rate()` 而非 `increase()` 對長時間範圍

---

### Q5: 如何追蹤特定用戶或交易？

**方法 1: 使用 Explore + SQL**
```sql
-- 追蹤用戶活動
SELECT * FROM audit_logs
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC;

-- 追蹤交易
SELECT * FROM transactions
WHERE user_id = 'user-uuid-here'
  OR stripe_payment_id = 'pi_xxx'
ORDER BY created_at DESC;
```

**方法 2: 使用 Jaeger Tracing**
- 訪問 http://localhost:16686
- 搜尋 trace ID 或用戶 ID
- 查看完整請求鏈路

---

## 最佳實踐

### 1. 日常監控習慣

**每日檢查**（10 分鐘）:
- ✅ 查看整體健康狀態 Dashboard
- ✅ 確認無 Critical 告警
- ✅ 檢查關鍵業務指標（註冊、交易、訂閱）
- ✅ 瀏覽錯誤率和回應時間趨勢

**每週回顧**（30 分鐘）:
- ✅ 分析週度趨勢（WoW 對比）
- ✅ 審查告警歷史和誤報
- ✅ 檢查容量使用（CPU、Memory、Disk）
- ✅ 識別效能瓶頸和優化機會

**每月報告**（2 小時）:
- ✅ 產生月度 KPI 報告
- ✅ 評估 SLO 達成率
- ✅ 規劃容量擴展
- ✅ 優化告警規則和 Dashboard

---

### 2. Dashboard 設計原則

**清晰性**:
- ✅ 每個 Dashboard 專注單一目的
- ✅ 使用描述性標題和註解
- ✅ 顏色一致（綠 = 好，黃 = 警告，紅 = 嚴重）
- ✅ 面板數量適中（8-15 個）

**可操作性**:
- ✅ 顯示目標線和閾值
- ✅ 提供上下文（WoW、MoM 對比）
- ✅ 連結到相關 Dashboard
- ✅ 附上處理建議或 runbook

**效能**:
- ✅ 避免過度查詢
- ✅ 使用合理的時間範圍
- ✅ 考慮使用 recording rules
- ✅ 定期清理無用面板

---

### 3. 指標收集建議

**遵循標準**:
- ✅ 使用標準 metrics 名稱（`http_requests_total`, `http_request_duration_seconds`）
- ✅ 添加有意義的標籤（`service`, `method`, `status`）
- ✅ 避免高基數標籤（不要用 user_id, transaction_id）
- ✅ 記錄單位（`_bytes`, `_seconds`, `_total`）

**業務指標**:
- ✅ 從業務事件觸發 metrics（註冊、訂閱、交易）
- ✅ 同時記錄到 Prometheus 和資料庫
- ✅ 定期與資料庫數據校驗一致性
- ✅ 設定合理的標籤（`user_type`, `plan_tier`）

---

### 4. 告警規則設計

**避免告警疲勞**:
- ✅ 只對可操作的問題設定告警
- ✅ 使用漸進式閾值（80% → 85% → 90%）
- ✅ 設定適當的持續時間（避免短暫波動）
- ✅ 定期審查和調整（減少誤報）

**提供上下文**:
- ✅ 寫清晰的 summary 和 description
- ✅ 說明影響範圍和嚴重程度
- ✅ 提供處理步驟或 runbook 連結
- ✅ 附上相關 Dashboard 連結

---

### 5. 團隊協作

**建立監控文化**:
- ✅ 全團隊了解關鍵指標
- ✅ 定期監控培訓和分享
- ✅ 鼓勵主動查看 Dashboard
- ✅ 建立 On-call 輪值制度

**文檔維護**:
- ✅ Dashboard 註解和說明保持最新
- ✅ Runbook 定期更新
- ✅ 記錄重大事件和處理經驗
- ✅ 分享最佳實踐和技巧

---

## 相關資源

### 文檔
- [MONITORING.md](../../docs/MONITORING.md) - 監控系統完整文檔
- [OPERATIONS_MANUAL.md](../../docs/pm/OPERATIONS_MANUAL.md) - 運營手冊
- [Prometheus Docs](https://prometheus.io/docs/) - Prometheus 官方文檔
- [Grafana Docs](https://grafana.com/docs/) - Grafana 官方文檔

### 工具
- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093
- **Jaeger**: http://localhost:16686

### 支持
- **Slack**: #monitoring-support
- **Email**: devops@suggar-daddy.com
- **On-call**: 參考 OPERATIONS_MANUAL.md

---

**最後更新**: 2025-01-XX  
**維護者**: Data Analyst Team  
**版本**: 2.0.0
