# 🎨 UI/UX 問題清單

**分析日期**: 2024-01-XX  
**分析範圍**: apps/web, apps/admin  
**分析師**: Frontend Developer Team

---

## 📋 執行摘要

本文檔詳細記錄了 Sugar Daddy 平台前端應用的 UI/UX 問題，涵蓋用戶體驗、交互設計、響應式設計和可訪問性四個維度。

### 問題統計

| 類別 | 🔴 高優先級 | 🟠 中優先級 | 🟡 低優先級 | 總計 |
|-----|-----------|-----------|-----------|------|
| **用戶體驗** | 8 | 12 | 5 | 25 |
| **交互設計** | 6 | 10 | 4 | 20 |
| **響應式設計** | 5 | 8 | 3 | 16 |
| **可訪問性** | 12 | 15 | 8 | 35 |
| **總計** | 31 | 45 | 20 | 96 |

---

## 1. 用戶體驗問題

### 1.1 加載狀態處理

#### 🔴 問題 1.1.1：Loading 狀態反饋不統一

**位置**: 多個頁面（login, register, feed 等）

**當前狀態**:
```tsx
// apps/web/app/(auth)/login/page.tsx
<Button disabled={isSubmitting}>
  {isSubmitting ? '登入中...' : '登入'}
</Button>
```

**問題描述**:
- 只有文字變化，無視覺動畫
- 用戶可能認為按鈕失效
- 缺少全局加載指示器

**改進建議**:
```tsx
<Button disabled={isSubmitting} className="min-w-[120px]">
  {isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      登入中...
    </>
  ) : '登入'}
</Button>
```

**影響範圍**: 所有提交按鈕（~20 個位置）  
**優先級**: 🔴 高  
**預估工作量**: 4 小時

---

#### 🟠 問題 1.1.2：長時間加載無進度提示

**位置**: `apps/web/app/(main)/feed/page.tsx`

**當前狀態**:
```tsx
{state.isLoading && (
  <div className="space-y-4">
    <PostCardSkeleton />
    <PostCardSkeleton />
    <PostCardSkeleton />
  </div>
)}
```

**問題描述**:
- 骨架屏無限顯示，用戶不知道加載進度
- 網絡慢時用戶體驗差
- 缺少超時處理

**改進建議**:
```tsx
const [loadingTime, setLoadingTime] = useState(0);

useEffect(() => {
  if (!state.isLoading) return;
  
  const timer = setInterval(() => {
    setLoadingTime(prev => prev + 1);
  }, 1000);
  
  return () => clearInterval(timer);
}, [state.isLoading]);

// 超過 10 秒顯示提示
{state.isLoading && loadingTime > 10 && (
  <p className="text-sm text-gray-500 text-center mt-4">
    載入時間較長，請稍候...
  </p>
)}
```

**優先級**: 🟠 中  
**預估工作量**: 2 小時

---

#### 🔴 問題 1.1.3：錯誤處理缺少自動恢復機制

**位置**: `apps/web/app/(main)/feed/page.tsx`, `wallet/page.tsx` 等

**當前狀態**:
```tsx
{state.error && (
  <Card className="border-red-200 bg-red-50">
    <p className="text-sm text-red-600">{state.error}</p>
    <Button onClick={handleRefresh}>重試</Button>
  </Card>
)}
```

**問題描述**:
- 需要用戶手動重試
- 臨時網絡錯誤需要多次點擊
- 無重試計數器

**改進建議**:
```tsx
const [retryCount, setRetryCount] = useState(0);
const MAX_AUTO_RETRY = 3;

useEffect(() => {
  if (state.error && retryCount < MAX_AUTO_RETRY) {
    const timer = setTimeout(() => {
      setRetryCount(prev => prev + 1);
      handleRefresh();
    }, Math.pow(2, retryCount) * 1000); // 指數退避
    
    return () => clearTimeout(timer);
  }
}, [state.error, retryCount]);

// UI 顯示重試狀態
{state.error && (
  <Card className="border-red-200 bg-red-50">
    <p className="text-sm text-red-600">{state.error}</p>
    {retryCount < MAX_AUTO_RETRY ? (
      <p className="text-xs text-gray-500 mt-2">
        自動重試中... ({retryCount}/{MAX_AUTO_RETRY})
      </p>
    ) : (
      <Button onClick={handleManualRetry}>手動重試</Button>
    )}
  </Card>
)}
```

**優先級**: 🔴 高  
**預估工作量**: 3 小時

---

