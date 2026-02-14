# Auth API 快速使用指南

## 安裝

```bash
npm install @suggar-daddy/api-client
```

## 基本設定

```typescript
import { ApiClient } from '@suggar-daddy/api-client';

// 建立 API Client 實例
const client = new ApiClient({
  baseURL: 'http://localhost:3000', // 或你的 API 伺服器
});

// 取得 Auth API
const authApi = client.auth;
```

## 常用場景

### 1️⃣ 使用者註冊與驗證

```typescript
// Step 1: 註冊帳號
try {
  const tokens = await authApi.register({
    email: 'user@example.com',
    password: 'SecurePassword123',
    role: 'sugar_baby',
    displayName: 'Jane Doe',
  });
  
  // 儲存 tokens
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
  
  // 設定認證 token
  client.setAuthToken(tokens.accessToken);
} catch (error) {
  console.error('註冊失敗:', error);
}

// Step 2: 重新發送驗證信（如果需要）
try {
  await authApi.resendVerification();
  console.log('驗證信已發送');
} catch (error) {
  console.error('發送驗證信失敗:', error);
}

// Step 3: 驗證電子郵件（在驗證頁面）
// URL 範例: /verify-email?token=ev_1234567890
const urlParams = new URLSearchParams(window.location.search);
const verifyToken = urlParams.get('token');

if (verifyToken) {
  try {
    const result = await authApi.verifyEmail(verifyToken);
    console.log(result.message); // "Email verified successfully"
  } catch (error) {
    console.error('驗證失敗:', error);
  }
}
```

### 2️⃣ 忘記密碼流程

```typescript
// Step 1: 請求重置密碼連結
try {
  await authApi.forgotPassword('user@example.com');
  console.log('重置密碼連結已發送到您的信箱');
} catch (error) {
  console.error('請求失敗:', error);
}

// Step 2: 重置密碼（在重置頁面）
// URL 範例: /reset-password?token=pr_1234567890
const resetToken = new URLSearchParams(window.location.search).get('token');

if (resetToken) {
  try {
    await authApi.resetPassword(resetToken, 'NewSecurePassword123');
    console.log('密碼已重置，請重新登入');
  } catch (error) {
    console.error('重置密碼失敗:', error);
  }
}
```

### 3️⃣ 變更密碼（已登入）

```typescript
// 確保已設定 auth token
client.setAuthToken(accessToken);

try {
  await authApi.changePassword('OldPassword123', 'NewPassword456');
  console.log('密碼已成功變更');
} catch (error) {
  if (error.message.includes('Incorrect old password')) {
    console.error('舊密碼不正確');
  } else {
    console.error('變更密碼失敗:', error);
  }
}
```

### 4️⃣ Google OAuth 登入

```typescript
// 在登入頁面
const handleGoogleLogin = () => {
  const googleUrl = authApi.getGoogleLoginUrl();
  // 可選：指定重導向 URI
  // const googleUrl = authApi.getGoogleLoginUrl('http://localhost:4200/auth/callback');
  
  // 重導向到 Google 登入頁面
  window.location.href = googleUrl;
};

// 在 OAuth 回調頁面（例如 /auth/callback）
const handleOAuthCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');
  
  if (error) {
    console.error('OAuth 失敗:', error);
    return;
  }
  
  if (code) {
    try {
      const tokens = await authApi.handleGoogleCallback(code);
      
      // 儲存 tokens
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      // 設定認證
      client.setAuthToken(tokens.accessToken);
      
      // 重導向到首頁
      window.location.href = '/';
    } catch (error) {
      console.error('處理 Google 回調失敗:', error);
    }
  }
};

// 在 useEffect 或組件掛載時執行
useEffect(() => {
  handleOAuthCallback();
}, []);
```

### 5️⃣ Apple OAuth 登入

```typescript
// 方法 1: 使用 Apple JS SDK（前端）
// 需要引入 Apple 的 SDK
declare global {
  interface Window {
    AppleID: any;
  }
}

const initAppleLogin = () => {
  window.AppleID.auth.init({
    clientId: 'your.app.bundle.id',
    scope: 'name email',
    redirectURI: 'http://localhost:4200/auth/apple/callback',
    usePopup: false,
  });
};

const handleAppleLogin = async () => {
  try {
    const data = await window.AppleID.auth.signIn();
    
    // 使用 Apple 回傳的資料登入
    const tokens = await authApi.appleLogin(
      data.authorization.id_token,
      data.authorization.code
    );
    
    // 儲存 tokens
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    
  } catch (error) {
    console.error('Apple 登入失敗:', error);
  }
};

// 方法 2: 處理 Apple OAuth 回調
const handleAppleCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  if (code) {
    try {
      const tokens = await authApi.handleAppleCallback(code);
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      client.setAuthToken(tokens.accessToken);
    } catch (error) {
      console.error('處理 Apple 回調失敗:', error);
    }
  }
};
```

### 6️⃣ Admin 帳號管理

```typescript
// 確保使用 Admin 帳號的 token
client.setAuthToken(adminAccessToken);

// 暫停使用者帳號
try {
  await authApi.suspendUser('user123', '違反使用者條款第 3 條');
  console.log('使用者已被暫停');
} catch (error) {
  if (error.status === 403) {
    console.error('權限不足：需要 Admin 權限');
  } else {
    console.error('暫停使用者失敗:', error);
  }
}

// 封禁使用者帳號（永久停用）
try {
  await authApi.banUser('user456', '多次嚴重違規');
  console.log('使用者已被封禁');
} catch (error) {
  console.error('封禁使用者失敗:', error);
}

// 重新啟用使用者帳號
try {
  await authApi.reactivateUser('user123');
  console.log('使用者已重新啟用');
} catch (error) {
  console.error('重新啟用失敗:', error);
}
```

