# User Service API 快速使用指南

## 📦 安裝與初始化

```typescript
import { ApiClient, UsersApi } from '@suggar-daddy/api-client';

// 初始化 API 客戶端
const apiClient = new ApiClient({
  baseURL: 'https://api.suggar-daddy.com',
  token: 'your-auth-token', // 可選
});

const usersApi = apiClient.users;
```

## 🔍 P0 - 搜尋與推薦

### 1. 搜尋用戶

```typescript
// 基本搜尋
const users = await usersApi.searchUsers('john');

// 限制結果數量
const topUsers = await usersApi.searchUsers('creator', 5);

// 處理結果
users.forEach(user => {
  console.log(`${user.displayName} (@${user.username})`);
  if (user.isVerified) {
    console.log('✓ 已驗證');
  }
});
```

### 2. 推薦創作者

```typescript
// 獲取推薦創作者
const creators = await usersApi.getRecommendedCreators(10);

// 過濾已驗證的創作者
const verifiedCreators = creators.filter(c => c.isVerified);
```

## 👥 P0 - 追蹤系統

### 3. 獲取粉絲列表

```typescript
// 獲取第一頁粉絲
const page1 = await usersApi.getFollowers('user-id');
console.log(`共 ${page1.data.length} 位粉絲`);

// 無限滾動實作
async function loadAllFollowers(userId: string) {
  const followers: UserCard[] = [];
  let cursor: string | undefined;
  
  do {
    const page = await usersApi.getFollowers(userId, cursor);
    followers.push(...page.data);
    cursor = page.cursor;
  } while (page.hasMore);
  
  return followers;
}
```

### 4. 獲取追蹤列表

```typescript
// 獲取我追蹤的人
const following = await usersApi.getFollowing('my-user-id');

// React 組件範例
function FollowingList({ userId }: { userId: string }) {
  const [following, setFollowing] = useState<UserCard[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [hasMore, setHasMore] = useState(true);
  
  const loadMore = async () => {
    const page = await usersApi.getFollowing(userId, cursor);
    setFollowing([...following, ...page.data]);
    setCursor(page.cursor);
    setHasMore(page.hasMore);
  };
  
  return (
    <div>
      {following.map(user => <UserCard key={user.userId} user={user} />)}
      {hasMore && <button onClick={loadMore}>載入更多</button>}
    </div>
  );
}
```

### 5. 檢查追蹤狀態

```typescript
// 檢查與特定用戶的關係
const status = await usersApi.getFollowStatus('target-user-id');

if (status.isFollowing && status.isFollowedBy) {
  console.log('互相追蹤');
} else if (status.isFollowing) {
  console.log('我追蹤了對方');
} else if (status.isFollowedBy) {
  console.log('對方追蹤了我');
} else {
  console.log('無追蹤關係');
}

// UI 按鈕文字決定
function getFollowButtonText(status: FollowStatus): string {
  if (status.isFollowing) {
    return status.isFollowedBy ? '互相追蹤' : '取消追蹤';
  }
  return status.isFollowedBy ? '回追' : '追蹤';
}
```

## 🚀 P1 - 進階功能

### 6. 批量查詢用戶卡片

```typescript
// 批量獲取用戶資訊
const userIds = ['user1', 'user2', 'user3', 'user4'];
const users = await usersApi.getUserCardsByIds(userIds);

// 建立用戶 ID 到用戶資料的映射
const userMap = new Map(users.map(u => [u.userId, u]));

// 使用範例：顯示點讚用戶列表
async function showLikeUsers(likeUserIds: string[]) {
  const users = await usersApi.getUserCardsByIds(likeUserIds);
  return users.map(u => ({
    avatar: u.avatarUrl,
    name: u.displayName || u.username,
  }));
}
```

### 7. 創建用戶（管理員功能）

```typescript
// ⚠️ 此功能僅限管理員
try {
  const newUser = await usersApi.createUser({
    email: 'newcreator@example.com',
    username: 'amazing_creator',
    password: 'SecureP@ssw0rd123',
    role: 'CREATOR',
    displayName: 'Amazing Creator',
  });
  
  console.log('用戶創建成功:', newUser.userId);
} catch (error) {
  if (error.status === 403) {
    console.error('權限不足：僅限管理員');
  }
}

// 管理後台批量導入
async function bulkImportUsers(csvData: any[]) {
  const results = [];
  
  for (const row of csvData) {
    try {
      const user = await usersApi.createUser({
        email: row.email,
        username: row.username,
        password: generateRandomPassword(),
        role: row.role,
        displayName: row.displayName,
      });
      results.push({ success: true, userId: user.userId });
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }
  
  return results;
}
```