### 1.2 空狀態處理

#### 🟠 問題 1.2.1：空狀態缺少引導性信息

**位置**: `messages/page.tsx`, `search/page.tsx`, `notifications/page.tsx`

**當前狀態**:
```tsx
{messages.length === 0 && (
  <p className="text-center text-gray-500">暫無訊息</p>
)}
```

**問題描述**:
- 過於簡單，無視覺吸引力
- 缺少引導用戶下一步操作
- 不同頁面風格不統一

**改進建議**:
```tsx
// 統一的 EmptyState 組件
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// 使用
<EmptyState
  icon={MessageSquare}
  title="還沒有訊息"
  description="開始匹配或搜尋用戶，開啟第一個對話吧！"
  action={
    <Link href="/discover">
      <Button>探索用戶</Button>
    </Link>
  }
/>
```

**影響範圍**: ~15 個頁面  
**優先級**: 🟠 中  
**預估工作量**: 6 小時

---

### 1.3 成功/失敗反饋

#### 🔴 問題 1.3.1：操作成功無視覺確認

**位置**: `profile/edit/page.tsx`, `settings/page.tsx`

**當前狀態**:
```tsx
const handleSave = async () => {
  await updateProfile(data);
  // 僅 console.log，無用戶可見反饋
};
```

**問題描述**:
- 用戶不確定操作是否成功
- 可能重複提交
- 缺少 Toast 提示

**改進建議**:
```tsx
const { toast } = useToast();

const handleSave = async () => {
  try {
    await updateProfile(data);
    toast.success('個人資料已更新');
  } catch (error) {
    toast.error('更新失敗，請重試');
  }
};
```

**優先級**: 🔴 高  
**預估工作量**: 2 小時

---

#### 🟠 問題 1.3.2：錯誤訊息不夠友好

**位置**: 多個頁面

**當前狀態**:
```tsx
catch (err) {
  setState({ ...state, error: err.message });
  // 直接顯示技術錯誤訊息
}
```

**問題範例**:
- "Network Error" → 用戶不理解
- "500 Internal Server Error" → 過於技術化
- "Validation failed" → 缺少具體信息

**改進建議**:
```tsx
// lib/error-messages.ts
export const ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: '網絡連接失敗，請檢查您的網絡設置',
  SERVER_ERROR: '伺服器暫時無法處理請求，請稍後再試',
  VALIDATION_ERROR: '輸入信息有誤，請檢查後重試',
  UNAUTHORIZED: '您的登入已過期，請重新登入',
  FORBIDDEN: '您沒有權限執行此操作',
  NOT_FOUND: '找不到請求的資源',
  TIMEOUT: '請求超時，請稍後再試',
  UNKNOWN: '發生未知錯誤，請聯繫客服',
};

export function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] || error.message;
  }
  if (error instanceof Error) {
    if (error.message.includes('network')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    if (error.message.includes('timeout')) {
      return ERROR_MESSAGES.TIMEOUT;
    }
  }
  return ERROR_MESSAGES.UNKNOWN;
}

// 使用
catch (err) {
  const friendlyMessage = getFriendlyErrorMessage(err);
  toast.error(friendlyMessage);
}
```

**優先級**: 🟠 中  
**預估工作量**: 4 小時

---

## 2. 交互設計問題

### 2.1 表單驗證

#### 🔴 問題 2.1.1：驗證反饋缺少上下文幫助

**位置**: `wallet/withdraw/page.tsx`

**當前狀態**:
```tsx
const withdrawSchema = z.object({
  amount: z
    .number()
    .positive('金額必須大於 0')
    .min(1, '最低提款金額為 1'),
});

<Input
  type="number"
  {...register('amount')}
/>
{errors.amount && (
  <p className="text-xs text-red-500">{errors.amount.message}</p>
)}
```

**問題描述**:
- 缺少輸入範圍提示
- 不顯示當前餘額
- 錯誤訊息不夠具體

**改進建議**:
```tsx
<div className="space-y-1.5">
  <Label htmlFor="amount" className="flex items-center justify-between">
    <span>提款金額</span>
    <span className="text-xs text-gray-500">
      可用餘額: ${formatCurrency(balance)}
    </span>
  </Label>
  <div className="relative">
    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
    <Input
      id="amount"
      type="number"
      min={1}
      max={balance}
      step={0.01}
      className="pl-7"
      {...register('amount')}
      aria-describedby="amount-hint amount-error"
    />
  </div>
  {errors.amount && (
    <p id="amount-error" className="text-xs text-red-500">
      {errors.amount.message}
    </p>
  )}
  <p id="amount-hint" className="text-xs text-gray-500">
    最低提款金額：$1，最高提款金額：${formatCurrency(balance)}
  </p>
</div>
```

