# Matching & Discovery Enhancement — Requirements Specification

> Generated: 2026-02-21 | Status: Draft — Pending Approval

## 1. Overview

Enhancement of the matching algorithm and discovery UX for the Suggar Daddy dating platform. Covers smart recommendations, compatibility scoring, behavioral learning, "who liked me" monetization, advanced filters, profile detail views, undo/rewind, and multi-mode browsing.

---

## 2. Feature Requirements

### 2.1 Smart Compatibility Scoring (進階兼容度評分)

**Goal:** Replace pure distance-based ranking with multi-factor compatibility scoring.

**Scoring Factors:**
| Factor | Weight | Description |
|--------|--------|-------------|
| userType 互補 | 30% | Sugar Daddy ↔ Sugar Baby 優先配對 |
| 距離 | 20% | 越近分數越高，超出偏好範圍降權 |
| 年齡偏好 | 15% | 雙方年齡是否在對方偏好區間內 |
| 興趣標籤匹配 | 20% | 共同標籤數 / 總標籤數 |
| 行為學習分數 | 15% | 基於互動行為的個性化權重（見 2.3） |

**Functional Requirements:**
- FR-CS-1: 系統計算每對用戶的兼容度分數 (0-100)
- FR-CS-2: Discovery cards 按兼容度分數降序排列（距離作為次要排序）
- FR-CS-3: 兼容度分數顯示在用戶卡片和詳細頁上
- FR-CS-4: 分數每日重新計算一次（快取於 Redis，TTL 24h）
- FR-CS-5: Boosted 用戶在相同分數下優先排序

**User Preferences Schema (新增):**
```
- preferredAgeMin: number (18-80)
- preferredAgeMax: number (18-80)
- preferredDistance: number (km, 1-500, default 50)
- preferredUserType: 'sugar_daddy' | 'sugar_baby' | 'both'
```

---

### 2.2 Interest Tags System (興趣標籤系統)

**Goal:** 預定義分層標籤，用於兼容度計算和篩選。

**Tag Structure:**
```
Category (大分類)
├── Lifestyle: 旅行, 美食, 健身, 購物, 派對, 戶外運動
├── Interests: 音樂, 電影, 藝術, 攝影, 閱讀, 遊戲
├── Expectations: 長期關係, 短期約會, 旅伴, 導師, 生活贊助
└── Personality: 內向, 外向, 冒險型, 文藝型, 商務型
```

**Functional Requirements:**
- FR-IT-1: 用戶在 profile/edit 頁面可選擇興趣標籤（每分類最多 5 個）
- FR-IT-2: 標籤存儲為 User entity 的多對多關係（UserTag pivot table）
- FR-IT-3: Discovery 詳細頁高亮共同興趣標籤
- FR-IT-4: 興趣標籤可作為 Discovery 篩選條件

**Entity:**
```
InterestTag {
  id: UUID
  category: 'lifestyle' | 'interests' | 'expectations' | 'personality'
  name: string (unique within category)
  icon?: string
  sortOrder: number
}

UserInterestTag {
  userId: UUID (FK → User)
  tagId: UUID (FK → InterestTag)
  createdAt: timestamp
}
```

---

### 2.3 Behavioral Learning & Collaborative Filtering (行為學習 + 協同過濾)

**Goal:** 深度學習用戶偏好，建立向量嵌入做協同過濾推薦。

#### 2.3.1 行為數據收集

**Tracked Behaviors:**
| Event | Data Points |
|-------|-------------|
| Swipe (like/pass/super_like) | targetUserId, action, timestamp |
| 滑動速度 | 從顯示到滑動的毫秒數 |
| 停留時間 | 卡片顯示時長 |
| 查看詳情 | 是否點開 profile detail |
| 詳情停留 | profile detail 頁停留時長 |
| 照片瀏覽 | 查看了幾張照片 |

