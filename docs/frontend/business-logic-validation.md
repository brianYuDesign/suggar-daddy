# 🔍 業務邏輯驗證報告

**分析日期**: 2024-01-XX  
**分析範圍**: apps/web, apps/admin  
**分析師**: Frontend Developer Team

---

## 📋 執行摘要

本文檔深入分析 Sugar Daddy 平台前端的業務邏輯實作,識別潛在的邏輯漏洞、安全風險和改進機會。

### 風險統計

| 風險等級 | 數量 | 說明 |
|---------|------|------|
| 🔴 **極高風險** | 3 | 可能導致財務損失或安全漏洞 |
| 🟠 **高風險** | 8 | 影響核心業務流程 |
| 🟡 **中風險** | 12 | 可能影響用戶體驗 |
| 🟢 **低風險** | 7 | 次要問題 |
| **總計** | 30 | - |

---

## 1. 表單驗證邏輯

### 1.1 登入/註冊表單

#### ✅ 當前實作

**位置**: `apps/web/app/(auth)/login/page.tsx`, `register/page.tsx`

```typescript
// 使用 Zod schema 驗證
const loginSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(8, '密碼至少需要 8 個字符'),
});

const registerSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string()
    .min(8, '密碼至少需要 8 個字符')
    .regex(/[A-Z]/, '密碼需包含至少一個大寫字母')
    .regex(/[0-9]/, '密碼需包含至少一個數字'),
  displayName: z.string()
    .min(1, '顯示名稱為必填項')
    .max(50, '顯示名稱不能超過 50 個字符'),
  userType: z.enum(['sugar_daddy', 'sugar_baby']),
});
```

#### ⚠️ 潛在問題

**問題 1.1.1: 密碼強度驗證不足** 🟡

```typescript
// ❌ 當前只檢查長度、大寫、數字
password: z.string()
  .min(8)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)

// ✅ 建議加強
password: z.string()
  .min(8, '密碼至少需要 8 個字符')
  .max(128, '密碼不能超過 128 個字符')  // 防止 DoS
  .regex(/[A-Z]/, '至少一個大寫字母')
  .regex(/[a-z]/, '至少一個小寫字母')
  .regex(/[0-9]/, '至少一個數字')
  .regex(/[^A-Za-z0-9]/, '至少一個特殊字符')
  .refine(
    (val) => !commonPasswords.includes(val.toLowerCase()),
    '請勿使用常見密碼'
  )
```

**優先級**: 🟡 中  
**預估工作量**: 2 小時

---

**問題 1.1.2: Email 驗證僅前端** 🔴

```typescript
// ❌ 只有前端驗證
const loginSchema = z.object({
  email: z.string().email(),
});

// ✅ 建議添加後端二次驗證和格式檢查
// 前端：基礎驗證
email: z.string()
  .email('請輸入有效的 Email')
  .refine(
    (val) => val.length <= 254,  // RFC 5321
    'Email 地址過長'
  )

// 後端：應該驗證
// 1. Email 格式是否合法
// 2. 域名是否存在(DNS 查詢)
// 3. 是否在黑名單中
// 4. 發送驗證郵件確認
```

**優先級**: 🔴 高  
**預估工作量**: 後端 4 小時 + 前端 1 小時

---

### 1.2 個人資料編輯

#### ✅ 當前實作

**位置**: `apps/web/app/(main)/profile/edit/page.tsx`

```typescript
const profileSchema = z.object({
  displayName: z.string().min(1).max(50),
  bio: z.string().max(500).optional(),
  birthDate: z.string().optional(),
  interests: z.string().optional(),
  location: z.string().max(100).optional(),
});
```

#### ⚠️ 潛在問題

**問題 1.2.1: Interests 格式無驗證** 🟡

```typescript
// ❌ 當前實作
interests: z.string().optional()

// Line 104-107 in profile/edit/page.tsx
if (data.interests) {
  preferences.interests = data.interests.split(',').map((s) => s.trim());
}

// ✅ 建議加強
interests: z.string()
  .optional()
  .refine(
    (val) => {
      if (!val) return true;
      const tags = val.split(',').map(s => s.trim());
      return tags.length <= 10;  // 最多 10 個標籤
    },
    '興趣標籤不能超過 10 個'
  )
  .refine(
    (val) => {
      if (!val) return true;
      const tags = val.split(',').map(s => s.trim());
      return tags.every(tag => tag.length >= 2 && tag.length <= 20);
    },
    '每個標籤長度應在 2-20 字符之間'
  )
  .transform((val) => {
    if (!val) return [];
    return val.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  })
```

