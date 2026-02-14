# Service API 參考

各 service 的 API client 使用方式與端點對照。

---

## User Service

**檔案**: `libs/api-client/src/users.ts`

### 端點對照

| 方法 | HTTP | 端點 | 權限 |
|------|------|------|------|
| `searchUsers(query, limit?)` | GET | /api/users/search | Public |
| `getRecommendedCreators(limit?)` | GET | /api/users/recommended | Public |
| `getFollowers(userId, cursor?)` | GET | /api/users/:userId/followers | Public |
| `getFollowing(userId, cursor?)` | GET | /api/users/:userId/following | Public |
| `getFollowStatus(targetId)` | GET | /api/users/follow/:targetId/status | Auth |
| `getUserCardsByIds(userIds)` | POST | /api/users/cards/by-ids | Auth |
| `createUser(dto)` | POST | /api/users | Admin |
| `setDmPrice(price)` | PUT | /api/users/settings/dm-price | Creator |

### 類型定義

```typescript
interface UserCard {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  isVerified?: boolean;
  role: 'ADMIN' | 'CREATOR' | 'SUBSCRIBER';
}

interface FollowStatus {
  isFollowing: boolean;
  isFollowedBy: boolean;
}

interface CursorPaginatedResponse<T> {
  data: T[];
  cursor?: string;
  hasMore: boolean;
}
```

### 使用範例

```typescript
// 搜尋用戶
const users = await client.users.searchUsers('john', 10);

// 粉絲列表 (cursor 分頁)
const page1 = await client.users.getFollowers('user123');
if (page1.hasMore) {
  const page2 = await client.users.getFollowers('user123', page1.cursor);
}

// 追蹤狀態
const status = await client.users.getFollowStatus('target-id');
// status.isFollowing / status.isFollowedBy

// 設定 DM 價格 (美分單位)
await client.users.setDmPrice(599); // $5.99
```

---

## Content Service

**檔案**: `libs/api-client/src/content.ts`, `libs/api-client/src/stories.ts`

### Content API 端點

| 方法 | HTTP | 端點 | 權限 |
|------|------|------|------|
| `addComment(postId, text, parentId?)` | POST | /api/posts/:postId/comments | Auth |
| `getComments(postId, cursor?)` | GET | /api/posts/:postId/comments | Auth |
| `deleteComment(postId, commentId)` | DELETE | /api/posts/:postId/comments/:commentId | Auth |
| `getTrendingPosts(limit?)` | GET | /api/posts/trending | Public |
| `searchPosts(query, cursor?)` | GET | /api/posts/search | Public |

### Stories API 端點

| 方法 | HTTP | 端點 | 權限 |
|------|------|------|------|
| `createStory(mediaId, duration?)` | POST | /api/stories | Creator |
| `getStoriesFeed()` | GET | /api/stories/feed | Auth |
| `getCreatorStories(creatorId)` | GET | /api/stories/creator/:creatorId | Auth |
| `markStoryAsViewed(storyId)` | POST | /api/stories/:storyId/view | Auth |
| `getStoryViewers(storyId)` | GET | /api/stories/:storyId/viewers | Creator |
| `deleteStory(storyId)` | DELETE | /api/stories/:storyId | Creator |
| `getVideoStreamUrl(postId)` | GET | /api/videos/:postId/stream | Auth |

### 類型定義

```typescript
interface Comment {
  commentId: string;
  postId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  text: string;
  parentCommentId?: string;
  createdAt: string;
  likesCount: number;
  repliesCount: number;
}

interface Story {
  storyId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  duration: number;
  createdAt: string;
  expiresAt: string;
  viewsCount: number;
  isViewed?: boolean;
}

interface StoryGroup {
  userId: string;
  username: string;
  avatarUrl?: string;
  stories: Story[];
  hasUnviewed: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}
```

### 使用範例

```typescript
// 評論
const comment = await client.content.addComment('post123', '好棒！');
const reply = await client.content.addComment('post123', '謝謝', comment.commentId);
const { data, nextCursor, hasMore } = await client.content.getComments('post123');

// 發現
const trending = await client.content.getTrendingPosts(20);
const results = await client.content.searchPosts('健身教學');

// Stories
const story = await client.stories.createStory('media123', 15);
const feed = await client.stories.getStoriesFeed();
await client.stories.markStoryAsViewed('story123');
```

---

## Subscription Service

**檔案**: `libs/api-client/src/subscriptions.ts`

### 端點對照

| 方法 | HTTP | 端點 | 權限 |
|------|------|------|------|
| `createSubscriptionTier(dto)` | POST | /api/subscription-tiers | Creator |
| `updateSubscriptionTier(tierId, dto)` | PUT | /api/subscription-tiers/:tierId | Creator |
| `deleteSubscriptionTier(tierId)` | DELETE | /api/subscription-tiers/:tierId | Creator |

### 類型定義

```typescript
interface CreateTierDto {
  name: string;
  description?: string;
  price: number;           // 以分為單位
  currency: string;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  benefits?: string[];
  isActive?: boolean;
}

interface UpdateTierDto {
  name?: string;
  description?: string;
  price?: number;
  benefits?: string[];
  isActive?: boolean;
}

interface SubscriptionTierDetail {
  tierId: string;
  creatorId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  benefits?: string[];
  isActive: boolean;
  subscribersCount: number;
  createdAt: string;
  updatedAt: string;
}
```

### 使用範例