**Functional Requirements:**
- FR-BL-1: 前端追蹤上述行為事件，batch 發送至 API（每 10 個事件或 30 秒）
- FR-BL-2: 行為數據存入 Kafka → 由 ML 推薦服務消費
- FR-BL-3: 滑動速度 < 1 秒的 like 降低學習權重（可能是亂滑）

#### 2.3.2 ML 推薦服務 (External Python Service)

**Architecture:**
```
NestJS (matching-service)
  → HTTP POST /recommend
    → Python FastAPI (recommendation-ml-service)
      → scikit-learn / PyTorch
      → Pgvector (向量存儲)
    ← Ranked user IDs + scores
```

**Implementation:**
- FR-ML-1: 獨立 Python FastAPI 服務，port 5000
- FR-ML-2: 用戶行為 → 特徵向量（維度: 64-128）
- FR-ML-3: 每日批次更新所有用戶向量（cron job）
- FR-ML-4: 即時推薦 API：輸入 userId → 輸出 top-N 候選人 + 分數
- FR-ML-5: 向量存儲在 PostgreSQL + pgvector 擴展
- FR-ML-6: Fallback：ML 服務不可用時退回兼容度分數排序

#### 2.3.3 冷啟動策略

- FR-CS-1: 新用戶（< 20 次滑動）：60% 註冊資料匹配 + 40% 人氣排序
- FR-CS-2: 人氣分數 = 近 7 天被 like 數 + super_like 數 * 3
- FR-CS-3: 滑動達 20 次後逐步過渡到個性化推薦（20→50 次線性過渡）
- FR-CS-4: 完全個性化（> 50 次滑動）：ML 推薦為主，兼容度分數為輔

---

### 2.4 "Who Liked Me" (誰喜歡我)

**Goal:** 模糊預覽免費 + 解鎖付費（Tinder 模式）。

**Functional Requirements:**
- FR-WL-1: 所有用戶可看到「N 人喜歡你」的數量通知
- FR-WL-2: 免費用戶看到模糊頭像（Gaussian blur）的 grid
- FR-WL-3: 訂閱用戶（Premium/VIP）可直接看到清晰頭像和資料
- FR-WL-4: 免費用戶可用鑽石逐一解鎖（每次 20 鑽石）
- FR-WL-5: 用戶可從「誰喜歡我」頁面直接 like 回去（立即 match）
- FR-WL-6: 新增 like 時推送通知：「有人喜歡了你！」（不透露身份）

**API Endpoints (New):**
```
GET  /api/matching/likes-me          → { count, blurredCards[], nextCursor }
POST /api/matching/likes-me/reveal   → { card: UserCardDto }  (花鑽石解鎖)
```

**UI:**
- 新頁面或 tab：`/discover/likes-me`
- 模糊卡片 grid（3 列）
- 解鎖按鈕（鑽石圖標 + 數量）
- 訂閱用戶看到清晰圖片 + 直接 like/pass 按鈕

---

### 2.5 Discovery Filters (探索篩選器)

**Goal:** 用戶可自定義探索條件。

**Filter Options:**
| Filter | Type | Default |
|--------|------|---------|
| 距離範圍 | Slider (1-500km) | User preference or 50km |
| 年齡範圍 | Range slider (18-80) | User preference or 18-60 |
| userType | Toggle (Sugar Daddy / Sugar Baby / Both) | Opposite of self |
| 驗證狀態 | Toggle (Verified only) | Off |
| 在線狀態 | Toggle (Online recently) | Off |
| 興趣標籤 | Multi-select chips | None |

**Functional Requirements:**
- FR-DF-1: Filter panel 作為 drawer/bottom sheet 從探索頁觸發
- FR-DF-2: 篩選條件保存至用戶偏好（跨 session 持久化）
- FR-DF-3: 篩選條件傳遞至 GET /cards API 做服務端過濾
- FR-DF-4: 顯示當前活動的篩選條件數量 badge
- FR-DF-5: 「重置篩選」一鍵清除所有條件

