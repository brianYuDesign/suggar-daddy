# 後端服務健康度評估

> 評估範圍: 12 個核心後端服務 + 共享庫

---

## 總體健康度: 5.4/10

| 服務 | 評分 | 狀態 | 關鍵問題 |
|------|------|------|---------|
| api-gateway | 8/10 | 良好 | 配置完善，安全性到位 |
| auth-service | 7/10 | 良好 | JWT 實作健全，缺少部分 OAuth 功能 |
| user-service | 4/10 | 需改進 | 嚴重 N+1 問題，無 DB 持久化 |
| matching-service | 5/10 | 需改進 | 全表掃描，配對演算法簡陋 |
| payment-service | 6/10 | 可接受 | Stripe 整合完善，缺退款機制 |
| content-service | 5/10 | 需改進 | N+1 查詢，搜尋效能差 |
| notification-service | 6/10 | 可接受 | N+1 問題，無 TTL 設定 |
| messaging-service | 5/10 | 需改進 | 競態條件，分頁低效 |
| subscription-service | 4/10 | 需改進 | 分頁全表掃描，無過期檢查 |
| media-service | 5/10 | 需改進 | 全表掃描，無重試機制 |
| db-writer-service | 6/10 | 可接受 | 無冪等性保證 |
| admin-service | 6/10 | 可接受 | 缺速率限制 |

---

## 關鍵問題清單（按優先級）

### P0 - 立即修復

#### 1. N+1 查詢問題

影響服務: user-service, matching-service, content-service, notification-service, messaging-service

修復方案: 使用 Redis MGET 批量查詢取代逐筆查詢，預期改善查詢時間 O(N) -> O(1)，降低 80-95% 延遲。

#### 2. Redis 資料無持久化

所有用戶資料、配對記錄、貼文、訊息僅存在 Redis 記憶體中，無 PostgreSQL 同步。Redis 重啟等於全部資料丟失。

修復方案:
- 短期: 啟用 Redis AOF/RDB 持久化
- 中期: 實作雙寫機制 (Redis + PostgreSQL)
- 長期: 遷移至完整 TypeORM 架構，Redis 作為快取層

#### 3. 全表掃描 (SCAN/KEYS)

影響服務: matching-service, subscription-service, media-service

修復方案: 使用用戶索引 (Set/List/Sorted Set) 取代全表掃描，支援分頁查詢。

### P1 - 本週修復

#### 4. 缺少 TTL 設定

通知、廣播、臨時資料無過期時間，Redis 記憶體會無限增長。所有臨時資料應設定合理 TTL。

#### 5. 競態條件 (Race Condition)

影響服務: messaging-service, payment-service。訊息發送與列表更新非原子操作。修復方案: 使用 Lua 腳本保證原子性。

#### 6. Stripe 退款機制缺失

payment-service 僅有退款狀態，無實際 Stripe API 調用。需實作完整退款流程。

### P2 - 本月修復

- 共享庫混亂: 雙重 Kafka 模組實作、Redis 鍵命名不統一
- 缺少冪等性保證: db-writer-service Kafka 訊息重複消費問題

---

## 缺失的 API 端點

### user-service
- `DELETE /users/:userId` - 刪除用戶（軟刪除）
- `PUT /preferences` - 完整偏好設定更新
- `GET /blocked-by` - 查看誰封鎖了我

### matching-service
- `POST /undo` - 撤銷上一次滑動
- `GET /recommendations` - 基於評分的智能推薦

### payment-service
- `POST /transactions/:id/refund` - 退款 API
- `GET /wallet/analytics` - 收入分析和圖表

### content-service
- `PUT /posts/:id/archive` - 歸檔貼文
- `GET /posts/:id/analytics` - 貼文分析

### subscription-service
- `POST /subscriptions/upgrade` - 升級訂閱層級
- `POST /subscriptions/downgrade` - 降級訂閱層級

---

## 安全性檢查

### 已完善
- Stripe Webhook 簽名驗證

### 需修復
- JWT Secret 未驗證: 應在啟動時檢查 `JWT_SECRET` 是否存在
- 未統一使用 ValidationPipe: 部分服務缺少全局輸入驗證
- Redis 注入風險: 部分動態鍵名未清理

---

## 性能基準測試目標

| 端點 | 目標延遲 | 當前預估 | 優化後預估 |
|------|---------|---------|-----------|
| `GET /users/cards` | < 100ms | ~500ms | ~80ms |
| `GET /matching/matches` | < 50ms | ~300ms | ~40ms |
| `GET /posts` | < 150ms | ~600ms | ~100ms |
| `POST /messaging/send` | < 50ms | ~80ms | ~30ms |
| `GET /notifications/list` | < 100ms | ~400ms | ~60ms |

---

## 改進時間表

### Week 1: 緊急修復 (P0)
- user-service N+1 優化
- matching-service 全表掃描優化
- subscription-service 分頁優化
- 啟用 Redis 持久化

### Week 2: 性能優化 (P1)
- content-service 批量訂閱檢查
- notification-service MGET 優化
- messaging-service 原子操作
- 添加所有臨時資料的 TTL

### Week 3: 架構改進
- 統一 Kafka 模組
- 強制使用 BusinessException
- Stripe 退款機制
- 全局 ValidationPipe

### Week 4: 補充功能
- 實作缺失的 API 端點
- db-writer-service 冪等性
- 配對評分演算法
- 性能測試和基準

---

## 長期改進建議

### 架構演進
- 從 Redis-first 遷移到 PostgreSQL-first (Redis 作為快取)
- 實作 CQRS 模式 (命令查詢分離)
- 引入 Elasticsearch 處理全文搜尋

### 可觀測性
- 實作分布式追蹤 (OpenTelemetry)
- 添加業務指標監控 (配對成功率、支付成功率)
- 實作錯誤預算和 SLO

### 測試完善
- 增加集成測試覆蓋率 (目標 > 70%)
- 實作負載測試 (k6)
- 添加混沌工程測試

---

*原始資料來源: BACKEND_HEALTH_REPORT.md, BACKEND_SUMMARY.md*
*評估者: Backend Developer Agent*
