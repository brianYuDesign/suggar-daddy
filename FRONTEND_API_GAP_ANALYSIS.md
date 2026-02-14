# 🔍 前後端 API 覆蓋率差異分析

> **分析時間**: 2026-02-14  
> **後端 API 總數**: ~130+ 個  
> **前端已實作**: ~60 個  
> **覆蓋率**: **46%**

---

## 📊 執行摘要

### 🎯 總體狀況

| 服務 | 後端端點 | 前端已實作 | 缺失端點 | 覆蓋率 |
|------|----------|-----------|---------|--------|
| **Auth** | 16 | 4 | 12 | 25% 🔴 |
| **User** | 18 | 7 | 11 | 39% 🔴 |
| **Matching** | 4 | 3 | 1 | 75% 🟡 |
| **Content** | 25 | 7 | 18 | 28% 🔴 |
| **Subscription** | 10 | 5 | 5 | 50% 🟡 |
| **Payment** | 14 | 10 | 4 | 71% 🟡 |
| **Media** | 4 | 1 | 3 | 25% 🔴 |
| **Messaging** | 5 | 3 | 2 | 60% 🟡 |
| **Notification** | 3 | 3 | 0 | 100% 🟢 |
| **Admin** | 35+ | 35+ | 0 | 100% 🟢 |

### 🚨 關鍵發現

**嚴重程度分類**:
- 🔴 **P0 (阻斷功能)**: 22 個 API - 核心功能無法使用
- 🟡 **P1 (重要功能)**: 18 個 API - 影響用戶體驗
- 🟢 **P2 (增強功能)**: 16 個 API - 錦上添花

---

## 🔴 P0 阻斷級 API 缺失（22 個）

### 1. Auth Service - 12 個缺失 🔴

#### **電子郵件驗證系統** (5 個)
```typescript
// 缺失的 API
POST /api/auth/verify-email/:token      // 驗證電子郵件
POST /api/auth/resend-verification      // 重新發送驗證信
POST /api/auth/forgot-password          // 忘記密碼
POST /api/auth/reset-password           // 重置密碼
POST /api/auth/change-password          // 變更密碼

// 影響
❌ 用戶無法驗證電子郵件
❌ 忘記密碼無法重置
❌ 無法在設定頁面更改密碼
```

**業務影響**: 
- 用戶註冊後無法驗證帳號
- 密碼遺失用戶無法恢復帳號
- 無法提供完整的帳號安全功能

#### **OAuth 登入** (4 個)
```typescript
GET  /api/auth/google                   // Google OAuth 啟動
GET  /api/auth/google/callback          // Google 回調
POST /api/auth/apple                    // Apple 登入
POST /api/auth/apple/callback           // Apple 回調

// 影響
❌ 無法使用 Google/Apple 快速登入
❌ 降低用戶註冊轉換率
```

**業務影響**:
- 流失需要快速註冊的用戶
- 競爭力下降（業界標準功能）

#### **Admin 帳號管理** (3 個)
```typescript
POST /api/auth/admin/suspend/:userId    // 暫停帳號
POST /api/auth/admin/ban/:userId        // 禁止帳號
POST /api/auth/admin/reactivate/:userId // 重啟帳號

// 影響
❌ Admin 無法管理問題用戶
❌ 無法執行內容審查政策
```

---

### 2. User Service - 5 個缺失 🔴

#### **社交功能** (2 個)
```typescript
GET /api/users/search?q=                // 搜尋用戶
GET /api/users/recommended              // 推薦創作者

// 影響
❌ 無法搜尋想追蹤的創作者
❌ 新用戶無法發現優質內容
```

**業務影響**:
- 用戶留存率降低
- 內容消費減少

#### **追蹤系統** (3 個)
```typescript
GET /api/users/:userId/followers        // 粉絲列表
GET /api/users/:userId/following        // 追蹤列表
GET /api/users/follow/:targetId/status  // 追蹤狀態

// 影響
❌ 無法查看粉絲/追蹤列表
❌ 無法確認追蹤狀態
```