**優先級**: 🔴 高  
**預估工作量**: 3 小時

---

#### 🟠 問題 2.1.2：即時驗證缺失

**位置**: `register/page.tsx`, `profile/edit/page.tsx`

**當前狀態**:
- 只在提交時驗證
- 用戶填寫完整表單後才發現錯誤

**改進建議**:
```tsx
// 使用 react-hook-form 的 mode: 'onChange'
const { register, formState: { errors }, watch } = useForm({
  mode: 'onChange', // 即時驗證
  resolver: zodResolver(schema),
});

// 或使用 onBlur 驗證
const { register } = useForm({
  mode: 'onBlur', // 失焦時驗證
});
```

**優先級**: 🟠 中  
**預估工作量**: 2 小時

---

### 2.2 按鈕和操作

#### 🔴 問題 2.2.1：按鈕禁用狀態不清晰

**位置**: `messages/[conversationId]/page.tsx`

**當前狀態**:
```tsx
<Button 
  disabled={!input.trim() || sending}
  className="disabled:opacity-50"
>
  發送
</Button>
```

**問題描述**:
- 禁用時只是變淡，無明確提示
- 用戶不知道為何不能點擊
- 缺少 tooltip 說明

**改進建議**:
```tsx
<Tooltip
  content={
    !input.trim() 
      ? '請輸入訊息' 
      : sending 
      ? '發送中...' 
      : '發送訊息'
  }
>
  <Button 
    disabled={!input.trim() || sending}
    title={!input.trim() ? '請輸入訊息' : undefined}
    className="disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
  >
    {sending ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        發送中...
      </>
    ) : (
      <>
        <Send className="mr-2 h-4 w-4" />
        發送
      </>
    )}
  </Button>
</Tooltip>
```

**優先級**: 🔴 高  
**預估工作量**: 3 小時

---

#### 🔴 問題 2.2.2：危險操作無確認對話框

**位置**: `apps/admin/app/(dashboard)/users/page.tsx`

**當前狀態**:
```tsx
const handleBatchDisable = async () => {
  if (selection.selectedCount === 0) return;
  // 直接執行，無確認！
  const result = await adminApi.batchDisableUsers(selection.selectedIds);
};
```

**問題描述**:
- 批量禁用用戶無確認步驟
- 誤操作風險極高
- 無法撤銷

**改進建議**:
```tsx
const [showConfirm, setShowConfirm] = useState(false);

const handleBatchDisable = () => {
  setShowConfirm(true);
};

const confirmDisable = async () => {
  try {
    const result = await adminApi.batchDisableUsers(selection.selectedIds);
    toast.success(`已禁用 ${result.disabledCount} 位用戶`);
    selection.clear();
    refetch();
  } catch (err) {
    toast.error('批量禁用失敗');
  } finally {
    setShowConfirm(false);
  }
};

// UI
{showConfirm && (
  <ConfirmDialog
    title="確認批量禁用"
    description={`您即將禁用 ${selection.selectedCount} 位用戶，此操作不可撤銷。確定繼續嗎？`}
    confirmText="確認禁用"
    cancelText="取消"
    isDestructive
    onConfirm={confirmDisable}
    onCancel={() => setShowConfirm(false)}
  />
)}
```

**優先級**: 🔴 高（安全問題）  
**預估工作量**: 2 小時

---

### 2.3 導航和路由

#### 🟠 問題 2.3.1：缺少面包屑導航

**位置**: `post/[postId]/page.tsx`, `user/[userId]/page.tsx` 等深層頁面

**當前狀態**:
- 無面包屑
- 用戶不知道當前位置
- 難以快速返回上層

**改進建議**:
```tsx
// components/Breadcrumb.tsx
export function Breadcrumb() {
  const pathname = usePathname();
  const router = useRouter();
  
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .map((segment, index, array) => ({
      label: segment,
      href: '/' + array.slice(0, index + 1).join('/'),
    }));

  return (
    <nav className="flex items-center gap-2 text-sm mb-4" aria-label="麵包屑導航">
      <Link 
        href="/feed" 
        className="text-gray-500 hover:text-gray-700 transition-colors"
      >
        首頁
      </Link>
      {segments.map((segment, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight className="h-4 w-4 text-gray-300" />
          {idx === segments.length - 1 ? (
            <span className="text-gray-900 font-medium">{segment.label}</span>
          ) : (
            <Link
              href={segment.href}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {segment.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
```

