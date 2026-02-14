# API 實作狀態總覽

> 最後更新: 2026-02-14

## 前後端 API 覆蓋率

| 服務 | 後端端點 | 前端已實作 | 覆蓋率 |
|------|----------|-----------|--------|
| Auth | 16 | 16 | 100% |
| User | 18 | 15 | 83% |
| Matching | 4 | 3 | 75% |
| Content | 25 | 19 | 76% |
| Subscription | 10 | 8 | 80% |
| Payment | 14 | 12 | 86% |
| Media | 4 | 1 | 25% |
| Messaging | 5 | 5 | 100% |
| Notification | 3 | 3 | 100% |
| Admin | 35+ | 35+ | 100% |

---

## 已完成的 API 實作

### P0 級別 (核心功能)

#### Auth Service (16 個方法)

| 方法 | 端點 | 權限 |
|------|------|------|
| `login` | POST /api/auth/login | Public |
| `register` | POST /api/auth/register | Public |
| `refresh` | POST /api/auth/refresh | Public |
| `logout` | POST /api/auth/logout | Auth |
| `verifyEmail` | POST /api/auth/verify-email/:token | Public |
| `resendVerification` | POST /api/auth/resend-verification | Auth |
| `forgotPassword` | POST /api/auth/forgot-password | Public |
| `resetPassword` | POST /api/auth/reset-password | Public |
| `changePassword` | POST /api/auth/change-password | Auth |
| `getGoogleLoginUrl` | GET /api/auth/google | Public |
| `handleGoogleCallback` | GET /api/auth/google/callback | Public |
| `appleLogin` | POST /api/auth/apple | Public |
| `handleAppleCallback` | POST /api/auth/apple/callback | Public |
| `suspendUser` | POST /api/auth/admin/suspend/:userId | Admin |
| `banUser` | POST /api/auth/admin/ban/:userId | Admin |
| `reactivateUser` | POST /api/auth/admin/reactivate/:userId | Admin |

#### User Service (15 個方法)

| 方法 | 端點 | 權限 |
|------|------|------|
| `getProfile` | GET /api/users/profile | Auth |
| `updateProfile` | PUT /api/users/profile | Auth |
| `getUserById` | GET /api/users/:id | Public |
| `followUser` | POST /api/users/follow/:targetId | Auth |
| `unfollowUser` | DELETE /api/users/follow/:targetId | Auth |
| `searchUsers` | GET /api/users/search | Public |
| `getRecommendedCreators` | GET /api/users/recommended | Public |
| `getFollowers` | GET /api/users/:userId/followers | Public |
| `getFollowing` | GET /api/users/:userId/following | Public |
| `getFollowStatus` | GET /api/users/follow/:targetId/status | Auth |
| `getUserCardsByIds` | POST /api/users/cards/by-ids | Auth |
| `createUser` | POST /api/users | Admin |
| `setDmPrice` | PUT /api/users/settings/dm-price | Creator |
| `reportUser` | POST /api/users/:id/report | Auth |
| `blockUser` | POST /api/users/:id/block | Auth |

#### Content Service (19 個方法)

| 方法 | 端點 | 權限 |
|------|------|------|
| `createPost` | POST /api/posts | Creator |
| `getPost` | GET /api/posts/:id | Auth |
| `deletePost` | DELETE /api/posts/:id | Creator |
| `getFeed` | GET /api/posts/feed | Auth |
| `getCreatorPosts` | GET /api/posts/creator/:id | Auth |
| `likePost` | POST /api/posts/:id/like | Auth |
| `unlikePost` | DELETE /api/posts/:id/like | Auth |
| `addComment` | POST /api/posts/:postId/comments | Auth |
| `getComments` | GET /api/posts/:postId/comments | Auth |
| `deleteComment` | DELETE /api/posts/:postId/comments/:commentId | Auth |
| `getTrendingPosts` | GET /api/posts/trending | Public |
| `searchPosts` | GET /api/posts/search | Public |
| `createStory` | POST /api/stories | Creator |
| `getStoriesFeed` | GET /api/stories/feed | Auth |
| `getCreatorStories` | GET /api/stories/creator/:creatorId | Auth |
| `markStoryAsViewed` | POST /api/stories/:storyId/view | Auth |
| `getStoryViewers` | GET /api/stories/:storyId/viewers | Creator |
| `deleteStory` | DELETE /api/stories/:storyId | Creator |
| `getVideoStreamUrl` | GET /api/videos/:postId/stream | Auth |