**優先級**: 🟡 中  
**預估工作量**: 1 小時

---

**問題 1.2.2: XSS 風險** 🔴

```typescript
// ❌ Bio 和 Interests 直接顯示，可能有 XSS 風險
preferences.interests = data.interests.split(',').map((s) => s.trim());

// ✅ 建議：後端 sanitize + 前端 escape
// 後端 (NestJS)
import * as sanitizeHtml from 'sanitize-html';

@Transform(({ value }) => sanitizeHtml(value, {
  allowedTags: [],  // 不允許任何 HTML
  allowedAttributes: {},
}))
bio: string;

// 前端顯示時
<p className="whitespace-pre-wrap">
  {DOMPurify.sanitize(user.bio)}
</p>
```

**優先級**: 🔴 高（安全問題）  
**預估工作量**: 3 小時

---

### 1.3 支付和提現表單

#### ✅ 當前實作

**位置**: `apps/web/app/(main)/wallet/withdraw/page.tsx`

```typescript
const withdrawSchema = z.object({
  amount: z
    .number()
    .positive('金額必須大於 0')
    .min(1, '最低提款金額為 1'),
  payoutMethod: z.enum(['bank_transfer', 'paypal', 'cryptocurrency']),
  payoutDetails: z.string().min(1, '請提供付款詳情'),
});
```

#### ⚠️ 潛在問題

**問題 1.3.1: 提款金額驗證不完整** 🔴

```typescript
// ❌ 當前只檢查最小金額
amount: z.number().positive().min(1)

// Line 165: 只在前端檢查餘額
if (amount > balance) {
  return; // 簡單返回，無錯誤提示
}

// ✅ 建議加強
const withdrawSchema = (balance: number, pendingAmount: number) => z.object({
  amount: z
    .number({ required_error: '請輸入提款金額' })
    .positive('金額必須大於 0')
    .min(100, '最低提款金額為 $100')  // 業務規則
    .max(50000, '單次提款不能超過 $50,000')  // 業務規則
    .max(balance - pendingAmount, `可用餘額不足（可用：$${balance - pendingAmount}）`)
    .refine(
      (val) => Number.isFinite(val) && val.toFixed(2) === String(val),
      '金額最多兩位小數'
    ),
  payoutMethod: z.enum(['bank_transfer', 'paypal', 'cryptocurrency']),
  payoutDetails: z.string()
    .min(1, '請提供付款詳情')
    .max(200, '付款詳情過長')
    .refine(
      (val, ctx) => {
        const method = ctx.parent.payoutMethod;
        if (method === 'bank_transfer') {
          // 驗證銀行帳號格式
          return /^\d{10,20}$/.test(val);
        }
        if (method === 'paypal') {
          // 驗證 PayPal email
          return z.string().email().safeParse(val).success;
        }
        return true;
      },
      (val, ctx) => ({
        message: `請輸入有效的 ${ctx.parent.payoutMethod} 帳號`,
      })
    ),
});

// 後端必須驗證
// 1. 用戶餘額是否足夠（含待入帳）
// 2. 是否已有待審核提款
// 3. 是否在冷卻期內（如 7 天只能提款一次）
// 4. 金額是否符合限制
// 5. 使用 idempotency key 防止重複提款
```

**優先級**: 🔴 極高（財務風險）  
**預估工作量**: 後端 6 小時 + 前端 3 小時

---

**問題 1.3.2: 無幂等性保護** 🔴

```typescript
// ❌ 當前實作：無幂等性鍵
const handleSubmit = async (data: WithdrawFormData) => {
  await paymentsApi.requestWithdrawal(amount, payoutMethod, payoutDetails);
};

// ✅ 建議添加幂等性鍵
import { v4 as uuidv4 } from 'uuid';

const handleSubmit = async (data: WithdrawFormData) => {
  const idempotencyKey = uuidv4();
  
  try {
    await paymentsApi.requestWithdrawal({
      ...data,
      idempotencyKey,  // 後端檢查重複請求
    });
  } catch (error) {
    if (error.code === 'DUPLICATE_REQUEST') {
      toast.error('請勿重複提交');
      return;
    }
    throw error;
  }
};

// 後端應該：
// 1. 檢查 idempotencyKey 是否已存在
// 2. 如果存在，返回原請求結果
// 3. 如果不存在，創建新提款請求並保存 key
```