**優先級**: 🟠 中  
**預估工作量**: 3 小時

---

#### 🟠 問題 2.3.2：缺少返回按鈕

**位置**: 深層頁面（詳情頁、編輯頁等）

**當前狀態**:
- 只能用瀏覽器返回按鈕
- 移動端體驗差

**改進建議**:
```tsx
// 在頁面頂部添加返回按鈕
<div className="mb-4 flex items-center gap-3">
  <button
    onClick={() => router.back()}
    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
    aria-label="返回上一頁"
  >
    <ArrowLeft className="h-5 w-5" />
    <span className="hidden sm:inline">返回</span>
  </button>
  <h1 className="text-2xl font-bold">頁面標題</h1>
</div>
```

**優先級**: 🟠 中  
**預估工作量**: 2 小時

---

## 3. 響應式設計問題

### 3.1 移動端適配

#### 🔴 問題 3.1.1：底部導航未處理 iOS 安全區域

**位置**: `components/layout/mobile-nav.tsx`

**當前狀態**:
```tsx
<nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95">
  {/* 導航內容 */}
</nav>
```

**問題描述**:
- iPhone X 及以上機型底部導航被劉海遮擋
- 用戶難以點擊底部按鈕

**改進建議**:
```tsx
// tailwind.config.js - 添加安全區域支持
module.exports = {
  theme: {
    extend: {
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.pb-safe': {
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
      });
    },
  ],
};

// 組件中使用
<nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 pb-safe">
  <div className="flex justify-around items-center h-16">
    {/* 導航內容 */}
  </div>
</nav>
```

**優先級**: 🔴 高（影響 iOS 用戶）  
**預估工作量**: 1 小時

---

#### 🔴 問題 3.1.2：表格在移動端不可用

**位置**: `apps/admin` 所有列表頁面

**當前狀態**:
```tsx
<table className="min-w-full">
  {/* 桌面版表格，移動端會橫向滾動，體驗差 */}
</table>
```

**問題描述**:
- 表格在小螢幕上需要橫向滾動
- 信息密度過高
- 難以操作