### P1 級別 (重要功能)

#### Subscription Service (8 個方法)

| 方法 | 端點 | 權限 |
|------|------|------|
| `getTiers` | GET /api/subscription-tiers/creator/:id | Public |
| `subscribe` | POST /api/subscriptions | Auth |
| `cancelSubscription` | DELETE /api/subscriptions/:id | Auth |
| `getMySubscriptions` | GET /api/subscriptions/me | Auth |
| `getSubscribers` | GET /api/subscriptions/subscribers | Creator |
| `createSubscriptionTier` | POST /api/subscription-tiers | Creator |
| `updateSubscriptionTier` | PUT /api/subscription-tiers/:tierId | Creator |
| `deleteSubscriptionTier` | DELETE /api/subscription-tiers/:tierId | Creator |

#### Payment Service (12 個方法)

| 方法 | 端點 | 權限 |
|------|------|------|
| `sendTip` | POST /api/tips | Auth |
| `purchasePost` | POST /api/post-purchases | Auth |
| `getTransactions` | GET /api/transactions | Auth |
| `getEarnings` | GET /api/transactions/earnings | Creator |
| `createPaymentIntent` | POST /api/stripe/payment-intent | Auth |
| `confirmPayment` | POST /api/stripe/confirm | Auth |
| `setupPayoutAccount` | POST /api/stripe/connect | Creator |
| `getPayoutStatus` | GET /api/stripe/payout-status | Creator |
| `requestPayout` | POST /api/stripe/payout | Creator |
| `getBalance` | GET /api/stripe/balance | Creator |
| `purchaseDmAccess` | POST /api/dm-purchases | Auth |
| `updateTransaction` | PUT /api/transactions/:transactionId | Admin |

#### Messaging Service (5 個方法)

| 方法 | 端點 | 權限 |
|------|------|------|
| `getConversations` | GET /api/messaging/conversations | Auth |
| `getMessages` | GET /api/messaging/:conversationId/messages | Auth |
| `sendMessage` | POST /api/messaging/send | Auth |
| `sendBroadcast` | POST /api/messaging/broadcast | Creator |
| `getBroadcasts` | GET /api/messaging/broadcasts | Creator |

#### Notification Service (4 個方法)

| 方法 | 端點 | 權限 |
|------|------|------|
| `getAll` | GET /api/notifications | Auth |
| `markAsRead` | PUT /api/notifications/:id/read | Auth |
| `markAllAsRead` | PUT /api/notifications/read-all | Auth |
| `sendNotification` | POST /api/notifications/send | Admin |

---

## 尚未實作的 API (P2 增強功能)

以下 API 為增強功能，優先級較低：

| 服務 | 端點 | 說明 |
|------|------|------|
| Content | PUT /api/posts/:id | 更新貼文 |
| Content | GET /api/posts/bookmarks | 書籤列表 |
| Content | POST /api/posts/:id/bookmark | 加入書籤 |
| Content | DELETE /api/posts/:id/bookmark | 移除書籤 |
| Content | GET /api/posts/:postId/comments/:commentId/replies | 巢狀回覆 |
| Media | GET /api/media | 媒體列表 |
| Media | GET /api/media/:id | 媒體詳情 |
| Media | DELETE /api/media/:id | 刪除媒體 |
| User | GET /api/users/admin/reports | 檢舉紀錄 (Admin) |
| User | PUT /api/users/admin/reports/:reportId | 更新檢舉 (Admin) |
| User | PUT /api/users/location | 更新位置 |

---

## TypeScript 驗證

所有已實作的 API 方法均通過 TypeScript 類型檢查：

```bash
cd libs/api-client && npx tsc --noEmit
```

## 相關檔案

- API Client 原始碼: `libs/api-client/src/`
- DTO 類型定義: `libs/dto/src/`
- 後端路由設定: `apps/api-gateway/src/app/proxy.service.ts`
