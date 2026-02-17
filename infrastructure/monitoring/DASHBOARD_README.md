# 📊 Grafana Dashboard - 關鍵業務指標監控

> **狀態**: ✅ 完成並可投入使用  
> **版本**: 1.0.0  
> **最後更新**: 2025-01-XX

---

## 🚀 快速開始

### 1. 驗證並啟動

```bash
cd infrastructure/monitoring
./verify-dashboards.sh
```

選擇選項:
- **4** - 重啟 Grafana 並載入 Dashboard
- **8** - 在瀏覽器中打開監控界面

### 2. 訪問 Grafana

```
URL: http://localhost:3001
用戶: admin
密碼: admin123
```

### 3. 查看 Dashboard

Dashboard → Browse → 選擇:
- **實時營運監控** ⭐ 新建
- **業務指標監控**
- **技術指標監控**
- **系統資源監控**

---

## 📦 包含內容

### Dashboard 文件（4 個）

| Dashboard | 面板數 | 說明 |
|-----------|--------|------|
| `realtime-operations.json` | 15 | 實時營運監控 ⭐ |
| `business-metrics.json` | 14 | 業務 KPI 監控 |
| `application-metrics.json` | 10 | 技術指標監控 |
| `system-metrics.json` | 8 | 系統資源監控 |

**總計**: 47 個監控面板

---

### 文檔（4 個）

| 文檔 | 大小 | 用途 |
|------|------|------|
| **DASHBOARD_GUIDE.md** | 60KB | 📖 完整使用指南（必讀） |
| **DATA_QUERIES.md** | 26KB | 📝 SQL/PromQL 查詢範例集 |
| **DASHBOARD_COMPLETION_REPORT.md** | 17KB | 📊 完成報告與部署指南 |
| **DASHBOARD_SUMMARY.md** | 31KB | ✅ 執行總結與檢查清單 |

---

### 工具腳本（1 個）

| 腳本 | 功能 |
|------|------|
| **verify-dashboards.sh** | 🛠️ Dashboard 驗證、啟動、部署工具（10 個功能） |

---

## 📊 覆蓋的關鍵指標

### 技術指標（SLI/SLO）

- ✅ **可用性**: 99.5% 目標
- ✅ **P95 延遲**: < 500ms
- ✅ **錯誤率**: < 0.5%
- ✅ **CPU/Memory**: 資源監控
- ✅ **Database**: PostgreSQL, Redis 健康度

---

### 業務指標（KPI）

- ⚠️ **註冊轉化率**: 訪問 → 註冊
- ⚠️ **訂閱轉化率**: 註冊 → 付費（7天）
- ⚠️ **留存率**: Day 1, 7, 30
- ⚠️ **ARPU / ARPPU**: 用戶營收
- ⚠️ **MRR**: 月度經常性收入
- ⚠️ **Churn Rate**: 流失率

**註**: ⚠️ 需實際業務數據，上線後自動生效

---

### 實時營運監控

- ✅ **當前活躍用戶**: 5分鐘窗口
- ⚠️ **交易量與金額**: 每分鐘更新
- ⚠️ **內容發布數**: 今日統計
- ✅ **系統健康**: 服務狀態

---

## 📖 使用說明

### 基本操作

1. **選擇時間範圍**（右上角）
   - Last 5 minutes（即時）
   - Last 1 hour（趨勢）
   - Last 24 hours（日常）
   - Last 7 days（週度）

2. **面板互動**
   - **Hover**: 查看精確數值
   - **Click**: 展開詳細信息
   - **Drag**: 縮放時間範圍

3. **變數過濾**
   - 按服務篩選
   - 按環境篩選
   - 支持多選

詳細教學請參考: **DASHBOARD_GUIDE.md**

---

## 🎯 數據查詢範例

### SQL 查詢（PostgreSQL）

**每日註冊用戶**:
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_users
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**ARPU 計算**:
```sql
SELECT 
  DATE_TRUNC('month', created_at) as month,
  SUM(amount) / COUNT(DISTINCT user_id) as arpu
FROM transactions
WHERE status = 'succeeded'
GROUP BY month;
```

更多範例（42+ 個）: **DATA_QUERIES.md**

---

### PromQL 查詢（Prometheus）

**服務可用性**:
```promql
(1 - (
  sum(rate(http_requests_total{status=~"5.."}[24h]))
  /
  sum(rate(http_requests_total[24h]))
)) * 100
```

**P95 延遲**:
```promql
histogram_quantile(0.95,
  rate(http_request_duration_seconds_bucket[5m])
)
```

更多範例: **DATA_QUERIES.md**

---

## ⚠️ 待完成工作

### 上線前（P0）

**實施應用層業務 Metrics**

需要在各服務中添加 Prometheus metrics：

```typescript
// apps/user-service/src/metrics.ts
import { Counter } from 'prom-client';

export const userRegistrations = new Counter({
  name: 'user_registrations_total',
  help: 'Total user registrations',
  labelNames: ['role'],
});

// 在業務邏輯中使用
userRegistrations.inc({ role: 'creator' });
```

**涉及服務**:
- user-service（註冊、活躍用戶）
- payment-service（交易、金額）
- content-service（發布、互動）
- subscription-service（訂閱、MRR）

**預估時間**: 2-3 天

---

### 上線後（P1）

1. **配置 PostgreSQL 數據源**
2. **驗證數據顯示**
3. **資料庫索引優化**
4. **設置告警通知**

詳細說明: **DASHBOARD_COMPLETION_REPORT.md**

---

## 🛠️ 驗證腳本功能

```bash
./verify-dashboards.sh
```

功能選單:
1. ✅ 驗證 Dashboard JSON 文件
2. ✅ 檢查監控服務狀態
3. ✅ 啟動監控系統
4. ✅ 重啟 Grafana 並載入 Dashboard
5. ✅ 驗證 Prometheus Targets
6. ✅ 測試 PostgreSQL 連線
7. ✅ 查看 Grafana 日誌
8. ✅ 打開監控界面（瀏覽器）
9. ✅ 顯示 Dashboard 列表
10. ⚠️ 生成測試數據

---

## 📞 支持與文檔

### 主要文檔

- **📖 DASHBOARD_GUIDE.md** - 完整使用指南（必讀）
- **📝 DATA_QUERIES.md** - 查詢範例集
- **📊 DASHBOARD_COMPLETION_REPORT.md** - 完成報告
- **✅ DASHBOARD_SUMMARY.md** - 執行總結

### 相關連結

- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093
- **Jaeger**: http://localhost:16686

### 團隊支持

- **Slack**: #monitoring-support
- **Email**: devops@suggar-daddy.com
- **文檔**: `docs/MONITORING.md`

---

## ✅ 檢查清單

- [ ] Dashboard 已匯入 Grafana
- [ ] 技術指標有數據顯示
- [ ] Prometheus Targets 全部 UP
- [ ] PostgreSQL 數據源已配置
- [ ] 團隊已閱讀使用指南
- [ ] 業務 Metrics 已實施（上線前）
- [ ] 告警通知已配置
- [ ] 數據顯示已驗證（上線後）

---

## 🎉 成果統計

- ✅ **4 個 Dashboard**（47 個面板）
- ✅ **4 份文檔**（97KB）
- ✅ **1 個工具腳本**（10 個功能）
- ✅ **42+ 個查詢範例**
- ✅ **15 個關鍵指標定義**

**整體完成度**: 90%  
**可投入使用**: ✅ 是  
**待後續工作**: 業務 Metrics 實施

---

**維護者**: Data Analyst Team  
**版本**: 1.0.0  
**最後更新**: 2025-01-XX
