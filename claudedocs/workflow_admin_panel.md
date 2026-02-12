# 實作工作流程：Admin 管理後台完善

> **策略**: Systematic | **深度**: Deep
> **生成日期**: 2026-02-12
> **最後更新**: 2026-02-12
> **範圍**: 僅限 Admin 後台（admin-service + admin 前端）
> **狀態**: ✅ 主要功能已完成（Phase 1-5 核心項目）

---

## 現狀分析

### 已有功能 ✅（11 個主要頁面）

| 頁面 | 路由 | 功能 | 後端支援 | 狀態 |
|------|------|------|----------|------|
| Dashboard | `/` | 統計卡片、14 日營收圖、服務狀態、角色分佈、待審核提款 | ✅ | ✅ 已強化 |
| 用戶管理 | `/users` | 列表分頁、角色/狀態篩選、停用/啟用、**搜尋** | ✅ | ✅ 已強化 |
| 用戶詳情 | `/users/[userId]` | 基本資料、停用/啟用、**角色變更**、**活動歷史** | ✅ | ✅ 已強化 |
| 內容審核 | `/content` | 檢舉列表、下架/恢復、**貼文列表 Tab** | ✅ | ✅ 已強化 |
| 檢舉詳情 | `/content/reports/[reportId]` | 檢舉與貼文資訊、下架操作 | ✅ | ✅ |
| 支付統計 | `/payments` | 營收、交易統計、Top 創作者、**日期範圍報表**、**CSV 匯出** | ✅ | ✅ 已強化 |
| 數據分析 | `/analytics` | DAU/MAU、創作者營收、熱門內容、流失率、**配對統計** | ✅ | ✅ 已強化 |
| 系統監控 | `/system` | Redis/DB 健康、Kafka、DLQ、一致性 | ✅ | ✅ |
| **訂閱管理** | `/subscriptions` | 訂閱列表、統計、方案管理、啟用/停用 | ✅ | ✅ 新增 |
| **交易管理** | `/transactions` | 交易列表、類型統計、篩選、CSV 匯出 | ✅ | ✅ 新增 |
| **提款審核** | `/withdrawals` | 提款列表、審核、統計 | ✅ | ✅ 新增 |

### 缺失功能進度

| # | 功能 | 重要性 | 狀態 | 備註 |
|---|------|--------|------|------|
| 1 | **提款審核** | 🔴 關鍵 | ✅ 已完成 | Phase 1.1 |
| 2 | **訂閱管理** | 🔴 關鍵 | ✅ 已完成 | Phase 1.2 |
| 3 | **交易明細** | 🔴 關鍵 | ✅ 已完成 | Phase 1.3 |
| 4 | **貼文管理** | 🟠 重要 | ✅ 已完成 | Phase 2.3（Content 頁面 Posts tab） |
| 5 | **配對/滑卡監控** | 🟡 有用 | ✅ 已完成 | Phase 5.2（Analytics 配對統計） |
| 6 | **媒體管理** | 🟡 有用 | ⏳ 未做 | 獨立媒體瀏覽頁 |
| 7 | **用戶搜尋** | 🟠 重要 | ✅ 已完成 | Phase 2.2 |
| 8 | **用戶角色管理** | 🟡 有用 | ✅ 已完成 | Phase 2.5 |
| 9 | **Toast 通知** | 🟠 重要 | ✅ 已完成 | Phase 2.1（元件已建立） |
| 10 | **表格排序** | 🟡 有用 | ⏳ 未做 | Phase 3.1 |
| 11 | **數據匯出** | 🟡 有用 | ✅ 已完成 | Phase 3.2（CSV 匯出元件） |
| 12 | **操作日誌** | 🟡 有用 | ⏳ 未做 | Phase 5.1 |
| 13 | **Token/Session** | 🟠 重要 | ✅ 已完成 | Phase 4（JWT 過期偵測、Session 超時警告） |
| 14 | **批量操作** | 🟡 有用 | ⏳ 未做 | Phase 3.4 |
| 15 | **媒體預覽** | 🟠 重要 | ⏳ 未做 | Phase 2.4 |

