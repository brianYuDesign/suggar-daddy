# 🚀 快速修復清單

## Week 1: 緊急修復（P0）

### Day 1-2: user-service N+1 優化
- [ ] 檢查 `apps/user-service/src/app/user.service.ts`
- [ ] 修復 `getCardsForRecommendation()` (第 131 行)
- [ ] 修復 `getFollowers()` (第 339-346 行)
- [ ] 修復 `getFollowing()` (第 360-369 行)
- [ ] 修復 `getRecommendedCreators()` (第 421 行)
- [ ] 修復 `searchUsers()` (第 457 行)
- [ ] 使用 `mget()` 替代循環 `get()`
- [ ] 測試驗證性能改善

### Day 2-3: matching-service 全表掃描優化
- [ ] 檢查 `apps/matching-service/src/app/matching.service.ts`
- [ ] 修復 `getMatches()` (第 270 行)
- [ ] 修復 `unmatch()` (第 320 行)
- [ ] 建立用戶配對索引 `user:matches:{userId}`
- [ ] 使用 ZSET 存儲配對（帶時間戳）
- [ ] 移除 SCAN 操作
- [ ] 測試驗證功能正確性

### Day 3-4: subscription-service 分頁優化
- [ ] 檢查 `apps/subscription-service/src/app/subscription.service.ts`
- [ ] 修復 `findBySubscriber()` (第 72-84 行)
- [ ] 建立用戶訂閱索引 `user:subscriptions:{userId}`
- [ ] 使用 `lRange` 實現真正的分頁
- [ ] 避免載入全部訂閱
- [ ] 測試大數據量場景

### Day 4-5: Redis 持久化配置
- [ ] 檢查 Redis 配置檔
- [ ] 啟用 AOF: `appendonly yes`
- [ ] 設定同步頻率: `appendfsync everysec`
- [ ] 啟用 RDB: `save 900 1`, `save 300 10`
- [ ] 驗證持久化生效
- [ ] 監控 Redis 性能影響

---

## Week 2: 性能優化（P1）

### Day 1-2: content-service 批量訂閱檢查
- [ ] 在 subscription-service 新增 `POST /batch-check` 端點
- [ ] 修改 content-service `findByCreatorWithAccess()`
- [ ] 實作訂閱狀態快取（5 分鐘 TTL）
- [ ] 測試批量 API 性能
- [ ] 監控快取命中率

### Day 2-3: notification-service 優化
- [ ] 修復 `getNotifications()` (第 72-78 行)
- [ ] 使用 `mget()` 批量獲取
- [ ] 添加通知 TTL（7 天）
- [ ] 限制用戶通知列表最大長度（100 條）
- [ ] 測試過期清理機制

### Day 3-4: messaging-service 原子操作
- [ ] 編寫 Lua 腳本處理訊息發送
- [ ] 確保訊息添加和對話更新原子性
- [ ] 添加未讀計數器
- [ ] 測試並發訊息發送
- [ ] 驗證無數據丟失

### Day 4-5: 添加 TTL 到所有臨時資料
- [ ] 通知: 7 天
- [ ] 廣播訊息: 24 小時
- [ ] PPV 解鎖記錄: 365 天
- [ ] 登入嘗試記錄: 15 分鐘
- [ ] Email 驗證 token: 24 小時
- [ ] 密碼重置 token: 1 小時
- [ ] 測試 TTL 自動過期

---

## Week 3: 架構改進（P1）

### Day 1-2: 統一 Kafka 模組
- [ ] 檢查 `libs/kafka` 和 `libs/common/kafka`
- [ ] 決定保留哪個實作（建議 libs/kafka）
- [ ] 遷移所有服務到統一模組
- [ ] 移除重複代碼
- [ ] 更新所有服務的 imports
- [ ] 測試 Kafka 事件正常發送

