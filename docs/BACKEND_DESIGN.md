# Sugar Daddy 後端設計文件

## 專案概述

結合 Tinder（配對交友）與 OnlyFans（訂閱內容）的平台後端。

---

## 核心功能模組

### 1. 用戶系統 (User Module)

| 功能 | 說明 |
|------|------|
| 註冊/登入 | Email、手機、OAuth（Google/Apple） |
| 身份驗證 | 年齡驗證、實名認證（可選） |
| 用戶角色 | `sugar_baby` / `sugar_daddy` / `creator` / `subscriber` |
| 個人檔案 | 頭像、簡介、照片牆、偏好設定 |

```
users
├── id (UUID)
├── email
├── phone
├── password_hash
├── role (enum)
├── profile
│   ├── display_name
│   ├── bio
│   ├── avatar_url
│   ├── photos[]
│   ├── age
│   ├── location
│   └── preferences (JSON)
├── verification_status
├── created_at
└── updated_at
```

---

### 2. 配對系統 (Matching Module) — Tinder 風格

| 功能 | 說明 |
|------|------|
| 滑動瀏覽 | 左滑 Pass、右滑 Like、上滑 Super Like |
| 配對邏輯 | 雙方互 Like 才配對成功 |
| 推薦算法 | 基於位置、偏好、活躍度 |
| 篩選條件 | 年齡、距離、收入範圍（可選） |

```
swipes
├── id
├── swiper_id (FK → users)
├── swiped_id (FK → users)
├── action (like / pass / super_like)
├── created_at

matches
├── id
├── user_a_id
├── user_b_id
├── matched_at
├── status (active / unmatched / blocked)
```

---

### 3. 訂閱內容系統 (Content Module) — OnlyFans 風格

| 功能 | 說明 |
|------|------|
| 創作者頁面 | 公開/訂閱制內容 |
| 訂閱方案 | 月費、年費、分層級 |
| 付費內容 | 單篇購買（PPV）|
| 小費/打賞 | 單次打賞 |

```
subscriptions
├── id
├── subscriber_id (FK → users)
├── creator_id (FK → users)
├── tier_id (FK → subscription_tiers)
├── status (active / cancelled / expired)
├── started_at
├── expires_at

subscription_tiers
├── id
├── creator_id
├── name (e.g., "Bronze", "VIP")
├── price_monthly
├── price_yearly
├── benefits (JSON)

posts
├── id
├── creator_id (FK → users)
├── content_type (text / image / video)
├── media_urls[]
├── caption
├── visibility (public / subscribers / tier_specific / ppv)
├── ppv_price (nullable)
├── created_at

tips
├── id
├── from_user_id
├── to_user_id
├── amount
├── message (optional)
├── created_at
```

---

### 4. 訊息系統 (Messaging Module)

| 功能 | 說明 |
|------|------|
| 私訊 | 配對後可聊天 |
| 付費訊息 | 創作者可設定收費回覆 |
| 媒體訊息 | 圖片/影片/語音 |
| 已讀回執 | 可選 |

```
conversations
├── id
├── participant_ids[]
├── type (match / subscription / direct)
├── created_at

messages
├── id
├── conversation_id
├── sender_id
├── content_type (text / image / video / voice)
├── content
├── media_url
├── is_paid (bool)
├── price (nullable)
├── read_at
├── created_at
```

---

### 5. 支付系統 (Payment Module)

| 功能 | 說明 |
|------|------|
| 金流整合 | Stripe / 綠界 / Apple Pay |
| 錢包 | 平台餘額 |
| 提領 | 創作者提現 |
| 分潤 | 平台抽成（通常 15-20%） |

```
wallets
├── id
├── user_id
├── balance
├── currency
├── updated_at

transactions
├── id
├── user_id
├── type (deposit / withdrawal / subscription / tip / ppv / refund)
├── amount
├── fee
├── net_amount
├── status (pending / completed / failed)
├── reference_id
├── created_at

payouts
├── id
├── creator_id
├── amount
├── method (bank_transfer / paypal)
├── status
├── processed_at
```

---

### 6. 通知系統 (Notification Module)

| 類型 | 觸發條件 |
|------|----------|
| Push | 新配對、新訊息、新訂閱 |
| Email | 交易確認、週報 |
| In-app | 所有活動 |

```
notifications
├── id
├── user_id
├── type
├── title
├── body
├── data (JSON)
├── read_at
├── created_at
```

---

## 技術選型建議

| 層級 | 建議 |
|------|------|
| 語言 | Node.js (TypeScript) 或 Python (FastAPI) |
| 框架 | NestJS / FastAPI |
| 資料庫 | PostgreSQL（主）+ Redis（快取/即時） |
| 檔案儲存 | AWS S3 / Cloudflare R2 |
| 即時通訊 | WebSocket (Socket.io) / Ably |
| 搜尋 | Elasticsearch（用戶搜尋、內容搜尋）|
| 金流 | Stripe Connect（多方支付）|
| 認證 | JWT + Refresh Token |
| 佇列 | Bull (Redis) / RabbitMQ |

---

## API 架構（RESTful）

```
/api/v1
├── /auth
│   ├── POST /register
│   ├── POST /login
│   ├── POST /logout
│   ├── POST /refresh
│   └── POST /verify-phone
│
├── /users
│   ├── GET /me
│   ├── PATCH /me
│   ├── GET /:id/profile
│   └── POST /me/photos
│
├── /matching
│   ├── GET /cards (取得待滑動用戶)
│   ├── POST /swipe
│   ├── GET /matches
│   └── DELETE /matches/:id (unmatch)
│
├── /subscriptions
│   ├── GET /creators/:id/tiers
│   ├── POST /subscribe
│   ├── DELETE /subscriptions/:id
│   └── GET /my-subscriptions
│
├── /posts
│   ├── GET /feed
│   ├── GET /creators/:id/posts
│   ├── POST /posts
│   ├── POST /posts/:id/unlock (PPV)
│   └── POST /posts/:id/tip
│
├── /messages
│   ├── GET /conversations
│   ├── GET /conversations/:id/messages
│   ├── POST /conversations/:id/messages
│   └── WebSocket /ws/chat
│
├── /payments
│   ├── POST /wallet/deposit
│   ├── POST /wallet/withdraw
│   └── GET /transactions
│
└── /notifications
    ├── GET /
    └── PATCH /:id/read
```

---

## 安全性考量

- **資料加密**: 敏感資料 AES-256 加密存儲
- **API 限流**: Rate limiting 防止濫用
- **內容審核**: AI 自動審核 + 人工複審
- **年齡驗證**: 強制 18+ 驗證
- **隱私設定**: 用戶可控制曝光範圍
- **DMCA**: 侵權下架機制

---

## 下一步

1. 確認優先功能（先做配對？先做訂閱？）
2. 選定技術棧
3. 設計詳細 API 規格（OpenAPI/Swagger）
4. 建立資料庫 Schema
5. 開始開發 MVP

---

有問題隨時問我！
