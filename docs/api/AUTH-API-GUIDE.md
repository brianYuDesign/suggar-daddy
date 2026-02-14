# Auth API 完整指南

## 初始化

```typescript
import { ApiClient } from '@suggar-daddy/api-client';

const client = new ApiClient({
  baseURL: 'http://localhost:3000',
});

const authApi = client.auth;
```

---

## API 方法總覽

| 方法 | 端點 | 認證 | 權限 |
|------|------|------|------|
| `login` | POST /api/auth/login | - | - |
| `register` | POST /api/auth/register | - | - |
| `refresh` | POST /api/auth/refresh | - | - |
| `logout` | POST /api/auth/logout | Auth | - |
| `verifyEmail` | POST /api/auth/verify-email/:token | - | - |
| `resendVerification` | POST /api/auth/resend-verification | Auth | - |
| `forgotPassword` | POST /api/auth/forgot-password | - | - |
| `resetPassword` | POST /api/auth/reset-password | - | - |
| `changePassword` | POST /api/auth/change-password | Auth | - |
| `getGoogleLoginUrl` | GET /api/auth/google | - | - |
| `handleGoogleCallback` | GET /api/auth/google/callback | - | - |
| `appleLogin` | POST /api/auth/apple | - | - |
| `handleAppleCallback` | POST /api/auth/apple/callback | - | - |
| `suspendUser` | POST /api/auth/admin/suspend/:userId | Auth | Admin |
| `banUser` | POST /api/auth/admin/ban/:userId | Auth | Admin |
| `reactivateUser` | POST /api/auth/admin/reactivate/:userId | Auth | Admin |

---

## 使用情境

### 註冊與電子郵件驗證

```typescript
// 1. 註冊
const tokens = await authApi.register({
  email: 'user@example.com',
  password: 'Password123',
  role: 'sugar_baby',
  displayName: 'Jane Doe',
});
client.setAuthToken(tokens.accessToken);

// 2. 重新發送驗證信
await authApi.resendVerification();

// 3. 驗證電子郵件 (從郵件連結取得 token)
const result = await authApi.verifyEmail('ev_1234567890');
```

### 密碼重置

```typescript
// 1. 請求重置密碼
await authApi.forgotPassword('user@example.com');

// 2. 使用 token 重置 (token 來自郵件連結)
await authApi.resetPassword('pr_1234567890', 'NewPassword123');

// 3. 已登入後變更密碼
await authApi.changePassword('OldPassword', 'NewPassword');
```

### Google OAuth

```typescript
// 前端：導向 Google 登入頁
const googleUrl = authApi.getGoogleLoginUrl();
window.location.href = googleUrl;

// 回調頁面：處理 OAuth code
const code = new URLSearchParams(window.location.search).get('code');
if (code) {
  const tokens = await authApi.handleGoogleCallback(code);
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
  client.setAuthToken(tokens.accessToken);
}
```

### Apple OAuth

```typescript
// 使用 Apple JS SDK
const data = await window.AppleID.auth.signIn();
const tokens = await authApi.appleLogin(
  data.authorization.id_token,
  data.authorization.code
);

// 或處理回調
const code = new URLSearchParams(window.location.search).get('code');
if (code) {
  const tokens = await authApi.handleAppleCallback(code);
}
```

### Admin 帳號管理

```typescript
client.setAuthToken(adminAccessToken);

await authApi.suspendUser('user123', '違反社群規範');
await authApi.banUser('user456', '嚴重違規');
await authApi.reactivateUser('user123');
```

---

## 類型定義

```typescript
// 基本成功回應
interface SuccessResponse {
  success: boolean;
  message?: string;
}

// Token 回應 (登入/註冊/OAuth)
interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

// 驗證回應
interface VerifyEmailResponse {
  success: boolean;
  message: string;
}
```

### DTO 類型 (來自 `@suggar-daddy/dto`)

- `LoginDto` - 登入請求
- `RegisterDto` - 註冊請求
- `RefreshTokenDto` - Token 刷新請求
- `ForgotPasswordDto` - 忘記密碼請求
- `ResetPasswordDto` - 重置密碼請求
- `ChangePasswordDto` - 變更密碼請求

---

## 錯誤處理

```typescript
import { ApiError } from '@suggar-daddy/api-client';

try {
  await authApi.login({ email, password });
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401: // 帳號或密碼錯誤
      case 403: // 帳號已被停用
      case 404: // 帳號不存在
      case 429: // 請求過於頻繁
    }
  }
}
```

---

## React Hook 範例

```typescript
import { useState, useEffect } from 'react';
import { ApiClient } from '@suggar-daddy/api-client';

const client = new ApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      client.setAuthToken(token);
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const tokens = await client.auth.login({ email, password });
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    client.setAuthToken(tokens.accessToken);
    setIsAuthenticated(true);
    return tokens;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await client.auth.logout(refreshToken || undefined);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      client.setAuthToken(null);
      setIsAuthenticated(false);
    }
  };

  return { isAuthenticated, login, logout, client };
}
```

---

## 注意事項

1. **Token 管理**: 登入後用 `client.setAuthToken()` 設定 token，定期用 `refresh` 更新
2. **安全性**: 使用 HTTPS、避免將 token 存在 cookie (CSRF 風險)
3. **OAuth**: Google/Apple OAuth 需在對應 Console 設定回調 URL，測試/正式環境用不同 Client ID
4. **forgotPassword**: 無論郵件是否存在都回傳 success，防止郵件列舉攻擊

## 相關檔案

- API Client: `libs/api-client/src/auth.ts`
- DTO 定義: `libs/dto/src/auth.dto.ts`
- 後端服務: `apps/auth-service/`
