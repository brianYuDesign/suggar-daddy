# 實作工作流程：業務邏輯缺口補齊

> **策略**: Systematic | **深度**: Deep
> **來源**: `docs/BUSINESS_LOGIC_GAPS.md` + 全面程式碼探索
> **生成日期**: 2026-02-12
> **最後更新**: 2026-02-12
> **預估總工作量**: 6 個階段，按優先級排序

---

## 現狀總結

### 已完成 ✅
- 授權與身分（所有 7 個服務）
- 冪等與重複請求防護
- 業務流程（訂閱支付、貼文可見性、訂閱牆、API 分頁）
- 架構入口（API Gateway、Admin）
- DLQ 基礎版（db-writer-service 已有 Redis + Kafka DLQ）
- 一致性服務基礎版（ConsistencyService 已有背景重試 + 自動修復）
- **Admin 管理後台完善**（見 `workflow_admin_panel.md`）：
  - 提款審核、訂閱管理、交易管理
  - 用戶搜尋/角色變更/活動歷史
  - 貼文列表、配對統計
  - CSV 匯出、日期範圍選擇器、Session 超時
  - 後端 admin-service 63/63 測試通過
- **服務改進**（隨 admin panel 一同完成）：
  - 移除 content-service/payment-service 重複的 entity 檔案（統一使用 database lib）
  - Kafka producer `sendEvent` 方法改進
  - Redis service `setex` 方法新增
  - 各服務 entity import 統一化

### 待補缺口（按優先級排序）

| # | 缺口 | 影響面 | 優先級 | 狀態 |
|---|------|--------|--------|------|
| 1 | **Web 前端** — 僅有首頁，無任何用戶功能 | 產品上線 | 🔴 P0 | ⏳ 未開始 |
| 2 | **OAuth 社交登入** — 僅 email/password | 用戶體驗 & 轉換率 | 🟠 P1 | ⏳ 未開始 |
| 3 | **Web 前端 WebSocket 整合** — 後端 Gateway 已建但前端未接 | 即時訊息 | 🟠 P1 | ⏳ 未開始 |
| 4 | **Stripe Connect（創作者分潤）** — 目前平台統收 + 手動提款 | 創作者體驗 | 🟡 P2 | ⏳ 未開始 |
| 5 | **DLQ 告警強化** — 基礎 DLQ 已有，缺生產級告警 | 系統穩定性 | 🟡 P2 | ⏳ 未開始 |
| 6 | **Redis/DB 一致性強化** — 基礎版已有，缺生產級保障 | 資料正確性 | 🟡 P2 | ⏳ 未開始 |
| 7 | **前端測試** — 無任何前端單元/整合測試 | 品質保證 | 🟢 P3 | ⏳ 未開始 |
| 8 | **後端 Controller 整合測試** — 僅 Service 層測試 | 品質保證 | 🟢 P3 | ⏳ 未開始 |

---

## 階段 1：Web 前端核心頁面 🔴 P0

> **目標**: 建構用戶端 MVP，實現完整的用戶流程
> **前置**: 無
> **預估**: 大型工作項

### Phase 1.1 — 認證流程

| 任務 | 說明 | 影響檔案 |
|------|------|----------|
| 1.1.1 登入頁面 | Email/Password 表單，呼叫 auth API，JWT 存 localStorage | `apps/web/app/login/page.tsx` (新) |
| 1.1.2 註冊頁面 | 註冊表單（email, password, displayName, role 選擇） | `apps/web/app/register/page.tsx` (新) |
| 1.1.3 AuthProvider | 全域認證 Context，token 管理，401 攔截，自動跳轉 | `apps/web/app/providers/auth-provider.tsx` (新) |
| 1.1.4 路由守衛 | 未登入跳 /login，已登入跳主頁；依 role 分流 | `apps/web/app/middleware.ts` 或 layout 層 |
| 1.1.5 API Client 整合 | 使用 `@suggar-daddy/api-client` 接入後端 | `apps/web/lib/api.ts` (新) |

**依賴**: api-client lib 已有 AuthApi 類別

### Phase 1.2 — 發現與配對（Matching）