### Day 2-3: 強制使用 BusinessException
- [ ] 找出所有 `throw new Error(` 的位置
- [ ] 替換為 `BusinessException`
- [ ] 統一錯誤碼定義
- [ ] 更新錯誤響應格式
- [ ] 測試 API 錯誤響應

### Day 3-4: Stripe 退款機制
- [ ] 在 payment-service 新增 `POST /transactions/:id/refund`
- [ ] 實作 Stripe refund API 調用
- [ ] 實作錢包補償邏輯
- [ ] 發送 `PAYMENT_REFUNDED` Kafka 事件
- [ ] 測試完整退款流程
- [ ] 添加退款記錄審計

### Day 4-5: 全局 ValidationPipe
- [ ] 檢查所有服務的 main.ts
- [ ] 添加 `useGlobalPipes(new ValidationPipe(...))`
- [ ] 驗證 DTO 驗證生效
- [ ] 測試無效輸入被拒絕
- [ ] 統一驗證錯誤格式

---

## Week 4: 補充功能（P2）

### Day 1-2: 缺失的 API 端點
- [ ] user-service: `DELETE /users/:userId` (軟刪除)
- [ ] user-service: `PUT /preferences` (完整偏好)
- [ ] matching-service: `POST /undo` (撤銷滑動)
- [ ] payment-service: `GET /wallet/analytics` (收入分析)
- [ ] content-service: `PUT /posts/:id/archive` (歸檔)
- [ ] subscription-service: `POST /subscriptions/upgrade` (升級)

### Day 2-3: db-writer-service 冪等性
- [ ] 實作訊息處理冪等性鍵
- [ ] 使用 Redis 記錄已處理訊息
- [ ] 設定 24 小時過期
- [ ] 測試重複訊息處理
- [ ] 監控重複訊息率

### Day 3-4: 配對評分演算法
- [ ] 實作位置評分（距離）
- [ ] 實作年齡相容性評分
- [ ] 實作偏好匹配評分
- [ ] 綜合評分算法
- [ ] 按評分排序推薦
- [ ] A/B 測試驗證效果

### Day 4-5: 性能測試
- [ ] 設定 k6 / JMeter
- [ ] 編寫關鍵端點測試腳本
- [ ] 執行負載測試
- [ ] 記錄性能基準
- [ ] 識別性能瓶頸
- [ ] 生成性能報告

---

## 驗證清單

### 功能驗證
- [ ] 所有 API 端點正常運作
- [ ] Kafka 事件正確發送和消費
- [ ] Redis 快取正確更新
- [ ] 資料庫寫入無錯誤
- [ ] 錯誤處理符合預期

### 性能驗證
- [ ] 關鍵端點響應時間 < 100ms
- [ ] N+1 查詢已消除
- [ ] 全表掃描已優化
- [ ] Redis 記憶體使用穩定
- [ ] Kafka 消費無延遲

### 安全驗證
- [ ] JWT 認證正常
- [ ] 權限檢查完整
- [ ] 輸入驗證生效
- [ ] Stripe webhook 簽名驗證
- [ ] 無 SQL/Redis 注入風險

---

## 監控指標

### 關鍵指標
- [ ] API 響應時間 P95 < 200ms
- [ ] 錯誤率 < 0.1%
- [ ] Redis 快取命中率 > 90%
- [ ] Kafka 消費延遲 < 1s
- [ ] 資料庫連接池使用率 < 80%

### 業務指標
- [ ] 配對成功率
- [ ] 支付成功率
- [ ] 訊息送達率
- [ ] 通知推送成功率
- [ ] 用戶留存率

---

## 參考資源

- [完整健康度報告](./BACKEND_HEALTH_REPORT.md)
- [Redis 最佳實踐](https://redis.io/topics/optimization)
- [NestJS 文檔](https://docs.nestjs.com)
- [Kafka 消費者配置](https://kafka.apache.org/documentation/#consumerconfigs)

---

*清單生成時間: 2024*
*使用方式: 勾選完成的項目，追蹤修復進度*