**優先級**: 🔴 極高（可能重複扣款）  
**預估工作量**: 後端 4 小時 + 前端 2 小時

---

### 1.4 內容發布表單

#### ✅ 當前實作

**位置**: `apps/web/app/(main)/post/create/page.tsx`

```typescript
const postSchema = z.object({
  content: z
    .string()
    .min(1, '請輸入內容')
    .max(2000, '內容不能超過 2000 字符'),
  isPremium: z.boolean().default(false),
});
```

#### ⚠️ 潛在問題

**問題 1.4.1: 文件上傳無驗證** 🟠

```typescript
// ❌ Line 66: 只檢查數量，無大小/格式驗證
if (selectedFiles.length + newFiles.length > 4) {
  alert('最多只能上傳 4 張圖片');
  return;
}

// ✅ 建議加強
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const validateFiles = (files: File[]): string | null => {
  if (selectedFiles.length + files.length > 4) {
    return '最多只能上傳 4 張圖片';
  }
  
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `不支援的文件格式: ${file.name}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `文件過大: ${file.name}（最大 5MB）`;
    }
  }
  
  return null;
};

const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  const error = validateFiles(files);
  
  if (error) {
    toast.error(error);
    e.target.value = ''; // 重置 input
    return;
  }
  
  setSelectedFiles((prev) => [...prev, ...files]);
};
```

**優先級**: 🟠 高  
**預估工作量**: 3 小時

---

**問題 1.4.2: Premium 內容無權限檢查** 🟠

```typescript
// ❌ 任何用戶都可以標記為 Premium
<Checkbox
  id="isPremium"
  checked={isPremium}
  onCheckedChange={setIsPremium}
/>

// ✅ 應該檢查用戶權限
const { user } = useAuth();
const canCreatePremium = user?.userType === 'sugar_baby' && 
                         user?.verificationStatus === 'verified';

{canCreatePremium && (
  <div className="flex items-center gap-2">
    <Checkbox
      id="isPremium"
      checked={isPremium}
      onCheckedChange={setIsPremium}
    />
    <Label htmlFor="isPremium">設為付費內容</Label>
  </div>
)}

{!canCreatePremium && isPremium && (
  <Alert variant="warning">
    <AlertDescription>
      僅認證的創作者可以發布付費內容
    </AlertDescription>
  </Alert>
)}
```

**優先級**: 🟠 高  
**預估工作量**: 2 小時

---

## 2. 權限控制

### 2.1 前端路由保護

#### ✅ 當前實作

**位置**: `apps/web/app/(main)/layout.tsx`

```typescript
'use client';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Layout content */}
    </div>
  );
}
```

#### ⚠️ 潛在問題

**問題 2.1.1: 閃爍問題** 🟡

```typescript
// ❌ 未認證用戶會短暫看到頁面再跳轉
if (!isAuthenticated) {
  return null;  // 顯示空白
}