| 任務 | 說明 | 影響檔案 |
|------|------|----------|
| 1.2.1 發現頁（Swipe 卡片） | Tinder 風格滑卡 UI，左滑不喜歡/右滑喜歡 | `apps/web/app/discover/page.tsx` (新) |
| 1.2.2 卡片元件 | 用戶頭像、名稱、簡介、年齡等資訊展示 | `apps/web/components/user-card.tsx` (新) |
| 1.2.3 配對列表 | 已配對用戶清單，點擊進入聊天 | `apps/web/app/matches/page.tsx` (新) |
| 1.2.4 配對動畫 | 雙向 like 配對成功動畫 | `apps/web/components/match-modal.tsx` (新) |

**依賴**: matching-service API (`/api/matching/cards`, `/swipe`, `/matches`)

### Phase 1.3 — 訊息系統

| 任務 | 說明 | 影響檔案 |
|------|------|----------|
| 1.3.1 對話列表 | 顯示所有對話，最新訊息預覽 | `apps/web/app/messages/page.tsx` (新) |
| 1.3.2 聊天室 | 即時聊天 UI，訊息氣泡、輸入框 | `apps/web/app/messages/[conversationId]/page.tsx` (新) |
| 1.3.3 Socket.IO 客戶端 | 連接 messaging-service WebSocket Gateway | `apps/web/lib/socket.ts` (新) |
| 1.3.4 打字指示器 | 對方正在輸入的即時顯示 | 整合於聊天室元件 |
| 1.3.5 線上狀態 | 用戶在線/離線狀態 | 整合於對話列表 |

**依賴**: messaging-service WS Gateway (port 3005)，事件: join, send_message, typing

### Phase 1.4 — 內容與動態

| 任務 | 說明 | 影響檔案 |
|------|------|----------|
| 1.4.1 動態牆/Feed | 瀑布流貼文列表（公開 + 已訂閱） | `apps/web/app/feed/page.tsx` (新) |
| 1.4.2 貼文卡片 | 圖片/影片、文字、讚/留言數、鎖定狀態 | `apps/web/components/post-card.tsx` (新) |
| 1.4.3 建立貼文 | 創作者發文（文字 + 媒體上傳 + PPV 設定） | `apps/web/app/create/page.tsx` (新) |
| 1.4.4 貼文詳情 | 留言區、PPV 購買按鈕、分享 | `apps/web/app/posts/[postId]/page.tsx` (新) |
| 1.4.5 媒體上傳元件 | 圖片/影片上傳至 media-service | `apps/web/components/media-upload.tsx` (新) |

**依賴**: content-service API, media-service API

### Phase 1.5 — 個人資料與訂閱

| 任務 | 說明 | 影響檔案 |
|------|------|----------|
| 1.5.1 個人資料頁 | 編輯頭像、名稱、簡介 | `apps/web/app/profile/page.tsx` (新) |
| 1.5.2 創作者公開頁 | 其他用戶的公開資料 + 貼文 + 訂閱按鈕 | `apps/web/app/creator/[userId]/page.tsx` (新) |
| 1.5.3 訂閱管理 | 訂閱方案選擇、Stripe 支付、我的訂閱列表 | `apps/web/app/subscriptions/page.tsx` (新) |
| 1.5.4 打賞功能 | 打賞金額輸入 + Stripe 支付 | `apps/web/components/tip-dialog.tsx` (新) |
| 1.5.5 Stripe Elements 整合 | 前端支付表單元件 | `apps/web/lib/stripe.ts` (新) |

**依賴**: user-service, subscription-service, payment-service, Stripe.js SDK

### Phase 1.6 — 通知

| 任務 | 說明 | 影響檔案 |
|------|------|----------|
| 1.6.1 通知頁面 | 通知列表（配對、訊息、打賞、訂閱等） | `apps/web/app/notifications/page.tsx` (新) |
| 1.6.2 通知鈴鐺 | Header 未讀數 badge | `apps/web/components/notification-bell.tsx` (新) |
| 1.6.3 FCM 整合 | 瀏覽器推播通知許可 + 裝置 token 註冊 | `apps/web/lib/firebase.ts` (新) |