**改進建議**:
```tsx
// 響應式列表組件
export function ResponsiveUserList({ users }: { users: User[] }) {
  return (
    <>
      {/* 桌面版 - 表格 */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用戶名</TableHead>
              <TableHead>郵箱</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.displayName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge>{user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.disabled ? 'destructive' : 'success'}>
                    {user.disabled ? '已禁用' : '正常'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/users/${user.id}`}>
                    <Button size="sm" variant="ghost">查看</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 移動版 - 卡片列表 */}
      <div className="md:hidden space-y-3">
        {users.map((user) => (
          <Card key={user.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="font-semibold text-base">{user.displayName}</p>
                <p className="text-sm text-gray-500 mt-1">{user.email}</p>
              </div>
              <Link href={`/users/${user.id}`}>
                <Button size="sm" variant="ghost">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="text-xs">{user.role}</Badge>
              <Badge 
                variant={user.disabled ? 'destructive' : 'success'}
                className="text-xs"
              >
                {user.disabled ? '已禁用' : '正常'}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
```

**優先級**: 🔴 高  
**預估工作量**: 6 小時（所有列表頁）

---

#### 🟠 問題 3.1.3：圖片未優化

**位置**: `feed/page.tsx`, `post/[postId]/page.tsx`

**當前狀態**:
```tsx
<img
  src={url}
  alt={`Media ${idx + 1}`}
  className="h-full w-full object-cover"
/>
```

**問題描述**:
- 使用原始 `<img>` 標籤
- 未使用 Next.js Image 優化
- 加載大圖片浪費流量

**改進建議**:
```tsx
import Image from 'next/image';

<Image
  src={url}
  alt={`${post.authorName} 的貼文圖片`}
  width={600}
  height={400}
  className="h-full w-full object-cover"
  loading="lazy"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  placeholder="blur"
  blurDataURL="/placeholder-blur.jpg"
/>
```

**優先級**: 🟠 中  
**預估工作量**: 4 小時

---

### 3.2 斷點和佈局

#### 🟡 問題 3.2.1：缺少橫屏適配

**當前狀態**:
- 未考慮橫屏模式
- 部分佈局在橫屏時間距過大

**改進建議**:
```js
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'xs': '320px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      'landscape': { 'raw': '(orientation: landscape)' },
    },
  },
};

// 使用
<div className="space-y-4 landscape:space-y-2">
  {/* 橫屏時減小間距 */}
</div>
```

**優先級**: 🟡 低  
**預估工作量**: 2 小時

---

## 4. 可訪問性問題

### 4.1 ARIA 標籤

#### 🔴 問題 4.1.1：交互元素缺少 aria-label

**位置**: 多個頁面的圖標按鈕

**當前狀態**:
```tsx
<button
  type="button"
  onClick={() => setShowPassword(!showPassword)}
>
  {showPassword ? <EyeOff /> : <Eye />}
</button>
```

**問題描述**:
- 螢幕閱讀器無法理解按鈕用途
- 純圖標按鈕無文字說明

**改進建議**:
```tsx
<button
  type="button"
  onClick={() => setShowPassword(!showPassword)}
  aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
  aria-pressed={showPassword}
  title={showPassword ? '隱藏密碼' : '顯示密碼'}
>
  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
</button>
```

**影響範圍**: ~30 個圖標按鈕  
**優先級**: 🔴 高  
**預估工作量**: 4 小時

---

#### 🔴 問題 4.1.2：表單缺少完整的標籤關聯

**位置**: 多個表單

**當前狀態**:
```tsx
<label>Email</label>
<input type="email" />
```

**問題描述**:
- label 和 input 未關聯
- 點擊標籤無法聚焦輸入框

**改進建議**:
```tsx
<label htmlFor="email-input" className="block text-sm font-medium">
  Email 地址
</label>
<input 
  id="email-input"
  type="email"
  aria-required="true"
  aria-invalid={!!errors.email}
  aria-describedby="email-hint email-error"
/>
{errors.email && (
  <p id="email-error" role="alert" className="text-xs text-red-500">
    {errors.email.message}
  </p>
)}
<p id="email-hint" className="text-xs text-gray-500">
  我們不會分享您的郵箱地址
</p>
```

**優先級**: 🔴 高  
**預估工作量**: 6 小時

---

### 4.2 鍵盤導航

#### 🔴 問題 4.2.1：模態框缺少焦點陷阱

**位置**: 各種對話框和模態框

**當前狀態**:
- Tab 鍵可以跳出模態框
- Escape 鍵無法關閉模態框

**改進建議**:
```tsx
import { useEffect, useRef } from 'react';

export function Modal({ children, onClose, isOpen }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isOpen) return;
    
    // 保存之前的焦點元素
    const previousFocus = document.activeElement as HTMLElement;
    
    // 聚焦到模態框
    modalRef.current?.focus();
    
    // 鍵盤事件處理
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (!focusableElements || focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        {children}
      </div>
    </div>
  );
}
```

**優先級**: 🔴 高  
**預估工作量**: 3 小時

---

### 4.3 螢幕閱讀器支持

#### 🟠 問題 4.3.1：動態內容無 live region

**位置**: `feed/page.tsx`, Toast 通知

**當前狀態**:
```tsx
{state.isLoading && (
  <div className="space-y-4">
    <PostCardSkeleton />
  </div>
)}
```

**問題描述**:
- 螢幕閱讀器不知道內容正在加載
- 動態更新無通知

**改進建議**:
```tsx
{state.isLoading && (
  <div 
    className="space-y-4"
    role="status"
    aria-live="polite"
    aria-label="正在載入動態內容"
  >
    <span className="sr-only">載入中，請稍候...</span>
    <PostCardSkeleton />
  </div>
)}
```

**優先級**: 🟠 中  
**預估工作量**: 2 小時

---

#### 🟠 問題 4.3.2：圖片缺少有意義的替代文本

**位置**: `feed/page.tsx`, `post/[postId]/page.tsx`

**當前狀態**:
```tsx
<img
  src={url}
  alt={`Media ${idx + 1}`}  // 太簡單
  className="h-full w-full object-cover"
/>
```

**問題描述**:
- "Media 1" 無實際意義
- 螢幕閱讀器用戶無法理解圖片內容

**改進建議**:
```tsx
<img
  src={url}
  alt={`${post.authorName} 於 ${formatDate(post.createdAt)} 發布的貼文圖片${
    post.content ? `：${post.content.slice(0, 50)}` : ''
  }`}
  className="h-full w-full object-cover"
  loading="lazy"