---

## Phase 1：核心業務功能 🔴

> **目標**: 補齊影響平台運營的關鍵管理功能
> **前置**: 無
> **涉及**: 後端 API 新增 + 前端頁面新增

### 1.1 提款審核管理

**背景**: `wallet.service.ts` 已有 `requestWithdrawal()` 和 `processWithdrawal()`，但 admin 前端/後端無此功能。

#### 後端（admin-service）

| 任務 | 說明 | 檔案 |
|------|------|------|
| 1.1.1 提款管理 Controller | `GET /withdrawals` (列表+篩選), `GET /withdrawals/:id` (詳情), `POST /withdrawals/:id/approve`, `POST /withdrawals/:id/reject` | `apps/admin-service/src/app/withdrawal-management.controller.ts` (新) |
| 1.1.2 提款管理 Service | 查詢 Redis 中的 withdrawal 紀錄；呼叫 payment-service processWithdrawal API | `apps/admin-service/src/app/withdrawal-management.service.ts` (新) |
| 1.1.3 提款統計 | `GET /withdrawals/stats` — 待審核數、本月已審核金額 | 同上 |

#### 前端（admin app）

| 任務 | 說明 | 檔案 |
|------|------|------|
| 1.1.4 提款列表頁 | 篩選(pending/completed/rejected)、分頁、創作者資訊、金額 | `apps/admin/app/(dashboard)/withdrawals/page.tsx` (新) |
| 1.1.5 提款審核操作 | 批准/拒絕按鈕 + 確認 Dialog（拒絕時需填理由） | 整合於列表頁或詳情頁 |
| 1.1.6 Sidebar 新增項目 | 新增「Withdrawals」導航項 | `apps/admin/components/sidebar.tsx` |
| 1.1.7 Dashboard 卡片 | 新增「待審核提款」統計卡片 | `apps/admin/app/(dashboard)/page.tsx` |

#### API Client

| 任務 | 說明 | 檔案 |
|------|------|------|
| 1.1.8 AdminApi 擴充 | 新增 withdrawal 相關方法和型別 | `libs/api-client/src/admin.ts` |

### 1.2 訂閱管理

**背景**: subscription-service 已有完整 CRUD，但 admin 無法查看/管理。

#### 後端

| 任務 | 說明 | 檔案 |
|------|------|------|
| 1.2.1 訂閱管理 Controller | `GET /subscriptions` (列表), `GET /subscriptions/:id` (詳情), `GET /subscriptions/stats` | `apps/admin-service/src/app/subscription-management.controller.ts` (新) |
| 1.2.2 訂閱管理 Service | 查詢 DB Subscriptions + SubscriptionTiers | `apps/admin-service/src/app/subscription-management.service.ts` (新) |
| 1.2.3 訂閱方案列表 | `GET /subscription-tiers` — 所有創作者的方案 | 同上 |

#### 前端

| 任務 | 說明 | 檔案 |
|------|------|------|
| 1.2.4 訂閱列表頁 | 篩選(active/cancelled/expired)、創作者篩選、分頁 | `apps/admin/app/(dashboard)/subscriptions/page.tsx` (新) |
| 1.2.5 訂閱統計卡片 | 活躍訂閱數、MRR、最近取消數 | 同頁面頂部 |
| 1.2.6 Sidebar 新增 | 新增「Subscriptions」導航項 | `apps/admin/components/sidebar.tsx` |

#### API Client

| 任務 | 說明 | 檔案 |
|------|------|------|
| 1.2.7 AdminApi 擴充 | 新增 subscription 相關方法和型別 | `libs/api-client/src/admin.ts` |

### 1.3 交易明細

**背景**: Payments 頁只有統計圖表，無法查看個別交易。

#### 後端

| 任務 | 說明 | 檔案 |
|------|------|------|
| 1.3.1 交易列表 API | `GET /payments/transactions` — 分頁、依類型/狀態/日期篩選 | `apps/admin-service/src/app/payment-stats.controller.ts` (擴充) |
| 1.3.2 交易詳情 API | `GET /payments/transactions/:id` — 含 Stripe ID、關聯實體 | `apps/admin-service/src/app/payment-stats.service.ts` (擴充) |