## 完整範例：React Hook

```typescript
// useAuth.ts
import { useState, useEffect } from 'react';
import { ApiClient } from '@suggar-daddy/api-client';
import type { TokenResponseDto } from '@suggar-daddy/dto';

const client = new ApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 從 localStorage 恢復 token
    const token = localStorage.getItem('accessToken');
    if (token) {
      client.setAuthToken(token);
      setIsAuthenticated(true);
      // 可以在這裡載入使用者資料
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const tokens = await client.auth.login({ email, password });
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      client.setAuthToken(tokens.accessToken);
      setIsAuthenticated(true);
      return tokens;
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterDto) => {
    try {
      const tokens = await client.auth.register(data);
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      client.setAuthToken(tokens.accessToken);
      setIsAuthenticated(true);
      return tokens;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await client.auth.logout(refreshToken || undefined);
    } catch (error) {
      console.error('登出失敗:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      client.setAuthToken(null);
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const verifyEmail = async (token: string) => {
    return await client.auth.verifyEmail(token);
  };

  const resendVerification = async () => {
    return await client.auth.resendVerification();
  };

  const forgotPassword = async (email: string) => {
    return await client.auth.forgotPassword(email);
  };

  const resetPassword = async (token: string, newPassword: string) => {
    return await client.auth.resetPassword(token, newPassword);
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    return await client.auth.changePassword(oldPassword, newPassword);
  };

  const googleLogin = () => {
    const url = client.auth.getGoogleLoginUrl();
    window.location.href = url;
  };

  const handleGoogleCallback = async (code: string) => {
    const tokens = await client.auth.handleGoogleCallback(code);
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    client.setAuthToken(tokens.accessToken);
    setIsAuthenticated(true);
    return tokens;
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    login,
    register,
    logout,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    changePassword,
    googleLogin,
    handleGoogleCallback,
    client,
  };
}
```

## 使用 Hook 的組件範例

```tsx
// LoginPage.tsx
import { useAuth } from './useAuth';
import { useState } from 'react';

export function LoginPage() {
  const { login, googleLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(email, password);
      // 重導向到首頁
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || '登入失敗');
    }
  };

  return (
    <div>
      <h1>登入</h1>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="電子郵件"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密碼"
          required
        />
        <button type="submit">登入</button>
      </form>
      
      <hr />
      
      <button onClick={googleLogin}>
        使用 Google 登入
      </button>
    </div>
  );
}
```

## 錯誤處理

```typescript
import { ApiError } from '@suggar-daddy/api-client';

try {
  await authApi.login({ email, password });
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        console.error('帳號或密碼錯誤');
        break;
      case 403:
        console.error('帳號已被停用');
        break;
      case 404:
        console.error('帳號不存在');
        break;
      case 429:
        console.error('請求過於頻繁，請稍後再試');
        break;
      default:
        console.error('登入失敗:', error.message);
    }
  } else {
    console.error('未知錯誤:', error);
  }
}
```

## API 方法總覽

| 方法 | 端點 | 需要認證 | 需要權限 |
|------|------|---------|---------|
| `login` | POST /api/auth/login | ❌ | - |
| `register` | POST /api/auth/register | ❌ | - |
| `refresh` | POST /api/auth/refresh | ❌ | - |
| `logout` | POST /api/auth/logout | ✅ | - |
| `verifyEmail` | POST /api/auth/verify-email/:token | ❌ | - |
| `resendVerification` | POST /api/auth/resend-verification | ✅ | - |
| `forgotPassword` | POST /api/auth/forgot-password | ❌ | - |
| `resetPassword` | POST /api/auth/reset-password | ❌ | - |
| `changePassword` | POST /api/auth/change-password | ✅ | - |
| `getGoogleLoginUrl` | GET /api/auth/google | ❌ | - |
| `handleGoogleCallback` | GET /api/auth/google/callback | ❌ | - |
| `appleLogin` | POST /api/auth/apple | ❌ | - |
| `handleAppleCallback` | POST /api/auth/apple/callback | ❌ | - |
| `suspendUser` | POST /api/auth/admin/suspend/:userId | ✅ | Admin |
| `banUser` | POST /api/auth/admin/ban/:userId | ✅ | Admin |
| `reactivateUser` | POST /api/auth/admin/reactivate/:userId | ✅ | Admin |

## 注意事項

1. **Token 管理**
   - 記得在登入成功後設定 auth token：`client.setAuthToken(tokens.accessToken)`
   - 定期使用 `refresh` 方法更新 access token
   - 登出時清除所有 tokens

2. **安全性**
   - 不要將 tokens 存在 cookie（容易受 CSRF 攻擊）
   - 使用 HTTPS 傳輸
   - 敏感操作前重新驗證密碼

3. **錯誤處理**
   - 處理所有可能的錯誤狀態碼
   - 顯示友善的錯誤訊息給使用者
   - 記錄錯誤以便除錯

4. **OAuth**
   - Google/Apple OAuth 需要在 Google/Apple Console 設定回調 URL
   - 測試環境和正式環境使用不同的 Client ID

## 相關連結

- [API Client 文檔](./libs/api-client/README.md)
- [DTO 類型定義](./libs/dto/src/auth.dto.ts)
- [後端 Auth Service](./apps/auth-service/README.md)
