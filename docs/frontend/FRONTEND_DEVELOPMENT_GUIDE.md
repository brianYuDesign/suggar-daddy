# 前台 (Web) 開發指南

> 平台定位：混合型社交平台（創作者訂閱 + 社交配對）
> 設計策略：Mobile First 響應式設計
> 技術棧：Next.js 14 (App Router) + Tailwind CSS + shadcn/ui 風格元件

---

## 開發階段總覽

```
Phase 1: 基礎架構 & 認證系統
    ↓
Phase 2: 個人檔案 & 設定
    ↓
Phase 3: 探索 & 配對（核心社交功能）
    ↓
Phase 4: 內容動態牆（核心創作者功能）
    ↓
Phase 5: 即時訊息
    ↓
Phase 6: 訂閱 & 付費
    ↓
Phase 7: 通知中心
    ↓
Phase 8: 精修 & 優化
```

---

## Phase 1：基礎架構 & 認證系統

### 為什麼先做這個？
所有功能都依賴於認證狀態，且 Layout/導航結構是所有頁面的容器。

### 需要建構的頁面

| 路由 | 說明 | 優先級 |
|------|------|--------|
| `/` | Landing Page（未登入首頁） | P0 |
| `/login` | 登入頁 | P0 |
| `/register` | 註冊頁（含角色選擇） | P0 |
| `/(main)/*` | 登入後的主 Layout（底部導航列） | P0 |

### 需要建構的元件

- **AuthProvider** — React Context，管理 JWT token、登入狀態、自動刷新 token
- **ProtectedRoute** — 未登入自動跳轉到 `/login`
- **MobileNav** — 底部導航列（首頁/探索/發文/訊息/個人）
- **DesktopSidebar** — 桌面版側邊導航

### 關鍵決策

- Token 儲存：`localStorage` + axios interceptor 自動附帶 Authorization header
- 使用 `@suggar-daddy/api-client` 的 `AuthApi` 進行登入/註冊
- 角色選擇：`sugar_baby`（創作者）vs `sugar_daddy`（訂閱者）
- 註冊欄位：email, password (8-128字元), displayName (max 50), role, bio (optional, max 500)

### 可用 API

```
POST /api/v1/auth/login     → { email, password }
POST /api/v1/auth/register  → { email, password, role, displayName, bio? }
POST /api/v1/auth/refresh   → { refreshToken }
POST /api/v1/auth/logout
```

### 對話引導問題

> 1. Landing Page 要呈現什麼？簡單的品牌介紹 + CTA，還是要展示精選內容？
> 2. 註冊流程要一步完成，還是分步驟引導（Step 1: 基本資料 → Step 2: 上傳大頭照 → Step 3: 偏好設定）？
> 3. 是否需要「忘記密碼」功能？（目前後端未實作此 API）

---

## Phase 2：個人檔案 & 設定

### 為什麼排第二？
使用者需要先完善個人資料，才能進行配對和社交互動。

### 需要建構的頁面

| 路由 | 說明 | 優先級 |
|------|------|--------|
| `/(main)/profile` | 我的個人檔案 | P0 |
| `/(main)/profile/edit` | 編輯個人資料 | P0 |
| `/(main)/profile/settings` | 帳號設定 | P1 |
| `/(main)/user/[userId]` | 查看他人檔案 | P0 |

### 需要建構的元件

- **ProfileCard** — 大頭照、名稱、bio、角色標籤
- **ProfileEditForm** — 編輯表單（displayName, bio, avatarUrl, birthDate, preferences）
- **AvatarUpload** — 頭像上傳元件（使用 media-service `/api/upload`）
- **UserBadge** — 角色/認證狀態標籤
- **BlockButton / ReportButton** — 封鎖/檢舉按鈕

### 可用 API