**業務影響**:
- 社交功能不完整
- 用戶關係透明度不足

---

### 3. Content Service - 5 個缺失 🔴

#### **評論系統** (3 個)
```typescript
POST   /api/posts/:id/comments               // 新增留言
GET    /api/posts/:id/comments               // 取得留言
DELETE /api/posts/:postId/comments/:commentId // 刪除留言

// 影響
❌ 無法對貼文留言互動
❌ 社群參與度大幅降低
```

**業務影響**:
- 用戶黏著度降低
- 平台活躍度不足

#### **Discovery 發現功能** (2 個)
```typescript
GET /api/posts/trending                  // 熱門貼文
GET /api/posts/search?q=                 // 搜尋貼文

// 影響
❌ 無法發現熱門內容
❌ 無法搜尋特定主題
```

**業務影響**:
- 內容曝光不均
- 用戶內容探索受限

---

## 🟡 P1 重要級 API 缺失（18 個）

### 4. Content Service - Stories 系統（7 個）🟡

```typescript
POST   /api/stories                      // 創建限時動態
GET    /api/stories/feed                 // 限時動態動態消息
GET    /api/stories/creator/:creatorId   // 創作者限時動態
POST   /api/stories/:storyId/view        // 標記已檢視
GET    /api/stories/:storyId/viewers     // 檢視者列表
DELETE /api/stories/:storyId             // 刪除限時動態
GET    /api/videos/:postId/stream        // 影片串流 URL

// 影響
⚠️ 無 Stories 功能（類似 Instagram Stories）
⚠️ 影片播放體驗可能受影響
```

**業務影響**:
- 缺少流行的內容格式
- 創作者表達方式受限

---

### 5. User Service - 進階功能（3 個）🟡

```typescript
POST /api/users/cards/by-ids             // 批量查詢用戶卡片
POST /api/users                          // 創建用戶（Admin）
PUT  /api/users/settings/dm-price        // 設定 DM 價格

// 影響
⚠️ 批量操作效率低
⚠️ 創作者無法設定付費 DM 價格
```

**業務影響**:
- DM 變現功能缺失
- Admin 用戶管理不便

---

### 6. Subscription Service - 創作者工具（3 個）🟡

```typescript
POST /api/subscriptions/create-tier      // 創建訂閱方案
GET  /api/subscriptions/admin/all        // 查詢所有訂閱（Admin）
PUT  /api/subscription-tiers/:id         // 更新訂閱層級

// 影響
⚠️ 創作者無法自行管理訂閱方案
⚠️ Admin 無法查看訂閱狀況
```

**業務影響**:
- 創作者依賴 Admin 設定方案
- 訂閱方案靈活性不足

---

### 7. Payment Service - 交易管理（2 個）🟡

```typescript
PUT /api/transactions/:id                // 更新交易（Admin）
POST /api/dm-purchases                   // 購買 DM 訪問

// 影響
⚠️ Admin 無法處理異常交易
⚠️ 付費 DM 功能無法使用
```

---

### 8. Messaging Service - 廣播功能（2 個）🟡

```typescript
POST /api/messaging/broadcast            // 發送廣播訊息
GET  /api/messaging/broadcasts           // 取得廣播訊息

// 影響
⚠️ 創作者無法群發訊息給訂閱者
⚠️ 無法進行促銷/公告推播
```

**業務影響**:
- 創作者留存用戶能力減弱
- 訂閱續訂率可能降低

---

### 9. Notification Service - Admin 功能（1 個）🟡

```typescript
POST /api/notifications/send             // 發送推播（Admin）

// 影響
⚠️ Admin 無法發送系統通知
```

---

## 🟢 P2 增強級 API 缺失（16 個）