#### 前端

| 任務 | 說明 | 檔案 |
|------|------|------|
| 1.3.3 交易列表 Tab | 在 Payments 頁新增 Transactions tab，完整交易表格 | `apps/admin/app/(dashboard)/payments/page.tsx` (擴充) |
| 1.3.4 交易詳情 Modal | 點擊交易顯示完整詳情（用戶、金額、Stripe ID、時間、關聯貼文/訂閱） | 同上 |
| 1.3.5 日期範圍篩選 | 自訂日期範圍查詢營收報表（已有 API，前端未用） | 同上 |

#### API Client

| 任務 | 說明 | 檔案 |
|------|------|------|
| 1.3.6 AdminApi 擴充 | 新增 transaction 列表/詳情方法 | `libs/api-client/src/admin.ts` |

### Phase 1 驗證檢查點
- [x] Admin 可查看、批准、拒絕創作者提款申請
- [x] Admin 可查看所有訂閱記錄和方案
- [x] Admin 可查看完整交易明細
- [x] Dashboard 新增提款待審核統計
- [x] 所有新頁面有正確的權限保護

---

## Phase 2：內容與用戶管理強化 🟠

> **目標**: 強化內容審核能力和用戶管理效率
> **前置**: 無（可與 Phase 1 平行）

### 2.1 全域 Toast 通知元件

| 任務 | 說明 | 檔案 |
|------|------|------|
| 2.1.1 Toast 元件 | 基於 shadcn/ui 的 Toast，支援 success/error/warning | `apps/admin/components/toast.tsx` (新) |
| 2.1.2 Toast Provider | 全域 Context，任何頁面可呼叫 `toast.success()` | `apps/admin/components/toast-provider.tsx` (新) |
| 2.1.3 整合到所有操作 | 停用用戶、下架貼文、審核提款等操作後顯示結果 | 各頁面修改 |

### 2.2 用戶搜尋

#### 後端

| 任務 | 說明 | 檔案 |
|------|------|------|
| 2.2.1 搜尋 API | `GET /users?search=xxx` — 支援 email 和 displayName 模糊搜尋 | `apps/admin-service/src/app/user-management.service.ts` (擴充) |

#### 前端

| 任務 | 說明 | 檔案 |
|------|------|------|
| 2.2.2 搜尋欄 | Users 頁面增加搜尋輸入框，即時搜尋（debounce 300ms） | `apps/admin/app/(dashboard)/users/page.tsx` (擴充) |

### 2.3 貼文管理

#### 後端

| 任務 | 說明 | 檔案 |
|------|------|------|
| 2.3.1 貼文列表 API | `GET /content/posts` — 分頁、依可見性/創作者/日期篩選 | `apps/admin-service/src/app/content-moderation.controller.ts` (擴充) |
| 2.3.2 貼文詳情 API | `GET /content/posts/:postId` — 含媒體URL、留言、互動數 | `apps/admin-service/src/app/content-moderation.service.ts` (擴充) |

#### 前端

| 任務 | 說明 | 檔案 |
|------|------|------|
| 2.3.3 貼文列表頁 | 在 Content 頁新增 Posts tab（除了 Reports tab） | `apps/admin/app/(dashboard)/content/page.tsx` (擴充) |
| 2.3.4 貼文詳情頁 | 顯示完整貼文資訊、媒體預覽、留言列表 | `apps/admin/app/(dashboard)/content/posts/[postId]/page.tsx` (新) |
| 2.3.5 媒體預覽元件 | 圖片 lightbox + 影片播放器 | `apps/admin/components/media-preview.tsx` (新) |

### 2.4 檢舉詳情媒體預覽

| 任務 | 說明 | 檔案 |
|------|------|------|
| 2.4.1 擴充檢舉詳情 API | 回傳貼文的 mediaUrls 欄位 | `apps/admin-service/src/app/content-moderation.service.ts` |
| 2.4.2 檢舉頁面加入媒體 | 在檢舉詳情頁顯示貼文圖片/影片 | `apps/admin/app/(dashboard)/content/reports/[reportId]/page.tsx` |