```
GET    /api/v1/users/me                → 取得自己的資料
GET    /api/v1/users/profile/{userId}  → 查看他人資料
PUT    /api/v1/users/profile           → 更新資料
POST   /api/v1/users/block/{targetId}  → 封鎖用戶
DELETE /api/v1/users/block/{targetId}  → 解除封鎖
GET    /api/v1/users/blocked           → 已封鎖列表
POST   /api/v1/users/report            → 檢舉
POST   /api/upload                     → 上傳媒體檔案
```

### 對話引導問題

> 1. 個人檔案頁面需要展示哪些資訊？（大頭照、名稱、bio、年齡、貼文數量、訂閱者數量？）
> 2. 創作者 (sugar_baby) 和訂閱者 (sugar_daddy) 的檔案頁面是否需要不同版面？
> 3. 是否需要照片牆/媒體展示區？

---

## Phase 3：探索 & 配對

### 為什麼排第三？
配對是平台的核心社交功能，驅動使用者黏著度。

### 需要建構的頁面

| 路由 | 說明 | 優先級 |
|------|------|--------|
| `/(main)/discover` | 探索頁面（Swipe 卡片） | P0 |
| `/(main)/matches` | 配對列表 | P0 |

### 需要建構的元件

- **SwipeCard** — 可左右滑動的使用者卡片（支援手勢 + 按鈕操作）
- **SwipeStack** — 卡片堆疊容器（無限載入 cursor-based pagination）
- **MatchList** — 配對成功的使用者列表
- **MatchAnimation** — 配對成功的動畫/彈窗
- **ActionButtons** — Pass / Like / Super Like 按鈕

### 可用 API

```
GET  /api/v1/matching/cards    → { cards: UserCardDto[], nextCursor? }
POST /api/v1/matching/swipe    → { targetUserId, action: 'like'|'pass'|'super_like' }
                               → { matched: boolean, matchId? }
GET  /api/v1/matching/matches  → { matches: MatchDto[], nextCursor? }
```

### 技術考量

- 手勢滑動推薦使用 `framer-motion` 或 `react-spring`
- Cursor-based pagination 確保滑動時無縫載入新卡片
- 配對成功時觸發動畫，並提供「立即聊天」按鈕

### 對話引導問題

> 1. 卡片上要顯示哪些資訊？（大頭照、名稱、年齡、bio、距離？）
> 2. 是否需要篩選器？（年齡範圍、角色、距離等）
> 3. Super Like 功能是否為付費功能？需要限制每日次數嗎？

---

## Phase 4：內容動態牆

### 為什麼排第四？
創作者需要發布內容，訂閱者需要瀏覽內容，這是平台的核心商業價值。

### 需要建構的頁面

| 路由 | 說明 | 優先級 |
|------|------|--------|
| `/(main)/feed` | 動態牆（首頁） | P0 |
| `/(main)/post/[postId]` | 貼文詳情 | P0 |
| `/(main)/post/create` | 發布貼文 | P0 |

### 需要建構的元件

- **PostCard** — 貼文卡片（頭像、內容、媒體、互動按鈕）
- **PostFeed** — 無限滾動動態牆
- **PostDetail** — 貼文詳情頁（含付費牆）
- **CreatePostForm** — 發文表單（文字 + 媒體上傳 + 付費設定）
- **PPVOverlay** — 付費解鎖覆蓋層（Premium 內容模糊化）
- **LikeButton** — 按讚按鈕（含動畫）
- **MediaGallery** — 媒體展示（圖片/影片）

### 可用 API

```
GET    /api/posts             → 貼文列表（cursor-based, 支援 Optional JWT）
GET    /api/posts/{postId}    → 單一貼文（含 PPV 狀態）
POST   /api/posts             → 發布貼文 { content, mediaUrls?, isPremium? }
DELETE /api/posts/{postId}    → 刪除自己的貼文
POST   /api/posts/{postId}/like    → 按讚
DELETE /api/posts/{postId}/like    → 取消按讚
POST   /api/upload                 → 上傳媒體
```

### 對話引導問題