**依賴**: notification-service API + FCM

### 驗證檢查點
- [ ] 用戶可完成 註冊 → 登入 → 滑卡 → 配對 → 聊天 完整流程
- [ ] 創作者可 發文 → 設定 PPV → 收到打賞/訂閱
- [ ] 訂閱者可 瀏覽 Feed → 購買 PPV → 訂閱創作者
- [ ] 通知在所有關鍵事件觸發

---

## 階段 2：OAuth 社交登入 🟠 P1

> **目標**: 支援 Google/Apple 社交登入，提升轉換率
> **前置**: 階段 1.1（認證流程）
> **預估**: 中型工作項

### Phase 2.1 — 後端 OAuth

| 任務 | 說明 | 影響檔案 |
|------|------|----------|
| 2.1.1 Passport Google Strategy | passport-google-oauth20 策略 | `apps/auth-service/src/app/strategies/google.strategy.ts` (新) |
| 2.1.2 Passport Apple Strategy | passport-apple 策略 | `apps/auth-service/src/app/strategies/apple.strategy.ts` (新) |
| 2.1.3 OAuth Controller | GET /auth/google, /auth/google/callback 等 | `apps/auth-service/src/app/oauth.controller.ts` (新) |
| 2.1.4 User Entity 擴充 | 增加 provider、providerId 欄位 | `libs/database/src/entities/user.entity.ts` |
| 2.1.5 Auth Service 整合 | validateOAuthUser — 已存在則登入，不存在則建立 | `apps/auth-service/src/app/auth.service.ts` |
| 2.1.6 環境變數 | GOOGLE_CLIENT_ID, GOOGLE_SECRET, APPLE_CLIENT_ID 等 | `.env.example` |

**依賴**: `passport-google-oauth20`, `passport-apple` 套件

### Phase 2.2 — 前端 OAuth

| 任務 | 說明 | 影響檔案 |
|------|------|----------|
| 2.2.1 社交登入按鈕 | Google / Apple 登入按鈕 | `apps/web/app/login/page.tsx` |
| 2.2.2 OAuth Callback 頁面 | 接收 callback，解析 token | `apps/web/app/auth/callback/page.tsx` (新) |

### 驗證檢查點
- [ ] Google OAuth 完整流程（授權 → callback → JWT 發放）
- [ ] Apple OAuth 完整流程
- [ ] 已有 email 帳號綁定社交登入
- [ ] 新社交用戶自動建立帳號

---

## 階段 3：Stripe Connect 創作者分潤 🟡 P2

> **目標**: 讓創作者透過 Stripe Connect 直接收款，平台自動抽成
> **前置**: 階段 1.5（訂閱與支付 UI）
> **預估**: 大型工作項

### Phase 3.1 — 資料模型

| 任務 | 說明 | 影響檔案 |
|------|------|----------|
| 3.1.1 User Entity 擴充 | 增加 `stripeAccountId`, `stripeOnboardingComplete` | `libs/database/src/entities/user.entity.ts` |
| 3.1.2 DB Migration | 遷移腳本 | `libs/database/src/migrations/` (新) |
| 3.1.3 db-writer 更新 | 處理 user.updated 時同步新欄位 | `apps/db-writer-service/src/app/db-writer.service.ts` |

### Phase 3.2 — Connect Onboarding

| 任務 | 說明 | 影響檔案 |
|------|------|----------|
| 3.2.1 Connect Account 建立 | Stripe `accounts.create()` (Express type) | `libs/common/src/stripe/stripe-connect.service.ts` (新) |
| 3.2.2 Account Links | 生成 onboarding URL | 同上 |
| 3.2.3 Onboarding Controller | POST /stripe/connect/onboard, GET /stripe/connect/status | `apps/payment-service/src/app/stripe/stripe-connect.controller.ts` (新) |
| 3.2.4 Webhook 擴充 | 處理 `account.updated` 事件 | `apps/payment-service/src/app/stripe/stripe-webhook.service.ts` |

### Phase 3.3 — 分潤支付