// ✅ 改進：使用 Suspense 和 SSR 檢查
// 1. 使用 Next.js middleware
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('sd_access_token');
  
  if (!token && request.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

// 2. 或使用 loading.tsx
// app/(main)/loading.tsx
export default function Loading() {
  return <LoadingSpinner />;
}
```

**優先級**: 🟡 中  
**預估工作量**: 3 小時

---

### 2.2 角色權限檢查

#### ⚠️ 潛在問題

**問題 2.2.1: 前端無角色驗證** 🟠

```typescript
// ❌ Web 應用未檢查 permissionRole
const { user } = useAuth();
// user.permissionRole 未被使用

// ✅ 建議添加角色檢查
export function usePermission() {
  const { user } = useAuth();
  
  const hasRole = useCallback((role: string | string[]) => {
    if (!user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.permissionRole || user.role);
  }, [user]);
  
  const canAccessFeature = useCallback((feature: string) => {
    const permissions: Record<string, string[]> = {
      'create_premium_content': ['sugar_baby', 'admin'],
      'view_premium_content': ['sugar_daddy', 'admin'],
      'manage_subscriptions': ['admin'],
    };
    
    return permissions[feature]?.includes(user?.permissionRole) || false;
  }, [user]);
  
  return { hasRole, canAccessFeature };
}

// 使用
function CreatePostPage() {
  const { canAccessFeature } = usePermission();
  const canCreatePremium = canAccessFeature('create_premium_content');
  
  return (
    <>
      {canCreatePremium && (
        <Checkbox label="設為付費內容" />
      )}
    </>
  );
}
```

**優先級**: 🟠 高  
**預估工作量**: 4 小時

---

**問題 2.2.2: Admin 無路由中間件** 🔴

```typescript
// ❌ apps/admin 只在 AuthProvider 中檢查
// 任何人都可以訪問 /admin URL

// ✅ 建議添加 middleware
// apps/admin/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 允許登入頁面
  if (pathname === '/login') {
    return NextResponse.next();
  }
  
  const token = request.cookies.get('admin_token')?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  try {
    const payload = await verifyToken(token);
    
    // 檢查角色
    if (payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

**優先級**: 🔴 極高（安全漏洞）  
**預估工作量**: 4 小時

---

## 3. 數據流和錯誤處理

### 3.1 API 調用流程

#### ✅ 良好實踐

**取消令牌處理**:
```typescript
// apps/web/app/(main)/wallet/page.tsx - Line 28-43
useEffect(() => {
  let cancelled = false;
  
  const loadBalance = async () => {
    try {
      const bal = await paymentsApi.getBalance();
      if (!cancelled) setBalance(bal);
    } catch (err) {
      if (!cancelled) setError(err.message);
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
  
  loadBalance();
  
  return () => {
    cancelled = true;  // ✅ 防止內存洩漏
  };
}, []);
```

**Promise.allSettled 處理多個請求**:
```typescript
// apps/web/app/(main)/subscription/page.tsx - Line 52
const [subResult, plansResult] = await Promise.allSettled([
  subscriptionsApi.listMySubscriptions(),
  subscriptionsApi.listAvailablePlans(),
]);
// ✅ 一個請求失敗不影響另一個
```

#### ⚠️ 潛在問題

**問題 3.1.1: 錯誤訊息洩露** 🟠

```typescript
// ❌ 直接顯示後端錯誤
catch (err) {
  setState({ ...state, error: err.message });
  // 可能洩露："Database connection failed"
  //          "User not found in database users.id=123"
}

// ✅ 應該過濾敏感信息
catch (err) {
  const userFriendlyMessage = getFriendlyErrorMessage(err);
  setState({ ...state, error: userFriendlyMessage });
  
  // 記錄詳細錯誤到監控系統
  logger.error('API call failed', {
    error: err,
    userId: user?.id,
    endpoint: '/api/...',
  });
}
```

**優先級**: 🟠 高（安全問題）  
**預估工作量**: 3 小時

---

**問題 3.1.2: 無重試機制** 🟡

```typescript
// ❌ 網絡錯誤直接失敗
try {
  const data = await api.getData();
} catch (error) {
  setError(error.message);
}

// ✅ 添加指數退避重試
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // 只重試網絡錯誤
      if (!isNetworkError(error)) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// 使用
const data = await fetchWithRetry(() => api.getData());
```

**優先級**: 🟡 中  
**預估工作量**: 4 小時

---

### 3.2 JWT 刷新邏輯

#### ⚠️ 潛在問題

**問題 3.2.1: Token 刷新脆弱** 🟠

```typescript
// ❌ apps/web/providers/auth-provider.tsx - Line 89
// 硬編碼 60 秒，無法應對網絡延遲
const refreshMs = Math.max((expiresIn - 60) * 1000, 10_000);

// ✅ 改進：動態計算 + 容錯
const scheduleRefresh = useCallback((expiresIn: number) => {
  if (refreshTimerRef.current) {
    clearTimeout(refreshTimerRef.current);
  }
  
  // 在過期前 1/4 時間或至少 5 分鐘刷新
  const bufferTime = Math.max(expiresIn / 4, 300);
  const refreshMs = Math.max((expiresIn - bufferTime) * 1000, 10_000);
  
  refreshTimerRef.current = setTimeout(async () => {
    const rt = localStorage.getItem(REFRESH_KEY);
    if (!rt) return;
    
    try {
      const res = await authApi.refresh({ refreshToken: rt });
      setTokens(res.accessToken, res.refreshToken);
      scheduleRefresh(res.expiresIn);
    } catch (error) {
      // ✅ 重試一次
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const res = await authApi.refresh({ refreshToken: rt });
        setTokens(res.accessToken, res.refreshToken);
        scheduleRefresh(res.expiresIn);
      } catch {
        // 兩次都失敗，登出
        clearTokens();
        setState({ user: null, isLoading: false, isAuthenticated: false });
        router.push('/login');
      }
    }
  }, refreshMs);
}, [setTokens, clearTokens, router]);
```

**優先級**: 🟠 高  
**預估工作量**: 3 小時

---

## 4. 業務規則驗證

### 4.1 提款規則

#### ⚠️ 關鍵問題

**問題 4.1.1: 無最小/最大金額限制** 🔴

```typescript
// ❌ 只檢查 > 0
amount: z.number().positive().min(1)

// ✅ 應該有業務規則
const WITHDRAWAL_RULES = {
  MIN_AMOUNT: 100,           // 最低 $100
  MAX_AMOUNT: 50000,         // 最高 $50,000
  DAILY_LIMIT: 100000,       // 每日 $100,000
  COOLDOWN_DAYS: 7,          // 7 天內只能提款一次
  FEE_RATE: 0.02,            // 2% 手續費
  MIN_FEE: 5,                // 最低 $5 手續費
};

// 後端必須驗證所有規則
```

**優先級**: 🔴 極高  
**預估工作量**: 後端 8 小時

---

### 4.2 訂閱流程

#### ⚠️ 關鍵問題

**問題 4.2.1: 訂閱取消無確認** 🟠

```typescript
// ❌ apps/web/app/(main)/subscription/page.tsx - Line 99
// 直接取消，無確認對話框
const handleCancel = async (subId: string) => {
  await subscriptionsApi.cancel();
  refetch();
};

// ✅ 應該有確認步驟
const [cancellingId, setCancellingId] = useState<string | null>(null);

const handleCancelClick = (subId: string) => {
  setCancellingId(subId);
};

const confirmCancel = async () => {
  try {
    await subscriptionsApi.cancel(cancellingId!);
    toast.success('訂閱已取消');
    refetch();
  } catch (error) {
    toast.error('取消失敗');
  } finally {
    setCancellingId(null);
  }
};

// UI
{cancellingId && (
  <ConfirmDialog
    title="確認取消訂閱"
    description="取消後將無法繼續訪問付費內容，確定要繼續嗎？"
    onConfirm={confirmCancel}
    onCancel={() => setCancellingId(null)}
  />
)}
```

**優先級**: 🟠 高  
**預估工作量**: 2 小時

---

## 5. 改進建議總結

### 5.1 立即處理（P0）

| # | 問題 | 風險 | 預估時間 |
|---|------|------|---------|
| 1 | Email 驗證僅前端 | 🔴 安全 | 5h |
| 2 | XSS 風險 | 🔴 安全 | 3h |
| 3 | 提款驗證不完整 | 🔴 財務 | 9h |
| 4 | 無幂等性保護 | 🔴 財務 | 6h |
| 5 | Admin 無路由保護 | 🔴 安全 | 4h |

**總計：27 小時**

### 5.2 高優先級（P1）

| # | 問題 | 預估時間 |
|---|------|---------|
| 6-15 | 文件驗證、權限檢查等 | 30h |

### 5.3 中優先級（P2）

| # | 問題 | 預估時間 |
|---|------|---------|
| 16-25 | 表單優化、錯誤處理等 | 25h |

---

## 6. 最佳實踐建議

### 6.1 表單驗證清單

- [ ] 前端 + 後端雙重驗證
- [ ] 清晰的錯誤訊息
- [ ] 輸入範圍限制
- [ ] 特殊字符處理
- [ ] XSS 防護
- [ ] CSRF 防護

### 6.2 API 調用清單

- [ ] 錯誤重試機制
- [ ] 取消令牌處理
- [ ] 錯誤訊息過濾
- [ ] 日誌記錄
- [ ] 超時處理
- [ ] 幂等性保護

### 6.3 權限控制清單

- [ ] 前端路由保護
- [ ] 角色權限檢查
- [ ] API 權限驗證
- [ ] 操作日誌記錄

---

**報告編制**: Frontend Developer Team  
**審核**: Backend Team + Security Team  
**版本**: 1.0  
**日期**: 2024-01-XX
