# 專案進度報告

**最後更新：** 2026-02-12

---

## 整體進度

| Phase | 說明 | 狀態 |
|-------|------|------|
| Phase 1 | 配對系統（Auth/User/Matching/Messaging/Notification） | ✅ 完成 |
| Phase 2 | 訂閱系統（Subscription/Content/Payment/Media） | ✅ 完成 |
| Phase 3 | 優化（讀寫分離/Sharding/分頁/效能） | ✅ 完成 |
| Phase 4 | 管理後台（Admin Service + Admin Frontend） | ✅ 完成 |
| Phase 5 | AWS 部署 | 📋 規劃中 |

---

## 服務完成度

| 服務 | Port | 核心功能 | 測試 | 狀態 |
|------|------|----------|------|------|
| api-gateway | 3000 | 路由代理、Rate limiting | — | ✅ |
| auth-service | 3002 | 註冊/登入/JWT/Refresh | ✅ | ✅ |
| user-service | 3001 | 用戶資料/卡片/推薦 | ✅ | ✅ |
| matching-service | 3003 | 滑卡/配對/unmatch | ✅ | ✅ |
| notification-service | 3004 | 通知發送/列表/已讀 | ✅ | ✅ |
| messaging-service | 3005 | 對話/訊息/參與者驗證 | ✅ | ✅ |
| content-service | 3006 | 貼文CRUD/讚/留言/PPV/訂閱牆 | ✅ | ✅ |
| subscription-service | 3009 | 訂閱方案/建立/延長/取消 | ✅ | ✅ |
| payment-service | 3007 | 打賞/PPV/Stripe Webhook | ✅ | ✅ |
| media-service | 3008 | 檔案上傳/刪除 | ✅ | ✅ |
| db-writer-service | 3010 | Kafka → PostgreSQL | ✅ | ✅ |
| admin-service | 3011 | 用戶管理/內容審核 | — | ✅ |
| web (frontend) | 4200 | 使用者介面 | — | 🔧 開發中 |
| admin (frontend) | 4300 | 管理後台介面 | E2E | ✅ |

---

## 最近完成項目

### 2026-02-12

- **API 分頁**：所有列表端點加入 `page`/`limit` 查詢，回傳 `PaginatedResponse<T>`
  - Content：貼文列表、留言
  - Media：媒體列表
  - Payment：打賞、交易紀錄
  - Subscription：訂閱列表
- **Admin 路由修正**：移除 `/(dashboard)` 前綴，修正導航連結
- **API Gateway**：修正 subscription-service proxy port
- **新增測試**：ModerationService spec、WalletService spec
- **Admin E2E 測試**：Puppeteer 瀏覽器自動化（login、dashboard、用戶管理、內容審核）
- **Redis**：新增 `lLen()` 方法支援分頁 total count
- **清理**：移除 `.nx/workspace-data` from git tracking

### 先前完成

- DTO validation classes、Global exception filter、Kafka improvements
- Security hardening（Rate limiting、input validation）
- Media-service test fixes
- API Gateway rate limiting upgrade
- Shared UI component library

---

## 跨服務功能

| 功能 | 狀態 | 說明 |
|------|------|------|
| JWT 認證 | ✅ | 全服務統一 JWT + Role-based access |
| 冪等處理 | ✅ | PPV 重複購買、Stripe Webhook |
| API 分頁 | ✅ | 統一 PaginatedResponse 格式 |
| Kafka 事件 | ✅ | 所有寫入經 Kafka → DB Writer |
| Redis 快取 | ✅ | 所有讀取來自 Redis |
| Stripe 整合 | ✅ | 訂閱/PPV/打賞 + Webhook |
| Swagger 文件 | ✅ | Content/Payment/Media/Subscription |

---

## 待完成項目

### 高優先

- [ ] OAuth 第三方登入（Google/Apple）
- [ ] WebSocket 即時通訊
- [ ] 真實推播 FCM/APNs

### 中優先

- [ ] Stripe Connect（創作者分潤）
- [ ] 死信佇列（Kafka 消費失敗告警）
- [ ] Redis ↔ DB 一致性校準策略

### 低優先

- [ ] 前端元件測試（web/admin）
- [ ] Controller 層整合測試
- [ ] AWS 部署自動化（CI/CD）

---

## 技術債

- Kafka 消費失敗僅簡易重試（3 次），無死信佇列
- Redis 與 DB 不一致時無自動校準
- 前端測試覆蓋不足
