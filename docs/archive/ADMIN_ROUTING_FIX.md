# Admin 路由修復文檔

## 問題描述

在 Admin 應用中，使用者登入後只能看到登入頁面，無法進入儀表板和其他管理頁面。E2E 測試也因 URL 不匹配而失敗。

## 根本原因

Admin 應用採用 **Next.js 14 App Router 的路由組 (Route Groups)** 模式：

```
apps/admin/app/
├── (dashboard)/           ← 路由組（括號包裹）
│   ├── layout.tsx         ← 僅對 (dashboard) 下的路由生效
│   ├── page.tsx           ← 對應 URL: /
│   ├── users/
│   │   └── page.tsx       ← 對應 URL: /users
│   ├── payments/
│   │   └── page.tsx       ← 對應 URL: /payments
│   └── ...
├── login/
│   └── page.tsx           ← 對應 URL: /login
└── layout.tsx             ← 根 layout
```

### 關鍵概念：路由組 (Route Groups)

根據 Next.js 文檔：
- `(folder)` 語法創建路由組
- **路由組的名稱不會出現在 URL 路徑中**
- 用途：組織相關路由，共享 layout，但不影響 URL 結構

### 正確的 URL 映射

| 檔案路徑 | 實際 URL | ❌ 錯誤認知 |
|---------|---------|-----------|
| `app/(dashboard)/page.tsx` | `/` | `/dashboard` |
| `app/(dashboard)/users/page.tsx` | `/users` | `/dashboard/users` |
| `app/(dashboard)/payments/page.tsx` | `/payments` | `/dashboard/payments` |
| `app/login/page.tsx` | `/login` | `/login` ✅ |

## 問題細節

### 1. E2E 測試錯誤期望

**Before (錯誤):**
```typescript
async function loginAdmin(page: any) {
  await page.goto('http://localhost:4300/login');
  await page.fill('input[name="email"]', TEST_USERS.admin.email);
  await page.fill('input[name="password"]', TEST_USERS.admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 5000 });  // ❌ 期望 /dashboard
}
```

**實際行為:**
- 登入成功後，`router.replace('/')` 導航到 `/`
- E2E 測試期待 `/dashboard`，但實際 URL 是 `/`
- 測試因 timeout 失敗

### 2. 導航流程分析

```
1. 使用者在 /login 輸入帳密
2. 登入成功 → setToken() → router.replace('/')
3. 導航到 / → 觸發 (dashboard)/layout.tsx
4. AuthProvider 檢查 isAuthenticated()
   - 如果 true → 渲染 (dashboard)/page.tsx (Dashboard 首頁)
   - 如果 false → router.replace('/login') (回到登入頁)
```

### 3. 為什麼用戶看不到 Dashboard？

兩種可能：

**A. Token 儲存/讀取時序問題 (較不可能)**
```typescript
// apps/admin/app/login/page.tsx
setToken(res.accessToken);        // 同步操作
router.replace('/');              // 路由變更

// apps/admin/components/auth-provider.tsx
useEffect(() => {
  if (!isAuthenticated()) {       // 檢查時 token 可能還未寫入？
    router.replace('/login');
  }
}, [router]);
```

**B. E2E 測試錯誤 + URL 理解錯誤 (實際原因)**
- 測試期待 `/dashboard`，但應設計為 `/`
- 所有測試中的 URL 都需要移除 `/dashboard` 前綴

## 解決方案

### 修復 E2E 測試 URL

#### 1. 登入輔助函數
```typescript
async function loginAdmin(page: any) {
  await page.goto('http://localhost:4300/login');
  await page.fill('input[name="email"]', TEST_USERS.admin.email);
  await page.fill('input[name="password"]', TEST_USERS.admin.password);
  await page.click('button[type="submit"]');
  // Admin dashboard is at root path '/', not '/dashboard'
  await page.waitForURL('http://localhost:4300/', { timeout: 5000 });  // ✅ 修正
}
```

#### 2. 批量修復測試 URL

| Before (錯誤) | After (正確) |
|--------------|-------------|
| `http://localhost:4300/dashboard` | `http://localhost:4300/` |
| `http://localhost:4300/dashboard/users` | `http://localhost:4300/users` |
| `http://localhost:4300/dashboard/payments` | `http://localhost:4300/payments` |
| `await expect(page).toHaveURL(/\/dashboard/)` | `await expect(page).toHaveURL('http://localhost:4300/')` |
| `await expect(page).toHaveURL(/\/dashboard\/users/)` | `await expect(page).toHaveURL(/\/users/)` |