| 任務 | 說明 | 影響檔案 |
|------|------|----------|
| 3.3.1 PaymentIntent 改造 | 加入 `transfer_data.destination` + `application_fee_amount` | `apps/payment-service/src/app/stripe/stripe-payment.service.ts` |
| 3.3.2 Subscription 改造 | 訂閱建立時帶 Connect destination | `apps/subscription-service/src/app/stripe/stripe-subscription.service.ts` |
| 3.3.3 平台費率設定 | 可配置的抽成比例（目前硬編碼 20%） | `apps/payment-service/src/app/wallet.service.ts` |
| 3.3.4 WalletService 更新 | 區分 Connect 直接付款 vs 平台統收模式 | 同上 |

### Phase 3.4 — 前端整合

| 任務 | 說明 | 影響檔案 |
|------|------|----------|
| 3.4.1 創作者設定頁 | Connect 狀態、開始 onboarding、儀表板連結 | `apps/web/app/settings/payments/page.tsx` (新) |
| 3.4.2 收益儀表板 | 收入、提款、交易歷史 | `apps/web/app/earnings/page.tsx` (新) |
| 3.4.3 Admin Connect 管理 | 後台查看創作者 Connect 狀態 | `apps/admin/app/(dashboard)/creators/page.tsx` (新) |

### 驗證檢查點
- [ ] 創作者可完成 Stripe Connect onboarding
- [ ] PPV/打賞/訂閱支付自動分潤至創作者 Connect 帳戶
- [ ] 平台抽成 20% 正確計算
- [ ] Webhook 正確處理 account.updated
- [ ] 後台可查看創作者 Connect 狀態

---

## 階段 4：DLQ 告警與一致性強化 🟡 P2

> **目標**: 將現有基礎版 DLQ 和一致性檢查提升至生產級
> **前置**: 無
> **預估**: 中型工作項

### 現狀分析

**已有的 DLQ 機制** (`apps/db-writer-service/src/app/dlq.service.ts`):
- Redis 儲存失敗訊息 + Kafka dead-letter-queue topic
- 閾值 100 條時觸發 `dlq.alert` 事件
- 手動 retry/retryAll API

**已有的一致性機制** (`apps/db-writer-service/src/app/consistency.service.ts`):
- 背景每 30 秒重試失敗寫入（最多 10 次）
- 抽樣一致性檢查（100 users + 100 posts）
- 自動修復（DB → Redis 同步）

### Phase 4.1 — DLQ 告警

| 任務 | 說明 | 影響檔案 |
|------|------|----------|
| 4.1.1 告警通道 | 接入 Slack/Email/webhook 通知 | `apps/db-writer-service/src/app/alert.service.ts` (新) |
| 4.1.2 分級告警 | WARNING (50條), CRITICAL (100條), FATAL (500條) | `apps/db-writer-service/src/app/dlq.service.ts` |
| 4.1.3 告警去重 | 相同告警在冷卻期內不重複發送（Redis TTL） | 同上 |
| 4.1.4 Admin 即時通知 | DLQ 告警推送到 admin 前端 System 頁面 | `apps/admin/app/(dashboard)/system/page.tsx` |
| 4.1.5 DLQ 管理 API | Admin 可查看、重試、清除 DLQ 訊息 | `apps/db-writer-service/src/app/dlq.controller.ts` (新) |

### Phase 4.2 — 一致性強化

| 任務 | 說明 | 影響檔案 |
|------|------|----------|
| 4.2.1 擴展檢查範圍 | 覆蓋所有實體（subscriptions, tips, matches 等） | `apps/db-writer-service/src/app/consistency.service.ts` |
| 4.2.2 排程一致性檢查 | 每日定時全量掃描（而非僅手動觸發） | 同上 |
| 4.2.3 一致性報告 | 歷史報告存 Redis，Admin 可查看趨勢 | 同上 + Admin System 頁面 |
| 4.2.4 寫入確認機制 | DB 寫入後驗證 Redis 寫入成功，失敗立即記錄 | `apps/db-writer-service/src/app/db-writer.service.ts` |
| 4.2.5 Metrics 暴露 | Prometheus 格式暴露 DLQ/一致性指標 | `apps/db-writer-service/src/app/metrics.controller.ts` (新) |