> 1. 動態牆的排序方式？（時間排序、推薦算法、熱門優先？）
> 2. 付費內容 (Premium) 的呈現方式？（模糊化預覽、鎖頭圖示、完全隱藏？）
> 3. 是否需要評論功能？（目前後端未實作評論 API）
> 4. 媒體上傳支援哪些格式？（圖片、影片、多媒體混合？）

---

## Phase 5：即時訊息

### 為什麼排第五？
配對成功後需要訊息功能來深化互動。

### 需要建構的頁面

| 路由 | 說明 | 優先級 |
|------|------|--------|
| `/(main)/messages` | 對話列表 | P0 |
| `/(main)/messages/[conversationId]` | 聊天室 | P0 |

### 需要建構的元件

- **ConversationList** — 對話列表（含最後訊息預覽、未讀標記）
- **ChatRoom** — 聊天介面（訊息氣泡、輸入框）
- **MessageBubble** — 單條訊息氣泡（區分自己/對方）
- **ChatInput** — 訊息輸入框（含字數限制 5000 字）

### 可用 API

```
GET  /api/v1/messaging/conversations                         → 對話列表
GET  /api/v1/messaging/conversations/{conversationId}/messages → 訊息列表 (cursor-based)
POST /api/v1/messaging/messages                              → 發送訊息
```

### 技術考量

- 目前無 WebSocket，需使用 **HTTP Polling**（建議 5-10 秒輪詢）
- 訊息內容上限 5000 字元
- 考慮使用 `setInterval` + `useEffect` 或 SWR/React Query 的 `refetchInterval`

### 對話引導問題

> 1. 是否需要已讀標記功能？
> 2. 是否需要傳送媒體（圖片/影片）？
> 3. 輪詢頻率要多高？（即時性 vs 效能平衡）

---

## Phase 6：訂閱 & 付費

### 為什麼排第六？
商業變現功能，依賴前面的內容和社交基礎。

### 需要建構的頁面

| 路由 | 說明 | 優先級 |
|------|------|--------|
| `/(main)/subscription` | 訂閱方案頁 | P0 |
| `/(main)/wallet` | 我的錢包 | P0 |
| `/(main)/wallet/withdraw` | 提款申請 | P1 |
| `/(main)/wallet/history` | 交易記錄 | P1 |

### 需要建構的元件

- **SubscriptionTierCard** — 訂閱方案卡片（名稱、價格、功能列表）
- **TipButton** — 打賞按鈕（金額選擇 + 自訂金額）
- **WalletOverview** — 錢包總覽（餘額、待入帳、累計收入、已提款）
- **TransactionList** — 交易記錄列表
- **WithdrawForm** — 提款申請表單
- **PurchaseButton** — 購買付費貼文按鈕

### 可用 API

```
GET  /api/subscription-tiers          → 訂閱方案列表
POST /api/subscriptions               → 訂閱 { tierId }
GET  /api/subscriptions/me            → 我的訂閱
DELETE /api/subscriptions/me          → 取消訂閱
POST /api/tips                        → 打賞 { toUserId, amount }
POST /api/post-purchases              → 購買貼文 { postId }
GET  /api/wallet                      → 錢包資訊
GET  /api/wallet/earnings             → 收入明細
GET  /api/wallet/history              → 交易歷史
POST /api/wallet/withdraw             → 申請提款
GET  /api/wallet/withdrawals          → 提款記錄
POST /api/stripe/checkout-session     → Stripe 結帳
POST /api/stripe/portal-session       → Stripe 客戶管理入口
```

### 對話引導問題

> 1. 打賞金額是否有預設選項？（例如 $5, $10, $20, 自訂）
> 2. 錢包頁面需要展示多詳細的交易記錄？
> 3. 提款最低金額限制？提款方式有哪些？

---

## Phase 7：通知中心

### 需要建構的頁面

| 路由 | 說明 | 優先級 |
|------|------|--------|
| `/(main)/notifications` | 通知列表 | P1 |