### 2.5 用戶角色管理

#### 後端

| 任務 | 說明 | 檔案 |
|------|------|------|
| 2.5.1 角色變更 API | `POST /users/:userId/role` — 修改用戶角色（SUBSCRIBER ↔ CREATOR） | `apps/admin-service/src/app/user-management.controller.ts` (擴充) |

#### 前端

| 任務 | 說明 | 檔案 |
|------|------|------|
| 2.5.2 角色變更 UI | 用戶詳情頁增加角色選擇器 + 確認 Dialog | `apps/admin/app/(dashboard)/users/[userId]/page.tsx` (擴充) |

### 2.6 用戶詳情強化

| 任務 | 說明 | 檔案 |
|------|------|------|
| 2.6.1 用戶活動 Tab | 用戶的訂閱記錄、交易紀錄、貼文列表 | `apps/admin/app/(dashboard)/users/[userId]/page.tsx` (擴充) |
| 2.6.2 後端：用戶活動 API | `GET /users/:userId/activity` — 聚合用戶的訂閱/交易/貼文 | `apps/admin-service/src/app/user-management.service.ts` (擴充) |

### Phase 2 驗證檢查點
- [x] Toast 元件已建立（success/error/warning）
- [x] 可搜尋用戶（名稱/email）
- [x] 可查看所有貼文（不只被檢舉的）— Content 頁面 Posts tab
- [ ] 檢舉詳情可看到貼文的圖片/影片 — ⏳ 媒體預覽元件未做
- [x] 可變更用戶角色（SUBSCRIBER/CREATOR/ADMIN）
- [x] 用戶詳情頁顯示活動歷史（Posts/Subscriptions/Transactions tabs）

---

## Phase 3：表格與數據強化 🟡

> **目標**: 提升數據操作效率和報表能力
> **前置**: Phase 1-2

### 3.1 表格排序

| 任務 | 說明 | 檔案 |
|------|------|------|
| 3.1.1 可排序表格元件 | 通用的可排序表格 header（點擊排序 asc/desc） | `apps/admin/components/sortable-table.tsx` (新) |
| 3.1.2 整合到所有列表 | Users、Reports、Transactions、Subscriptions、Withdrawals 表格 | 各列表頁面 |

### 3.2 CSV 匯出

| 任務 | 說明 | 檔案 |
|------|------|------|
| 3.2.1 匯出工具函式 | 通用 `exportToCSV(data, columns, filename)` | `apps/admin/lib/export.ts` (新) |
| 3.2.2 匯出按鈕 | 各列表頁面增加「Export CSV」按鈕 | 各列表頁面 |

### 3.3 日期範圍選擇器

| 任務 | 說明 | 檔案 |
|------|------|------|
| 3.3.1 DateRangePicker 元件 | 基於 shadcn/ui Calendar 的日期區間選擇 | `apps/admin/components/date-range-picker.tsx` (新) |
| 3.3.2 整合到分析和支付 | Analytics、Payments 頁面使用自訂日期範圍 | 對應頁面 |

### 3.4 批量操作

| 任務 | 說明 | 檔案 |
|------|------|------|
| 3.4.1 表格多選 | Checkbox 多選 + 選擇計數 | `apps/admin/components/selectable-table.tsx` (新) |
| 3.4.2 批量停用用戶 | 選中多個用戶後一鍵停用 | `apps/admin/app/(dashboard)/users/page.tsx` |
| 3.4.3 批量處理檢舉 | 選中多個檢舉後批量 dismiss/resolve | `apps/admin/app/(dashboard)/content/page.tsx` |
| 3.4.4 後端批量 API | `POST /users/batch/disable`, `POST /content/reports/batch/resolve` | admin-service 擴充 |

### Phase 3 驗證檢查點
- [ ] 所有表格可按列排序 — ⏳ 未做
- [x] 可匯出 CSV — CsvExport 通用元件，已整合至 Transactions、Payments
- [x] 支付頁面支援自訂日期範圍 — DateRangePicker 元件
- [ ] 批量操作正常運作 — ⏳ 未做