### 修改的檔案

1. **e2e/admin/admin-dashboard.spec.ts** - 修復所有 URL 路徑（~40 處）

## 驗證步驟

### 1. 手動測試
```bash
# 啟動服務
nx serve admin

# 瀏覽器訪問
open http://localhost:4300/login

# 測試登入
# Email: admin@test.com
# Password: Admin1234!

# 確認登入後導航到 http://localhost:4300/
# 檢查 Dashboard 頁面顯示統計卡片
```

### 2. E2E 測試
```bash
# 單獨測試 Admin
npm run e2e:headed:chrome -- e2e/admin/admin-dashboard.spec.ts

# 或只測試登入相關
npm run e2e:headed:chrome -- e2e/admin/admin-dashboard.spec.ts -g "管理員登入"
```

### 3. 檢查點

- [ ] 登入成功後 URL 變為 `http://localhost:4300/`
- [ ] Dashboard 頁面顯示統計卡片（Total Users, Total Posts 等）
- [ ] Sidebar 導航正常（Users, Payments, Content 等）
- [ ] 各子頁面 URL 正確（/users, /payments 等，無 /dashboard 前綴）

## 技術細節

### Admin App 路由結構

```typescript
// apps/admin/components/sidebar.tsx
const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },        // ✅ 根路徑
  { href: '/users', label: 'Users', icon: Users },                 // ✅ 無前綴
  { href: '/content', label: 'Content', icon: FileWarning },
  { href: '/subscriptions', label: 'Subscriptions', icon: Crown },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  // ... 其他項目
];
```

### 認證流程

```typescript
// apps/admin/lib/auth.ts
export function setToken(token: string): void {
  localStorage.setItem('admin_token', token);
  // Parse JWT to get expiration
  const payload = JSON.parse(atob(token.split('.')[1]));
  if (payload.exp) {
    localStorage.setItem('admin_token_expiry', String(payload.exp * 1000));
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();  // 檢查 token 存在且未過期
}

// apps/admin/components/auth-provider.tsx
useEffect(() => {
  if (!isAuthenticated()) {
    router.replace('/login');
  } else {
    setTokenState(getToken());
  }
  setChecked(true);
}, [router]);
```

## 最佳實踐建議

### 1. 路由設計
- 使用路由組 `(name)` 來組織相關頁面，但不影響 URL
- 在 Sidebar/導航中明確使用實際 URL 路徑
- 避免在程式碼中假設路由組名稱會出現在 URL 中

### 2. E2E 測試
- 測試 URL 應該基於實際瀏覽器 URL，不是檔案路徑
- 使用精確 URL 匹配 (`'http://...'`) 而非正則 (`/\/path/`) 可避免部分匹配問題
- 登入輔助函數應該等待實際的導航目標 URL

### 3. 認證 Provider
```typescript
// 良好的模式：顯示 loading 狀態直到檢查完成
if (!checked || !token) {
  return <LoadingSpinner />;
}
return <>{children}</>;
```

## 相關文件

- [Next.js Route Groups 文檔](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [02-開發指南.md](./02-開發指南.md) - 完整 API 文檔
- [FRONTEND_TESTING.md](./FRONTEND_TESTING.md) - 前端測試指南

## 測試憑證

```typescript
// e2e/utils/test-helpers.ts
export const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'Admin1234!',
  },
  // ...
};
```

## 總結

- ✅ **問題根源**：E2E 測試對 Next.js 路由組的理解錯誤
- ✅ **解決方案**：修正所有測試中的 URL 路徑，移除不存在的 `/dashboard` 前綴
- ✅ **程式碼本身**：login/page.tsx 的 `router.replace('/')` 是正確的
- ✅ **影響範圍**：僅影響 E2E 測試，應用程式邏輯無需更改

## 後續建議

1. 為所有開發者文檔化 Admin App 的路由結構
2. 在 Sidebar 組件中添加註解說明路由設計
3. 考慮添加 TypeScript 類型來約束路由路徑
4. E2E 測試套件中添加路由驗證測試