### 需要建構的元件

- **NotificationList** — 通知列表（分類：配對/訊息/付費/系統）
- **NotificationBadge** — 未讀通知數量徽章（顯示在導航列上）
- **NotificationItem** — 單條通知項目

### 可用 API

```
GET   /api/v1/notifications              → 通知列表
PATCH /api/v1/notifications/{id}/read    → 標記已讀
PATCH /api/v1/notifications/read-all     → 全部已讀
```

---

## Phase 8：精修 & 優化

- **Loading States** — 骨架屏 (Skeleton)、Shimmer 效果
- **Error Handling** — 錯誤頁面、Toast 通知、Retry 機制
- **Empty States** — 空狀態插圖（無貼文、無配對、無訊息）
- **Animations** — 頁面轉場、互動微動畫
- **SEO** — 動態 metadata、Open Graph tags
- **PWA** — 推播通知、離線支援（可選）
- **效能優化** — 圖片懶載入、虛擬列表、Code Splitting

---

## 建議的目錄結構

```
apps/web/
├── app/
│   ├── (auth)/                    # 認證相關頁面（無導航列）
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (main)/                    # 主要頁面（有導航列）
│   │   ├── feed/page.tsx
│   │   ├── discover/page.tsx
│   │   ├── matches/page.tsx
│   │   ├── messages/
│   │   │   ├── page.tsx
│   │   │   └── [conversationId]/page.tsx
│   │   ├── post/
│   │   │   ├── create/page.tsx
│   │   │   └── [postId]/page.tsx
│   │   ├── profile/
│   │   │   ├── page.tsx
│   │   │   ├── edit/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── user/[userId]/page.tsx
│   │   ├── subscription/page.tsx
│   │   ├── wallet/
│   │   │   ├── page.tsx
│   │   │   ├── withdraw/page.tsx
│   │   │   └── history/page.tsx
│   │   ├── notifications/page.tsx
│   │   └── layout.tsx             # 共用 Layout（含底部導航）
│   ├── layout.tsx                 # Root Layout
│   ├── page.tsx                   # Landing Page
│   └── globals.css
├── components/                    # Web 專屬元件
│   ├── auth/
│   ├── profile/
│   ├── matching/
│   ├── content/
│   ├── messaging/
│   ├── payment/
│   ├── notification/
│   └── layout/                    # Nav, Sidebar, Header
├── hooks/                         # 自訂 Hooks
│   ├── use-auth.ts
│   ├── use-api.ts
│   └── use-infinite-scroll.ts
├── providers/                     # React Context Providers
│   ├── auth-provider.tsx
│   └── query-provider.tsx
├── lib/                           # 工具函數
│   ├── api.ts                     # ApiClient 實例
│   └── utils.ts
└── types/                         # 前端專用型別
```

---

## 技術決策摘要

| 項目 | 選擇 | 理由 |
|------|------|------|
| 資料取得 | SWR 或 React Query | 自動快取、重新驗證、loading 狀態管理 |
| 狀態管理 | React Context + Hooks | 避免過度工程，認證狀態用 Context |
| 表單 | React Hook Form + Zod | 效能好、驗證直覺 |
| 動畫 | Framer Motion | 手勢支援（Swipe 必須）、宣告式 API |
| 圖示 | Lucide React | 輕量、與 shadcn/ui 一致 |
| HTTP 客戶端 | `@suggar-daddy/api-client` | 已有完整封裝，直接使用 |

---

## 準備開始

當你準備好開始某個 Phase，告訴我以下資訊：

1. **「開始 Phase X」** — 我會為你建立該 Phase 的所有頁面和元件
2. **回答該 Phase 下方的「對話引導問題」** — 幫助我確定 UI/UX 細節
3. **提供任何參考截圖或競品網站** — 如果有想模仿的風格

例如：
> 「開始 Phase 1，Landing Page 我想要簡潔的品牌介紹加上登入/註冊按鈕，註冊流程分兩步。」