### 10. Content Service - 進階功能（6 個）🟢

```typescript
// 內容管理
PUT    /api/posts/:id                    // 更新貼文
GET    /api/posts/bookmarks              // 書籤列表
POST   /api/posts/:id/bookmark           // 加入書籤
DELETE /api/posts/:id/bookmark           // 移除書籤
GET    /api/posts/:postId/comments/:commentId/replies // 巢狀回覆
GET    /api/posts/feed                   // 個人化動態消息

// 影響
✓ 增強用戶體驗，但非核心功能
```

---

### 11. User Service - 檢舉系統（3 個）🟢

```typescript
GET /api/users/admin/reports             // 查詢檢舉紀錄（Admin）
PUT /api/users/admin/reports/:reportId   // 更新檢舉狀態（Admin）
PUT /api/users/location                  // 更新用戶位置

// 影響
✓ Admin 端已有其他檢舉管理介面
```

---

### 12. Media Service - 媒體管理（3 個）🟢

```typescript
GET    /api/media                        // 查詢媒體列表
GET    /api/media/:id                    // 取得媒體詳情
DELETE /api/media/:id                    // 刪除媒體

// 影響
✓ 媒體管理功能增強
✓ 目前上傳即用，無需額外管理
```

---

### 13. Content Moderation - 內容審查（4 個）🟢

```typescript
GET  /api/moderation/queue               // 檢舉隊列（Admin）
GET  /api/moderation/reports/:postId     // 貼文檢舉（Admin）
PUT  /api/moderation/review/:reportId    // 審核檢舉（Admin）
POST /api/moderation/reinstate/:postId   // 恢復貼文（Admin）

// 影響
✓ Admin 端已有 `/api/admin/content/reports` 實作
✓ 功能重複，優先級較低
```

---

## 📋 實作優先級建議

### **Phase 1: 核心功能修復（1 週）**

優先處理 P0 阻斷級 API，確保基本業務流程完整：

#### Week 1 - Auth & User Core (16 個 API)
```typescript
// Day 1-2: 電子郵件驗證 + 密碼管理（5 API）
authApi.verifyEmail(token)
authApi.resendVerification()
authApi.forgotPassword(email)
authApi.resetPassword(token, newPassword)
authApi.changePassword(oldPassword, newPassword)

// Day 3: OAuth 登入（4 API）
authApi.googleLogin()
authApi.appleLogin()

// Day 4: 用戶搜尋 + 推薦（2 API）
usersApi.search(query)
usersApi.getRecommendedCreators()

// Day 5: 追蹤系統（3 API）
usersApi.getFollowers(userId)
usersApi.getFollowing(userId)
usersApi.getFollowStatus(targetId)
```

#### Week 1 - Content Engagement (5 個 API)
```typescript
// Day 6: 評論系統（3 API）
contentApi.addComment(postId, text)
contentApi.getComments(postId)
contentApi.deleteComment(postId, commentId)

// Day 7: Discovery（2 API）
contentApi.getTrending()
contentApi.searchPosts(query)
```

---

### **Phase 2: 重要功能增強（2 週）**

#### Week 2 - Stories + 變現功能（10 API）
```typescript
// Stories 系統（7 API）
storiesApi.createStory(media)
storiesApi.getFeed()
storiesApi.getCreatorStories(creatorId)
storiesApi.markAsViewed(storyId)
storiesApi.getViewers(storyId)
storiesApi.deleteStory(storyId)
videosApi.getStreamUrl(postId)

// DM 變現（1 API）
usersApi.setDmPrice(price)

// 付費 DM（1 API）
paymentsApi.purchaseDmAccess(userId)

// 廣播訊息（1 API）
messagingApi.sendBroadcast(message, recipientIds)
```