---

## Phase 4：認證與 Session 強化 🟠

> **目標**: 提升 Admin 登入安全性和穩定性
> **前置**: 無（可獨立執行）

### 4.1 Token Refresh

| 任務 | 說明 | 檔案 |
|------|------|------|
| 4.1.1 Refresh Token 攔截器 | API 回應 401 時嘗試 refresh，成功後重試原始請求 | `apps/admin/lib/api.ts` (擴充) |
| 4.1.2 Refresh Token 儲存 | Login 時儲存 refreshToken | `apps/admin/lib/auth.ts` (擴充) |

### 4.2 正確登出

| 任務 | 說明 | 檔案 |
|------|------|------|
| 4.2.1 呼叫後端登出 | logout 時呼叫 `authApi.logout()` 使 token 失效 | `apps/admin/components/auth-provider.tsx` (擴充) |

### 4.3 登入安全

| 任務 | 說明 | 檔案 |
|------|------|------|
| 4.3.1 登入失敗限制 | 連續失敗 5 次鎖定 15 分鐘（前端顯示倒計時） | `apps/admin/app/login/page.tsx` (擴充) |
| 4.3.2 Session 超時 | 閒置 30 分鐘自動登出 | `apps/admin/components/auth-provider.tsx` (擴充) |

### Phase 4 驗證檢查點
- [x] JWT 過期偵測 — 自動解析 token exp，過期前 5 分鐘顯示警告
- [x] Session 超時 — 每 30 秒檢查，過期自動登出
- [ ] Token Refresh 機制 — ⏳ 未做（目前過期即登出，無 refresh token）
- [ ] 登出呼叫後端 API — ⏳ 未做
- [ ] 連續登入失敗防護 — ⏳ 未做

---

## Phase 5：監控與審計 🟡

> **目標**: 生產環境運維所需的監控和追蹤能力
> **前置**: Phase 1

### 5.1 操作審計日誌

#### 後端

| 任務 | 說明 | 檔案 |
|------|------|------|
| 5.1.1 AuditLog Entity | 紀錄 action、adminId、targetType、targetId、details、timestamp | `libs/database/src/entities/audit-log.entity.ts` (新) |
| 5.1.2 Audit Interceptor | NestJS Interceptor 自動記錄所有 POST/PUT/DELETE 操作 | `apps/admin-service/src/app/audit.interceptor.ts` (新) |
| 5.1.3 審計查詢 API | `GET /audit-logs` — 分頁、依操作者/類型/日期篩選 | `apps/admin-service/src/app/audit.controller.ts` (新) |

#### 前端

| 任務 | 說明 | 檔案 |
|------|------|------|
| 5.1.4 審計日誌頁面 | 操作歷史列表，篩選、搜尋 | `apps/admin/app/(dashboard)/audit/page.tsx` (新) |
| 5.1.5 Sidebar 新增 | 新增「Audit Log」導航項 | `apps/admin/components/sidebar.tsx` |

### 5.2 配對數據監控

#### 後端

| 任務 | 說明 | 檔案 |
|------|------|------|
| 5.2.1 配對統計 API | `GET /analytics/matching-stats` — 今日滑卡數、配對率、活躍配對數 | `apps/admin-service/src/app/analytics.controller.ts` (擴充) |

#### 前端

| 任務 | 說明 | 檔案 |
|------|------|------|
| 5.2.2 配對統計區塊 | Analytics 頁面新增 Matching 區塊 | `apps/admin/app/(dashboard)/analytics/page.tsx` (擴充) |

### 5.3 系統頁面強化

| 任務 | 說明 | 檔案 |
|------|------|------|
| 5.3.1 所有微服務健康 | 逐一 ping auth/user/matching/content/subscription/payment/media/messaging/notification | `apps/admin-service/src/app/system-monitor.service.ts` (擴充) |
| 5.3.2 DLQ 管理操作 | 重試、清除 DLQ 訊息按鈕 | `apps/admin/app/(dashboard)/system/page.tsx` (擴充) |
| 5.3.3 一致性修復操作 | 手動觸發一致性檢查和自動修復按鈕 | 同上 |