```typescript
// 建立方案
const tier = await client.subscriptions.createSubscriptionTier({
  name: 'VIP',
  price: 999,         // $9.99
  currency: 'USD',
  billingPeriod: 'MONTHLY',
  benefits: ['專屬貼文', '優先回覆'],
});

// 更新方案
await client.subscriptions.updateSubscriptionTier(tier.tierId, {
  price: 1299,
});

// 刪除方案
await client.subscriptions.deleteSubscriptionTier(tier.tierId);
```

---

## Payment Service

**檔案**: `libs/api-client/src/payments.ts`

### 端點對照

| 方法 | HTTP | 端點 | 權限 |
|------|------|------|------|
| `purchaseDmAccess(targetUserId)` | POST | /api/dm-purchases | Auth |
| `updateTransaction(txnId, status, notes?)` | PUT | /api/transactions/:txnId | Admin |

### 類型定義

```typescript
type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

interface DmPurchase {
  purchaseId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

interface TransactionDetail {
  transactionId: string;
  userId: string;
  type: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

### 使用範例

```typescript
// 購買 DM 權限
const purchase = await client.payments.purchaseDmAccess('creator-user-id');

// Admin 處理退款
await client.payments.updateTransaction('txn_abc', 'REFUNDED', '使用者申請退款');
```

---

## Messaging Service

**檔案**: `libs/api-client/src/messaging.ts`

### 端點對照

| 方法 | HTTP | 端點 | 權限 |
|------|------|------|------|
| `getConversations()` | GET | /api/messaging/conversations | Auth |
| `getMessages(conversationId, cursor?)` | GET | /api/messaging/:id/messages | Auth |
| `sendMessage(dto)` | POST | /api/messaging/send | Auth |
| `sendBroadcast(dto)` | POST | /api/messaging/broadcast | Creator |
| `getBroadcasts(cursor?)` | GET | /api/messaging/broadcasts | Creator |

### 類型定義

```typescript
class SendBroadcastDto {
  message: string;
  mediaIds?: string[];
  recipientFilter?: 'ALL_SUBSCRIBERS' | 'TIER_SPECIFIC';
  tierIds?: string[];
}

interface BroadcastResultDto {
  broadcastId: string;
  recipientCount: number;
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';
  createdAt: string;
}

interface BroadcastDto {
  broadcastId: string;
  senderId: string;
  senderUsername: string;
  message: string;
  mediaUrls?: string[];
  recipientCount: number;
  deliveredCount: number;
  readCount: number;
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';
  createdAt: string;
}
```

### 使用範例

```typescript
// 發送廣播給所有訂閱者
const result = await client.messaging.sendBroadcast({
  message: '感謝大家的支持！',
  mediaIds: ['media-123'],
});

// 發送給特定訂閱層級
await client.messaging.sendBroadcast({
  message: 'VIP 專屬內容',
  recipientFilter: 'TIER_SPECIFIC',
  tierIds: ['tier-vip-123'],
});

// 取得廣播列表 (分頁)
const page1 = await client.messaging.getBroadcasts();
if (page1.hasMore && page1.cursor) {
  const page2 = await client.messaging.getBroadcasts(page1.cursor);
}
```

---

## Notification Service

**檔案**: `libs/api-client/src/notifications.ts`

### 端點對照

| 方法 | HTTP | 端點 | 權限 |
|------|------|------|------|
| `getAll()` | GET | /api/notifications | Auth |
| `markAsRead(notificationId)` | PUT | /api/notifications/:id/read | Auth |
| `markAllAsRead()` | PUT | /api/notifications/read-all | Auth |
| `sendNotification(dto)` | POST | /api/notifications/send | Admin |

### 類型定義

```typescript
class SendNotificationDto {
  type: 'SYSTEM' | 'ANNOUNCEMENT' | 'PROMOTION' | 'WARNING';
  title: string;
  message: string;
  targetUsers?: 'ALL' | 'CREATORS' | 'SUBSCRIBERS' | 'SPECIFIC';
  userIds?: string[];
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  actionUrl?: string;
  expiresAt?: string;
}

interface NotificationResultDto {
  notificationId: string;
  targetCount: number;
  status: 'QUEUED' | 'SENDING' | 'SENT';
  createdAt: string;
}
```

### 使用範例

```typescript
// Admin 發送系統公告
await client.notifications.sendNotification({
  type: 'ANNOUNCEMENT',
  title: '系統維護通知',
  message: '系統將於今晚 23:00 進行維護',
  targetUsers: 'ALL',
  priority: 'HIGH',
});

// 發送給特定使用者
await client.notifications.sendNotification({
  type: 'WARNING',
  title: '帳戶安全警告',
  message: '檢測到異常登入行為',
  targetUsers: 'SPECIFIC',
  userIds: ['user-123'],
  priority: 'URGENT',
  actionUrl: '/settings/security',
});
```

---

## 通用模式

### 分頁

所有列表 API 統一使用 cursor-based pagination：

```typescript
// 迭代所有頁
async function fetchAll<T>(
  fetchFn: (cursor?: string) => Promise<CursorPaginatedResponse<T>>
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await fetchFn(cursor);
    all.push(...page.data);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return all;
}
```

### 錯誤處理

```typescript
import { ApiError } from '@suggar-daddy/api-client';

try {
  await client.subscriptions.createSubscriptionTier(dto);
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400: // 參數錯誤
      case 401: // 未認證
      case 403: // 權限不足
      case 404: // 資源不存在
      case 429: // 請求過於頻繁
    }
  }
}
```

### 價格處理

所有金額以**分 (cents)** 為單位：

```typescript
// $9.99 -> 999
const priceInCents = Math.round(dollars * 100);
```

## 相關檔案

- API Client 原始碼: `libs/api-client/src/`
- DTO 類型定義: `libs/dto/src/`
- 分頁類型: `libs/dto/src/pagination.dto.ts`