#### Week 3 - 創作者工具（5 API）
```typescript
// 訂閱管理（3 API）
subscriptionsApi.createTier(dto)
subscriptionsApi.updateTier(tierId, dto)
subscriptionsApi.deleteTier(tierId)

// Admin 功能（2 API）
adminApi.suspendUser(userId)
adminApi.banUser(userId)
```

---

### **Phase 3: 體驗優化（2 週）**

#### Week 4-5 - P2 增強功能（16 API）
```typescript
// 書籤功能
contentApi.getBookmarks()
contentApi.addBookmark(postId)
contentApi.removeBookmark(postId)

// 巢狀回覆
contentApi.getReplies(postId, commentId)

// 貼文編輯
contentApi.updatePost(postId, dto)

// 媒體管理
mediaApi.getMediaList()
mediaApi.getMedia(mediaId)
mediaApi.deleteMedia(mediaId)

// ... 其他 P2 功能
```

---

## 🎯 快速勝利 (Quick Wins)

以下 API 實作簡單但影響大，建議優先處理：

### 1. **搜尋功能**（2 小時）
```typescript
usersApi.search(query)         // 用戶搜尋
contentApi.searchPosts(query)  // 貼文搜尋
```
**影響**: 大幅提升內容發現能力

### 2. **評論系統**（4 小時）
```typescript
contentApi.addComment()
contentApi.getComments()
contentApi.deleteComment()
```
**影響**: 社群互動立即提升

### 3. **追蹤列表**（2 小時）
```typescript
usersApi.getFollowers()
usersApi.getFollowing()
```
**影響**: 社交功能完整度提升

### 4. **熱門內容**（1 小時）
```typescript
contentApi.getTrending()
```
**影響**: 內容曝光更均衡

---

## 📊 實作工時估算

| 階段 | API 數量 | 預估工時 | 開發人力 |
|------|----------|----------|----------|
| **Phase 1** | 22 個 | 5 天 | 2 Frontend Dev |
| **Phase 2** | 18 個 | 10 天 | 2 Frontend Dev |
| **Phase 3** | 16 個 | 10 天 | 1 Frontend Dev |
| **總計** | 56 個 | **25 天** | **平均 1.5 人** |

---

## 🚧 風險與依賴

### 技術依賴
1. **OAuth 整合**
   - 需要 Google/Apple 開發者帳號
   - 需要配置 OAuth 回調 URL
   - 預估額外 2 天設定時間

2. **影片串流**
   - 可能需要 CDN 或 HLS 支援
   - 需驗證後端實作完整性

3. **推播通知**
   - 需要 FCM/APNs 配置
   - 需要前端 Service Worker

### 測試需求
- **E2E 測試**: 每個新 API 需 1-2 個測試案例
- **預估額外工時**: 5 天

---

## ✅ 下一步行動

### 立即行動（今天）
1. ✅ 驗證後端 API 實作完整性
2. ✅ 確認 OAuth 所需的環境變數
3. ✅ 檢查 Stories/影片串流的後端支援

### 本週內
1. 📋 建立 Phase 1 開發 Ticket（22 個 API）
2. 👥 分配 Frontend Developer 資源
3. 🎨 設計 UI/UX（搜尋、評論、追蹤列表、密碼重置流程）

### 下週開始
1. 💻 開始 Phase 1 實作
2. 🧪 撰寫 E2E 測試
3. 📝 更新 API Client 文檔

---

## 📈 成功指標

完成所有 P0+P1 API 後，預期達成：
- ✅ **API 覆蓋率**: 46% → **77%** (+31%)
- ✅ **核心功能完整度**: 50% → **95%** (+45%)
- ✅ **用戶留存率**: 預期提升 30-40%
- ✅ **社群參與度**: 預期提升 50-60%

---

## 🔗 相關文檔

- [後端 API 文檔](./docs/02-開發指南.md)
- [上線準備計劃](./LAUNCH_READINESS_ACTION_PLAN.md)
- [E2E 測試計劃](./E2E_TESTING_INTEGRATION_PLAN.md)