### Phase 5 驗證檢查點
- [ ] 所有 admin 操作被記錄到審計日誌 — ⏳ 未做
- [ ] 審計日誌頁面可查看完整操作歷史 — ⏳ 未做
- [x] Analytics 顯示配對統計 — 總滑卡數、配對率、每日配對數圖表
- [ ] System 頁面可操作 DLQ 和一致性修復 — ⏳ 未做

---

## 依賴關係與執行順序

```
Phase 1 (核心業務) ─────────────────── 最優先
  ├─ 1.1 提款審核
  ├─ 1.2 訂閱管理
  └─ 1.3 交易明細

Phase 2 (內容/用戶強化) ──── 可與 Phase 1 平行
  ├─ 2.1 Toast 通知（先做，後續都用）
  ├─ 2.2 用戶搜尋
  ├─ 2.3 貼文管理
  ├─ 2.4 媒體預覽
  ├─ 2.5 角色管理
  └─ 2.6 用戶詳情強化

Phase 3 (表格/數據) ──── 依賴 Phase 1-2 的頁面
  ├─ 3.1 排序
  ├─ 3.2 匯出
  ├─ 3.3 日期選擇器
  └─ 3.4 批量操作

Phase 4 (認證強化) ──── 獨立，任何時候可做
  ├─ 4.1 Token Refresh
  ├─ 4.2 正確登出
  └─ 4.3 登入安全

Phase 5 (監控/審計) ──── 依賴 Phase 1
  ├─ 5.1 審計日誌
  ├─ 5.2 配對監控
  └─ 5.3 系統操作
```

### 建議執行順序

```
Step 1:  Phase 2.1 (Toast) — 先建基礎元件
Step 2:  Phase 1.1 (提款審核) + Phase 1.2 (訂閱管理) — 核心業務
Step 3:  Phase 1.3 (交易明細) + Phase 2.2 (用戶搜尋)
Step 4:  Phase 2.3-2.4 (貼文管理 + 媒體預覽)
Step 5:  Phase 2.5-2.6 (角色管理 + 用戶詳情)
Step 6:  Phase 4 (認證強化)
Step 7:  Phase 3 (表格/數據強化)
Step 8:  Phase 5 (監控/審計)
```

---

## Sidebar 最終導航結構

```
SD Admin
├── Dashboard        (現有)
├── Users            (現有，強化搜尋/角色)
├── Content          (現有，新增 Posts tab)
├── Subscriptions    (新增)
├── Payments         (現有，新增 Transactions tab)
├── Withdrawals      (新增)
├── Analytics        (現有，新增 Matching)
├── System           (現有，新增操作按鈕)
├── Audit Log        (新增)
└── Logout
```

---

## 涉及的新增/修改檔案清單

### 新增檔案

**後端 (admin-service):**
- `apps/admin-service/src/app/withdrawal-management.controller.ts`
- `apps/admin-service/src/app/withdrawal-management.service.ts`
- `apps/admin-service/src/app/subscription-management.controller.ts`
- `apps/admin-service/src/app/subscription-management.service.ts`
- `apps/admin-service/src/app/audit.interceptor.ts`
- `apps/admin-service/src/app/audit.controller.ts`
- `libs/database/src/entities/audit-log.entity.ts`

**前端 (admin):**
- `apps/admin/app/(dashboard)/withdrawals/page.tsx`
- `apps/admin/app/(dashboard)/subscriptions/page.tsx`
- `apps/admin/app/(dashboard)/content/posts/[postId]/page.tsx`
- `apps/admin/app/(dashboard)/audit/page.tsx`
- `apps/admin/components/toast.tsx`
- `apps/admin/components/toast-provider.tsx`
- `apps/admin/components/media-preview.tsx`
- `apps/admin/components/sortable-table.tsx`
- `apps/admin/components/selectable-table.tsx`
- `apps/admin/components/date-range-picker.tsx`
- `apps/admin/lib/export.ts`