### 驗證檢查點
- [ ] DLQ 超過閾值時，Slack/Email 收到告警
- [ ] 一致性檢查覆蓋所有關鍵實體
- [ ] Admin 系統頁面即時顯示 DLQ 和一致性狀態
- [ ] Prometheus 可抓取 DLQ/一致性指標

---

## 階段 5：測試覆蓋補齊 🟢 P3

> **目標**: 補齊前端和後端整合測試
> **前置**: 階段 1（Web 前端完成後）
> **預估**: 中型工作項

### Phase 5.1 — 後端 Controller 整合測試

| 任務 | 說明 | 影響檔案 |
|------|------|----------|
| 5.1.1 Auth Controller 測試 | 註冊/登入/refresh/logout 端到端 | `apps/auth-service/src/app/auth.controller.spec.ts` (新) |
| 5.1.2 Content Controller 測試 | CRUD、權限、PPV 存取控制 | `apps/content-service/src/app/*.controller.spec.ts` (新) |
| 5.1.3 Payment Controller 測試 | Tips、PPV、Stripe webhook | `apps/payment-service/src/app/*.controller.spec.ts` (新) |
| 5.1.4 Matching Controller 測試 | Swipe、cards、matches | `apps/matching-service/src/app/*.controller.spec.ts` (新) |
| 5.1.5 Subscription Controller 測試 | CRUD、Stripe 訂閱 | `apps/subscription-service/src/app/*.controller.spec.ts` (新) |

### Phase 5.2 — 前端元件測試

| 任務 | 說明 | 影響檔案 |
|------|------|----------|
| 5.2.1 測試環境配置 | Jest + React Testing Library 配置 | `apps/web/jest.config.ts` |
| 5.2.2 認證元件測試 | Login、Register、AuthProvider 測試 | `apps/web/app/**/*.spec.tsx` (新) |
| 5.2.3 聊天元件測試 | Socket.IO mock + 訊息渲染 | `apps/web/app/messages/**/*.spec.tsx` (新) |
| 5.2.4 Admin 元件測試 | Dashboard、用戶管理、內容審核 | `apps/admin/app/**/*.spec.tsx` (新) |
| 5.2.5 共享 UI 測試 | libs/ui 元件測試 | `libs/ui/src/**/*.spec.tsx` (新) |

### Phase 5.3 — E2E 測試

| 任務 | 說明 | 影響檔案 |
|------|------|----------|
| 5.3.1 Playwright 配置 | 前端 E2E 測試框架 | `playwright.config.ts` (新) |
| 5.3.2 核心流程 E2E | 註冊→配對→聊天→訂閱 完整流程 | `e2e/web/*.spec.ts` (新) |
| 5.3.3 Admin E2E | 升級現有 Puppeteer 測試到 Playwright | `e2e/admin/*.spec.ts` (新) |

### 驗證檢查點
- [ ] 後端所有 Controller 有整合測試
- [ ] 前端關鍵元件有單元測試
- [ ] 核心用戶流程有 E2E 測試
- [ ] `nx run-many -t test --all` 全部通過

---

## 階段 6：生產就緒強化 🟢 P3

> **目標**: 為 AWS 部署做準備
> **前置**: 階段 1-4
> **預估**: 中型工作項

### Phase 6.1 — 安全性

| 任務 | 說明 |
|------|------|
| 6.1.1 Rate Limiting | API Gateway 加入 @nestjs/throttler |
| 6.1.2 CORS 收緊 | 從 `origin: "*"` 改為白名單 |
| 6.1.3 Helmet | HTTP 安全標頭 |
| 6.1.4 Input Validation 強化 | 所有 DTO 加入 class-validator 驗證 |
| 6.1.5 CSRF 防護 | 前端表單 CSRF token |

### Phase 6.2 — 效能