### 8. 設定 DM 價格（創作者功能）

```typescript
// ⚠️ 此功能僅限創作者
// 設定 DM 價格為 $5.99 (599 美分)
await usersApi.setDmPrice(599);

// 設為免費
await usersApi.setDmPrice(0);

// 創作者設定頁面範例
function DmPriceSettings() {
  const [price, setPrice] = useState(0);
  
  const handleSave = async () => {
    try {
      const priceInCents = Math.round(price * 100);
      await usersApi.setDmPrice(priceInCents);
      alert('DM 價格設定成功！');
    } catch (error) {
      if (error.status === 403) {
        alert('僅限創作者可設定 DM 價格');
      }
    }
  };
  
  return (
    <div>
      <label>DM 價格（美元）</label>
      <input
        type="number"
        value={price}
        onChange={(e) => setPrice(parseFloat(e.target.value))}
        min="0"
        step="0.01"
      />
      <p>設為 $0 表示免費 DM</p>
      <button onClick={handleSave}>儲存</button>
    </div>
  );
}
```

## 🎯 React Query 整合

```typescript
import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';

// 搜尋用戶
function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: () => usersApi.searchUsers(query, 20),
    enabled: query.length > 0,
  });
}

// 無限滾動粉絲列表
function useFollowers(userId: string) {
  return useInfiniteQuery({
    queryKey: ['users', userId, 'followers'],
    queryFn: ({ pageParam }) => usersApi.getFollowers(userId, pageParam),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.cursor : undefined,
  });
}

// 追蹤狀態
function useFollowStatus(targetId: string) {
  return useQuery({
    queryKey: ['users', 'followStatus', targetId],
    queryFn: () => usersApi.getFollowStatus(targetId),
  });
}

// 設定 DM 價格
function useSetDmPrice() {
  return useMutation({
    mutationFn: (price: number) => usersApi.setDmPrice(price),
    onSuccess: () => {
      // 刷新用戶資料
      queryClient.invalidateQueries(['users', 'me']);
    },
  });
}
```

## 💡 實用技巧

### 用戶搜尋防抖

```typescript
import { useDebouncedValue } from '@/hooks/useDebounce';

function UserSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  
  const { data: users, isLoading } = useQuery({
    queryKey: ['users', 'search', debouncedQuery],
    queryFn: () => usersApi.searchUsers(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });
  
  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="搜尋用戶..."
    />
  );
}
```

### 追蹤按鈕組件

```typescript
function FollowButton({ targetUserId }: { targetUserId: string }) {
  const { data: status, refetch } = useFollowStatus(targetUserId);
  const followMutation = useMutation({
    mutationFn: () => api.follow(targetUserId),
    onSuccess: () => refetch(),
  });
  
  if (!status) return null;
  
  return (
    <button
      onClick={() => followMutation.mutate()}
      disabled={followMutation.isLoading}
    >
      {status.isFollowing ? '取消追蹤' : '追蹤'}
      {status.isFollowedBy && ' (回追)'}
    </button>
  );
}
```

## 🐛 錯誤處理

```typescript
try {
  const users = await usersApi.searchUsers('test');
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        console.error('請求參數錯誤');
        break;
      case 401:
        console.error('未登入');
        // 跳轉到登入頁
        break;
      case 403:
        console.error('權限不足');
        break;
      case 429:
        console.error('請求過於頻繁，請稍後再試');
        break;
      case 500:
        console.error('伺服器錯誤');
        break;
      default:
        console.error('未知錯誤:', error.message);
    }
  }
}
```

## 📝 類型安全使用

```typescript
// TypeScript 完整類型推導
import type { UserCard, FollowStatus } from '@suggar-daddy/api-client';

// 類型守衛
function isCreator(user: UserCard): boolean {
  return user.role === 'CREATOR';
}

// 類型斷言
const creators = users.filter(isCreator);

// 泛型使用
async function getPaginatedData<T>(
  fetchFn: (cursor?: string) => Promise<CursorPaginatedResponse<T>>
): Promise<T[]> {
  const allData: T[] = [];
  let cursor: string | undefined;
  
  do {
    const page = await fetchFn(cursor);
    allData.push(...page.data);
    cursor = page.cursor;
  } while (cursor);
  
  return allData;
}

// 使用範例
const allFollowers = await getPaginatedData(
  (cursor) => usersApi.getFollowers('user-id', cursor)
);
```

---

**🎉 所有 API 都支援完整的 TypeScript 類型推導！**

更多詳細資訊請參考：`USER_SERVICE_API_IMPLEMENTATION.md`