### 修改檔案

**後端:**
- `apps/admin-service/src/app/app.module.ts` — 註冊新 Controller/Service
- `apps/admin-service/src/app/payment-stats.controller.ts` — 新增交易列表
- `apps/admin-service/src/app/payment-stats.service.ts` — 新增交易查詢
- `apps/admin-service/src/app/user-management.controller.ts` — 搜尋 + 角色
- `apps/admin-service/src/app/user-management.service.ts` — 搜尋 + 角色 + 活動
- `apps/admin-service/src/app/content-moderation.controller.ts` — 貼文列表
- `apps/admin-service/src/app/content-moderation.service.ts` — 貼文查詢 + 媒體
- `apps/admin-service/src/app/analytics.controller.ts` — 配對統計
- `apps/admin-service/src/app/analytics.service.ts` — 配對統計
- `apps/admin-service/src/app/system-monitor.service.ts` — 微服務健康

**前端:**
- `apps/admin/components/sidebar.tsx` — 新增導航項
- `apps/admin/app/(dashboard)/page.tsx` — Dashboard 新增卡片
- `apps/admin/app/(dashboard)/payments/page.tsx` — 新增 Transactions tab
- `apps/admin/app/(dashboard)/content/page.tsx` — 新增 Posts tab
- `apps/admin/app/(dashboard)/content/reports/[reportId]/page.tsx` — 媒體預覽
- `apps/admin/app/(dashboard)/users/page.tsx` — 搜尋 + 批量
- `apps/admin/app/(dashboard)/users/[userId]/page.tsx` — 角色 + 活動
- `apps/admin/app/(dashboard)/analytics/page.tsx` — 配對統計
- `apps/admin/app/(dashboard)/system/page.tsx` — DLQ/一致性操作
- `apps/admin/app/layout.tsx` — Toast Provider
- `apps/admin/lib/api.ts` — Token refresh
- `apps/admin/lib/auth.ts` — Refresh token 儲存
- `apps/admin/components/auth-provider.tsx` — 登出 + 超時

**共享:**
- `libs/api-client/src/admin.ts` — 所有新 API 方法和型別

---

## 完成摘要

### 已完成 ✅（commit `1ce9d96`）

| Phase | 完成項目 |
|-------|----------|
| **1.1** | 提款審核管理（後端 + 前端 + API Client） |
| **1.2** | 訂閱管理（列表、統計、方案、啟用/停用） |
| **1.3** | 交易管理（列表、類型統計、篩選） |
| **2.1** | Toast 通知元件 |
| **2.2** | 用戶搜尋（email/displayName 模糊搜尋） |
| **2.3** | 貼文列表（Content 頁面 Posts tab） |
| **2.5** | 用戶角色變更 |
| **2.6** | 用戶活動歷史（Posts/Subscriptions/Transactions） |
| **3.2** | CSV 匯出通用元件 |
| **3.3** | 日期範圍選擇器 |
| **4.2** | JWT 過期偵測 + Session 超時警告/自動登出 |
| **5.2** | 配對統計（Analytics 頁面 Matching 區塊） |

**測試**: 63/63 通過（admin-service 5 個 spec 全部通過）

### 剩餘未做項目 ⏳

| 項目 | Phase | 優先級 | 說明 |
|------|-------|--------|------|
| 媒體預覽 | 2.4 | 🟠 | 檢舉詳情頁圖片/影片預覽 |
| 表格排序 | 3.1 | 🟡 | 可排序 header 元件 |
| 批量操作 | 3.4 | 🟡 | 多選 + 批量停用/處理 |
| Token Refresh | 4.1 | 🟠 | 401 自動 refresh + 重試 |
| 正確登出 | 4.2 | 🟡 | 呼叫後端使 token 失效 |
| 登入失敗限制 | 4.3 | 🟡 | 連續失敗鎖定 |
| 審計日誌 | 5.1 | 🟡 | AuditLog Entity + Interceptor + 頁面 |
| 系統操作 | 5.3 | 🟡 | DLQ 重試/清除、一致性修復按鈕 |