**API Changes:**
```
GET /api/matching/cards?
  limit=20&
  cursor=xxx&
  radius=50&
  ageMin=25&
  ageMax=45&
  userType=sugar_daddy&
  verifiedOnly=true&
  onlineRecently=true&
  tags=travel,fitness
```

---

### 2.6 Profile Detail View (個人檔案詳細頁)

**Goal:** 滑動前可點開候選人完整資料。

**Display Content:**
- 所有照片（swipeable gallery）
- 基本資料：displayName, username, age, city, distance
- Bio 全文
- 兼容度分數（圓形進度條）
- 興趣標籤（共同興趣高亮）
- 最近動態（最近 3 篇貼文預覽）
- 共同興趣數量統計

**Functional Requirements:**
- FR-PD-1: 從 discover card 點擊頭像/名字進入詳細頁
- FR-PD-2: 詳細頁底部保留 like/pass/super_like 操作按鈕
- FR-PD-3: 照片 gallery 支持左右滑動
- FR-PD-4: 載入用戶最近 3 篇公開貼文
- FR-PD-5: 追蹤詳細頁停留時間（用於行為學習）

**API Endpoint (New):**
```
GET /api/matching/cards/:userId/detail → { ...UserCardDto, photos[], recentPosts[], compatibilityScore, commonTags[] }
```

---

### 2.7 Undo / Rewind (回退功能)

**Goal:** 混合制 — 訂閱者每天 5 次免費，超過或免費用戶用鑽石。

**Functional Requirements:**
- FR-UR-1: Undo 回退最後一次滑動操作
- FR-UR-2: 只能 undo 最近 1 次（不能連續 undo 多次）
- FR-UR-3: 訂閱用戶每天免費 5 次 undo
- FR-UR-4: 免費用戶或訂閱者超過 5 次後，每次消耗 10 鑽石
- FR-UR-5: Undo 後卡片重新出現在卡片堆頂部
- FR-UR-6: 如果 undo 的是一個已成功 match 的 like，match 也要撤銷

**API Endpoint (New):**
```
POST /api/matching/undo → { undone: boolean, card: UserCardDto, diamondCost?: number, freeUndosRemaining: number }
```

**Redis Key:**
```
undo_counter:{userId}:{date} → Daily undo count (24h TTL)
last_swipe:{userId}          → Last swipe record for undo (single entry)
```

---

### 2.8 Multi-Mode Browsing (多模式瀏覽)

**Goal:** 卡片模式 + Grid 模式 + 地圖模式。

#### Card Mode (Default)
- 現有的卡片滑動體驗
- 增加兼容度分數顯示

#### Grid Mode
- 3 列 grid 顯示候選人卡片
- 每張卡片：頭像、名字、年齡、距離、兼容度分數
- 點擊進入 Profile Detail View
- 支持無限滾動
- Like/pass 操作在 detail view 中進行

#### Map Mode
- 地圖顯示附近用戶（模糊位置，非精確座標）
- 用戶頭像作為地圖 marker
- 點擊 marker 顯示迷你卡片
- 迷你卡片可展開為 Profile Detail View
- 使用 Mapbox GL JS 或 Google Maps API

**Functional Requirements:**
- FR-MB-1: 探索頁頂部顯示模式切換按鈕（Card / Grid / Map icons）
- FR-MB-2: 模式切換保持當前篩選條件
- FR-MB-3: Grid 和 Map 模式共用相同的 cards API
- FR-MB-4: Map 模式只顯示有位置資訊的用戶
- FR-MB-5: 用戶位置在地圖上做 ±500m 隨機偏移（隱私保護）
- FR-MB-6: 模式偏好保存至本地 localStorage

---