| 任務 | 說明 |
|------|------|
| 6.2.1 Redis 快取策略 | 統一 TTL 管理，熱點數據預載 |
| 6.2.2 DB 索引 | 依 `docs/04-運維與效能.md` 建議建立索引 |
| 6.2.3 API Response 壓縮 | gzip/brotli |
| 6.2.4 Image 優化 | Next.js Image + CDN |

### Phase 6.3 — Docker & CI/CD

| 任務 | 說明 |
|------|------|
| 6.3.1 多階段 Dockerfile | 各服務的生產級 Dockerfile |
| 6.3.2 docker-compose.prod.yml | 生產環境配置 |
| 6.3.3 GitHub Actions | CI：lint + test + build + push ECR |
| 6.3.4 Health Checks | 所有服務加入 /health 端點 |

### 驗證檢查點
- [ ] 所有 API 有 rate limiting
- [ ] CORS 僅允許指定域名
- [ ] Docker 映像可正常建構並執行
- [ ] CI pipeline 通過 lint + test + build

---

## 依賴關係圖

```
階段 1 (Web 前端) ─────────────────────────────────┐
  ├─ 1.1 認證流程                                    │
  ├─ 1.2 配對 (依賴 1.1)                             │
  ├─ 1.3 訊息 (依賴 1.1)                             │
  ├─ 1.4 內容 (依賴 1.1)                             │
  ├─ 1.5 訂閱/支付 (依賴 1.1)                        │
  └─ 1.6 通知 (依賴 1.1)                             │
                                                      │
階段 2 (OAuth) ── 依賴 1.1                            │
                                                      │
階段 3 (Stripe Connect) ── 依賴 1.5                   │
                                                      │
階段 4 (DLQ/一致性) ── 獨立，可平行                    │
                                                      │
階段 5 (測試) ── 依賴 階段 1 完成                      │
                                                      │
階段 6 (生產就緒) ── 依賴 階段 1-4                     │
```

### 建議平行執行策略

```
Sprint 1-3:  階段 1 (Web 前端) + 階段 4 (DLQ/一致性) ← 可平行
Sprint 4:    階段 2 (OAuth)
Sprint 5-6:  階段 3 (Stripe Connect)
Sprint 7:    階段 5 (測試)
Sprint 8:    階段 6 (生產就緒)
```

---

## 技術決策記錄

| 決策 | 選擇 | 理由 |
|------|------|------|
| OAuth 方案 | Passport.js | NestJS 生態系標準，社群支援佳 |
| 前端即時通訊 | Socket.IO Client | 後端已用 Socket.IO，保持一致 |
| 前端狀態管理 | React Context + SWR/TanStack Query | 輕量，避免 Redux 過度工程 |
| Stripe Connect 類型 | Express | 創作者 onboarding 最簡化 |
| E2E 測試框架 | Playwright | 現代化，支援多瀏覽器 |
| 告警通道 | Slack Webhook + Email | 低門檻，快速實施 |

---

## 風險與緩解

| 風險 | 機率 | 影響 | 緩解策略 |
|------|------|------|----------|
| Web 前端工作量超出預期 | 高 | 延遲上線 | 先 MVP 核心流程，後續迭代 |
| Stripe Connect 審核 | 中 | 創作者無法收款 | 保留現有 wallet 模式作為 fallback |
| WebSocket 跨域問題 | 中 | 即時功能失效 | API Gateway 統一代理 WS |
| OAuth 第三方 API 變更 | 低 | 登入失敗 | 保留 email/password 作為基本方案 |

---

## 下一步

**最高優先級**: 階段 1（Web 前端核心頁面）— 這是產品上線的最大阻礙。

建議執行順序：
1. **Phase 1.1** — 認證流程（登入/註冊/AuthProvider）
2. **Phase 1.2** — 發現與配對（Tinder 風格滑卡）
3. **Phase 1.3** — 訊息系統（Socket.IO 即時聊天）
4. **Phase 1.4** — 內容與動態（Feed/貼文/PPV）
5. **Phase 1.5** — 個人資料與訂閱（Stripe 支付）
6. **Phase 1.6** — 通知

階段 4（DLQ/一致性）可與階段 1 平行執行。

每個 Phase 完成後執行驗證檢查點，通過後再進入下一個 Phase。