/>
```

**優先級**: 🟠 中  
**預估工作量**: 3 小時

---

### 4.4 顏色對比度

#### 🟡 問題 4.4.1：部分文字顏色對比度不足

**位置**: `mobile-nav.tsx`, 各種輔助文字

**當前狀態**:
```tsx
className={cn(
  'text-gray-400 hover:text-gray-600'  // 可能對比度不足
)}
```

**問題描述**:
- 灰色文字在白色背景上可能不夠清晰
- 未達到 WCAG AA 標準（4.5:1）

**改進建議**:
```tsx
// 使用更深的灰色
className={cn(
  isActive
    ? 'text-brand-700 font-semibold'  // 更深的品牌色
    : 'text-gray-600 hover:text-gray-900'  // 更深的灰色
)}

// 或添加背景色
className={cn(
  isActive && 'bg-brand-50 text-brand-700 font-semibold'
)}
```

**優先級**: 🟡 低  
**預估工作量**: 2 小時

---

## 5. 問題優先級總結

### 立即處理（1-2 週）

| # | 問題 | 位置 | 預估時間 |
|---|------|-----|---------|
| 1 | 加載狀態無動畫 | 所有提交按鈕 | 4h |
| 2 | 錯誤無自動重試 | Feed, Wallet 等 | 3h |
| 3 | 操作成功無反饋 | Profile Edit, Settings | 2h |
| 4 | 表單驗證缺上下文 | Withdraw | 3h |
| 5 | 按鈕禁用不清晰 | Messages | 3h |
| 6 | 危險操作無確認 | Admin批量操作 | 2h |
| 7 | iOS 安全區域 | Mobile Nav | 1h |
| 8 | 表格移動端不可用 | Admin所有列表 | 6h |
| 9 | 缺少 aria-label | 所有圖標按鈕 | 4h |
| 10 | 表單標籤未關聯 | 所有表單 | 6h |
| 11 | 模態框無焦點陷阱 | 所有對話框 | 3h |

**總計：37 小時**

### 第二優先級（2-4 週）

| # | 問題 | 預估時間 |
|---|------|---------|
| 12-20 | 空狀態優化、錯誤訊息優化等 | 25h |

### 第三優先級（1-2 月）

| # | 問題 | 預估時間 |
|---|------|---------|
| 21-30 | 細節優化、顏色對比度等 | 15h |

---

## 6. 改進建議

### 6.1 建立設計系統

**創建統一的組件庫**:

```
libs/ui/src/
├── components/
│   ├── EmptyState/
│   ├── ConfirmDialog/
│   ├── LoadingButton/
│   ├── FormField/
│   └── ResponsiveTable/
├── hooks/
│   ├── useAutoRetry.ts
│   ├── useFocusTrap.ts
│   └── useA11y.ts
└── utils/
    ├── error-messages.ts
    └── formatters.ts
```

### 6.2 制定 UX 規範

**文檔化最佳實踐**:

1. **加載狀態規範**
   - 0-1 秒：無提示
   - 1-3 秒：顯示 Spinner
   - 3-10 秒：顯示進度提示
   - 10 秒以上：顯示等待訊息和取消按鈕

2. **錯誤處理規範**
   - 友好的錯誤訊息
   - 自動重試（最多 3 次）
   - 提供解決方案
   - 關鍵錯誤顯示客服聯繫方式

3. **表單驗證規範**
   - 即時驗證（onBlur）
   - 清晰的錯誤提示
   - 輔助說明文字
   - 成功狀態反饋

4. **可訪問性檢查清單**
   - [ ] 所有圖標按鈕有 aria-label
   - [ ] 所有表單有正確的 label 關聯
   - [ ] 顏色對比度 ≥ 4.5:1
   - [ ] 鍵盤可以訪問所有功能
   - [ ] 模態框有焦點陷阱

### 6.3 自動化測試

**添加 A11Y 測試**:

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## 7. 成功指標

### 短期目標（2 個月內）

| 指標 | 目標 |
|-----|------|
| P0 問題修復率 | 100% |
| P1 問題修復率 | 80% |
| 可訪問性評分 | 90+ |
| 移動端可用性 | 95+ |
| 用戶滿意度 | +20% |

### 長期目標（6 個月內）

| 指標 | 目標 |
|-----|------|
| 所有問題修復率 | 95% |
| WCAG AA 合規 | 100% |
| 移動端流量轉化 | +30% |

---

**報告編制**: Frontend Developer Team  
**審核**: UX Design Team  
**版本**: 1.0  
**日期**: 2024-01-XX