## 3. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Discovery cards API latency | < 200ms (p95) |
| Compatibility score calculation | < 50ms per pair |
| ML recommendation API latency | < 500ms (p95) |
| ML model update frequency | Daily batch (off-peak) |
| Behavior event ingestion | < 1s end-to-end |
| Map mode initial load | < 2s |
| Undo operation | < 100ms |
| Filter apply response | < 300ms |

---

## 4. User Stories

### Matching Algorithm
- US-1: As a Sugar Baby, I want to see Sugar Daddies ranked by compatibility, so I find better matches faster.
- US-2: As a user, I want the app to learn my preferences from my swipe behavior, so recommendations improve over time.
- US-3: As a new user, I want to see popular profiles first, so I have a good first experience.

### Who Liked Me
- US-4: As a free user, I want to see how many people liked me, so I feel motivated to engage.
- US-5: As a subscriber, I want to see who liked me clearly, so I can quickly like them back.
- US-6: As a free user, I want to spend diamonds to reveal who liked me, one at a time.

### Discovery UX
- US-7: As a user, I want to filter discovery by age, distance, and type, so I only see relevant candidates.
- US-8: As a user, I want to view a full profile before deciding to swipe, so I make better decisions.
- US-9: As a user, I want to undo my last swipe if I made a mistake.
- US-10: As a user, I want to browse candidates on a map, so I can see who's nearby visually.
- US-11: As a user, I want to switch between card and grid views based on my preference.

### Tags
- US-12: As a user, I want to select interest tags on my profile, so I match with similar people.
- US-13: As a user, I want to see common interests highlighted when viewing profiles.

---

## 5. Acceptance Criteria Summary

| Feature | Key Criteria |
|---------|-------------|
| Compatibility Score | Score 0-100 visible on card + detail; refreshed daily |
| Interest Tags | 4 categories; max 5 per category; stored in DB |
| Behavioral Learning | 6 event types tracked; batch sent every 30s |
| ML Service | Python FastAPI; pgvector; daily model update; < 500ms |
| Cold Start | 60/40 profile+popularity blend for < 20 swipes |
| Who Liked Me | Blurred grid for free; clear for subscribers; 20 diamonds to reveal |
| Filters | 6 filter types; server-side; persisted to preferences |
| Profile Detail | Photos gallery, bio, score, tags, recent posts |
| Undo | 5 free/day for subscribers; 10 diamonds otherwise; last-1 only |
| Multi-Mode | Card (default) + Grid + Map; mode persisted locally |

---

## 6. Open Questions

1. **Map Provider** — Mapbox GL JS vs Google Maps？成本和 license 考量？
2. **ML 服務部署** — 與現有 Docker Compose 整合？獨立部署？GPU 需求？
3. **pgvector** — 是否需要獨立 PostgreSQL instance，或在現有 master 上加擴展？
4. **興趣標籤初始數據** — 需要多少個預定義標籤？是否需要多語言支持？
5. **隱私** — 地圖模式的位置模糊化 ±500m 是否足夠？

---

## 7. Recommended Implementation Order

```
Phase 1 (Foundation)
├── Interest Tags entity + API + profile edit UI
├── User Preferences schema (age, distance, userType)
├── Discovery Filters (backend + frontend)
└── Profile Detail View

Phase 2 (Smart Matching)
├── Compatibility Scoring algorithm
├── Cards API with scoring + sorting
├── Behavioral event tracking (frontend)
└── Who Liked Me (backend + UI)

Phase 3 (Advanced)
├── ML Recommendation Service (Python FastAPI + pgvector)
├── Behavioral data pipeline (Kafka → ML service)
├── Cold start strategy
└── Collaborative filtering integration

Phase 4 (UX Polish)
├── Undo / Rewind feature
├── Grid browsing mode
├── Map browsing mode
└── Analytics dashboard
```

---

## 8. Next Steps

- **Architecture Design** → `/sc:design` for system architecture and API contracts
- **Implementation Workflow** → `/sc:workflow` for task breakdown and sprint planning
