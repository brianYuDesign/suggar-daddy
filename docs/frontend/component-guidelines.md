# React Component Guidelines

本文檔基於 Suggar Daddy 專案中 `apps/web` 和 `apps/admin` 的現有代碼分析,提供完整的 React 組件開發指南。

## 目錄

- [1. 當前組件模式分析](#1-當前組件模式分析)
- [2. 最佳實踐指南](#2-最佳實踐指南)
- [3. 完整範例代碼](#3-完整範例代碼)
- [4. 測試規範](#4-測試規範)
- [5. 文檔化建議](#5-文檔化建議)

---

## 1. 當前組件模式分析

### 1.1 組件結構和命名規範

#### **目錄結構**

```
apps/web/src/
├── components/           # 可複用組件
│   ├── FollowButton.tsx
│   ├── desktop-sidebar.tsx
│   ├── mobile-nav.tsx
│   └── ...
├── app/                  # Next.js App Router 頁面
│   ├── (auth)/          # 認證相關頁面
│   ├── (main)/          # 主要頁面
│   └── providers.tsx    # Provider 集合
└── contexts/            # React Context
    ├── auth-provider.tsx
    ├── toast-provider.tsx
    └── notification-provider.tsx

apps/admin/src/
├── components/          # UI 組件庫
│   ├── header.tsx
│   ├── sidebar.tsx
│   ├── stats-card.tsx
│   └── ...
└── lib/                 # 工具和 Hooks
    ├── use-sort.ts
    ├── use-selection.ts
    └── api-client.ts
```

#### **命名規範**

| 類型 | 命名方式 | 範例 |
|------|---------|------|
| **組件文件** | PascalCase / kebab-case | `FollowButton.tsx` / `desktop-sidebar.tsx` |
| **組件名稱** | PascalCase | `FollowButton`, `DesktopSidebar` |
| **Hook 文件** | kebab-case (use-prefix) | `use-sort.ts`, `use-selection.ts` |
| **Hook 函數** | camelCase (use prefix) | `useSort`, `useSelection` |
| **Provider** | PascalCase + Provider | `AuthProvider`, `ToastProvider` |
| **Context** | PascalCase + Context | `AuthContext`, `ToastContext` |

**當前模式**:
- ✅ Web 應用: 混合使用 `PascalCase` 和 `kebab-case` 文件名
- ✅ Admin 應用: 統一使用 `kebab-case` 文件名
- 📝 建議: **統一使用 `kebab-case` 以保持一致性**

---

### 1.2 狀態管理模式

#### **全局狀態 - Context API**

專案使用 React Context 管理全局狀態,避免 prop drilling:

```tsx
// 認證狀態
<AuthProvider>
  <ToastProvider>
    <NotificationProvider>
      {children}
    </NotificationProvider>
  </ToastProvider>
</AuthProvider>
```

#### **本地狀態 - useState**

組件內部狀態使用 `useState`:

```tsx
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

#### **樂觀更新模式 (FollowButton)**

```tsx
const [isFollowing, setIsFollowing] = useState(initialIsFollowing);

const handleToggle = async () => {
  const previousState = isFollowing;
  
  // 1. 立即更新 UI (樂觀)
  setIsFollowing(!isFollowing);
  
  try {
    // 2. 發送 API 請求
    await apiCall();
  } catch (error) {
    // 3. 失敗時回滾
    setIsFollowing(previousState);
  }
};
```

#### **Token 自動刷新模式 (Web AuthProvider)**

```tsx
useEffect(() => {
  const interval = setInterval(async () => {
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;
    
    // 提前 60 秒刷新
    if (decoded.exp - now < 60) {
      await refreshToken();
    }
  }, 30000); // 每 30 秒檢查
  
  return () => clearInterval(interval);
}, [token]);
```

#### **Session 過期警告模式 (Admin AuthProvider)**

```tsx
useEffect(() => {
  const checkSession = () => {
    if (!token) return;
    
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;
    const remaining = decoded.exp - now;
    
    // 提前 5 分鐘警告
    if (remaining < 300 && remaining > 0) {
      toast.warning('Session expiring soon');
    }
    
    // 過期自動登出
    if (remaining <= 0) {
      logout();
    }
  };
  
  const interval = setInterval(checkSession, 30000);
  return () => clearInterval(interval);
}, [token]);
```

---

### 1.3 Props 定義和類型

#### **Props Interface 模式**

```tsx
interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing?: boolean;
  size?: 'sm' | 'default';
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
}

export function FollowButton({
  targetUserId,
  initialIsFollowing = false,
  size = 'default',
  onFollowChange,
  className,
}: FollowButtonProps) {
  // ...
}
```

#### **Children Props**

```tsx
interface ProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: ProviderProps) {
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

#### **Generic Props**

```tsx
interface StatsCardProps<T = any> {
  title: string;
  value: T;
  icon?: React.ComponentType<{ className?: string }>;
  formatter?: (value: T) => string;
}

export function StatsCard<T>({
  title,
  value,
  icon: Icon,
  formatter = (v) => String(v),
}: StatsCardProps<T>) {
  return (
    <div>
      {Icon && <Icon className="icon" />}
      <h3>{title}</h3>
      <p>{formatter(value)}</p>
    </div>
  );
}
```

---

### 1.4 樣式處理方式

#### **Tailwind CSS (主要方式)**

```tsx
<button
  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
>
  Follow
</button>
```

#### **條件樣式 - clsx / cn**

```tsx
import { cn } from '@/lib/utils';

<button
  className={cn(
    'px-4 py-2 rounded-lg transition-colors',
    isFollowing 
      ? 'bg-gray-200 text-gray-800 hover:bg-red-500 hover:text-white'
      : 'bg-brand-500 text-white hover:bg-brand-600',
    size === 'sm' && 'px-3 py-1 text-sm',
    className
  )}
>
  {buttonText}
</button>
```

#### **CSS Modules (測試中)**

```tsx
// Jest 配置中使用 identity-obj-proxy 模擬
{
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  }
}
```

#### **主題變量**

```tsx
// Web 應用 - 品牌色
'bg-brand-500' // 主色調
'text-brand-600' // 文字色

// Admin 應用 - 中立色
'bg-primary' // 主色調
'text-primary' // 文字色
```

---

## 2. 最佳實踐指南

### 2.1 從現有代碼總結的好實踐

#### ✅ **1. 樂觀更新提升 UX**

```tsx
// ✅ 好的實踐 - FollowButton
const handleToggle = async () => {
  const previousState = isFollowing;
  setIsFollowing(!isFollowing); // 立即反饋
  
  try {
    await followUser(targetUserId);
    onFollowChange?.(!isFollowing);
  } catch (error) {
    setIsFollowing(previousState); // 自動回滾
    toast.error('Failed to follow');
  }
};
```

#### ✅ **2. 加載狀態管理**

```tsx
// ✅ 好的實踐
const [isLoading, setIsLoading] = useState(false);

const handleAction = async () => {
  setIsLoading(true);
  try {
    await apiCall();
  } finally {
    setIsLoading(false); // 確保總是清除
  }
};
```

#### ✅ **3. 錯誤處理和用戶反饋**

```tsx
// ✅ 好的實踐
try {
  await apiCall();
  toast.success('Success!');
} catch (error) {
  console.error('Error:', error);
  toast.error(error.message || 'Something went wrong');
}
```

#### ✅ **4. 回調函數支持**

```tsx
// ✅ 好的實踐 - 提供回調讓父組件響應
interface FollowButtonProps {
  onFollowChange?: (isFollowing: boolean) => void;
}

// 使用
onFollowChange?.(newState);
```

#### ✅ **5. TypeScript 類型安全**

```tsx
// ✅ 好的實踐
interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'CREATOR' | 'SUBSCRIBER';
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
```

#### ✅ **6. Context 默認值處理**

```tsx
// ✅ 好的實踐
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

#### ✅ **7. 清理 Side Effects**

```tsx
// ✅ 好的實踐
useEffect(() => {
  const interval = setInterval(() => {
    checkToken();
  }, 30000);
  
  return () => clearInterval(interval); // 清理
}, []);
```

#### ✅ **8. 條件渲染優化**

```tsx
// ✅ 好的實踐
if (isLoading) {
  return <LoadingSpinner />;
}

if (error) {
  return <ErrorMessage message={error} />;
}

return <Content data={data} />;
```

---

### 2.2 需要改進的模式

#### ⚠️ **1. 文件命名不一致**

```tsx
// ⚠️ 當前狀態
apps/web/src/components/
  ├── FollowButton.tsx        // PascalCase
  ├── desktop-sidebar.tsx     // kebab-case
  └── mobile-nav.tsx          // kebab-case

// 💡 建議統一
apps/web/src/components/
  ├── follow-button.tsx
  ├── desktop-sidebar.tsx
  └── mobile-nav.tsx
```

#### ⚠️ **2. 缺少 Props 文檔**

```tsx
// ⚠️ 當前
interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing?: boolean;
}

// ✅ 改進
/**
 * Follow button component with optimistic updates
 * @param targetUserId - User ID to follow/unfollow
 * @param initialIsFollowing - Initial follow state, defaults to false
 * @param size - Button size variant
 * @param onFollowChange - Callback when follow state changes
 */
interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing?: boolean;
  size?: 'sm' | 'default';
  onFollowChange?: (isFollowing: boolean) => void;
}
```

#### ⚠️ **3. 缺少錯誤邊界**

```tsx
// ⚠️ 當前: 沒有 ErrorBoundary

// ✅ 建議添加
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

#### ⚠️ **4. Magic Numbers**

```tsx
// ⚠️ 當前
if (decoded.exp - now < 60) { // 什麼是 60?
  await refreshToken();
}

// ✅ 改進
const TOKEN_REFRESH_THRESHOLD = 60; // 提前 60 秒刷新

if (decoded.exp - now < TOKEN_REFRESH_THRESHOLD) {
  await refreshToken();
}
```

#### ⚠️ **5. 缺少 Loading/Error 狀態組件**

```tsx
// ⚠️ 當前: 每個組件自己實現 Loading UI

// ✅ 建議: 統一組件
export function LoadingSpinner({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  return <div className="spinner" />;
}

export function ErrorMessage({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error">
      <p>{message}</p>
      {retry && <button onClick={retry}>Retry</button>}
    </div>
  );
}
```

---

### 2.3 統一的組件結構

#### **標準組件模板**

```tsx
/**
 * Component description
 */

// 1. Imports
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// 2. Types
interface ComponentProps {
  // Required props
  id: string;
  title: string;
  
  // Optional props
  description?: string;
  onAction?: () => void;
  
  // Style props
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

// 3. Constants
const DEFAULT_SIZE = 'default';
const MAX_LENGTH = 100;

// 4. Component
export function Component({
  id,
  title,
  description,
  onAction,
  className,
  size = DEFAULT_SIZE,
}: ComponentProps) {
  // 4.1 Hooks
  const [isActive, setIsActive] = useState(false);
  const [data, setData] = useState(null);
  
  // 4.2 Effects
  useEffect(() => {
    // Side effects
    return () => {
      // Cleanup
    };
  }, []);
  
  // 4.3 Handlers
  const handleClick = () => {
    setIsActive(!isActive);
    onAction?.();
  };
  
  // 4.4 Computed values
  const displayTitle = title.slice(0, MAX_LENGTH);
  
  // 4.5 Render
  return (
    <div className={cn('component-base', className)}>
      <h2>{displayTitle}</h2>
      {description && <p>{description}</p>}
      <button onClick={handleClick}>Action</button>
    </div>
  );
}

// 5. Display name (for debugging)
Component.displayName = 'Component';
```

---

## 3. 完整範例代碼

### 3.1 FollowButton 組件範例

```tsx
// components/follow-button.tsx

import React, { useState } from 'react';
import { apiClient } from '@suggar-daddy/api-client';
import { useToast } from '@/contexts/toast-provider';
import { cn } from '@/lib/utils';

/**
 * Follow/Unfollow button with optimistic updates and hover effects
 * 
 * Features:
 * - Optimistic UI updates
 * - Automatic rollback on error
 * - Hover state transition ("Following" → "Unfollow")
 * - Loading state
 * - Callback support
 * 
 * @example
 * ```tsx
 * <FollowButton
 *   targetUserId="user-123"
 *   initialIsFollowing={false}
 *   onFollowChange={(isFollowing) => console.log(isFollowing)}
 * />
 * ```
 */

interface FollowButtonProps {
  /** Target user ID to follow/unfollow */
  targetUserId: string;
  
  /** Initial follow state, defaults to false */
  initialIsFollowing?: boolean;
  
  /** Button size variant */
  size?: 'sm' | 'default';
  
  /** Callback when follow state changes successfully */
  onFollowChange?: (isFollowing: boolean) => void;
  
  /** Additional CSS classes */
  className?: string;
}

export function FollowButton({
  targetUserId,
  initialIsFollowing = false,
  size = 'default',
  onFollowChange,
  className,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const toast = useToast();

  const handleToggle = async () => {
    if (isLoading) return;

    const previousState = isFollowing;
    const newState = !isFollowing;

    // Optimistic update
    setIsFollowing(newState);
    setIsLoading(true);

    try {
      if (newState) {
        await apiClient.matching.followUser(targetUserId);
      } else {
        await apiClient.matching.unfollowUser(targetUserId);
      }

      // Success callback
      onFollowChange?.(newState);
      
      toast.success(newState ? 'Followed successfully' : 'Unfollowed');
    } catch (error) {
      // Rollback on error
      setIsFollowing(previousState);
      
      console.error('Failed to toggle follow:', error);
      toast.error('Failed to update follow status');
    } finally {
      setIsLoading(false);
    }
  };

  const buttonText = isFollowing
    ? isHovered
      ? 'Unfollow'
      : 'Following'
    : 'Follow';

  return (
    <button
      onClick={handleToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading}
      className={cn(
        'font-medium rounded-lg transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        
        // Size variants
        size === 'sm' ? 'px-3 py-1 text-sm' : 'px-4 py-2 text-base',
        
        // State variants
        isFollowing
          ? cn(
              'bg-gray-200 text-gray-800',
              isHovered && 'bg-red-500 text-white'
            )
          : 'bg-brand-500 text-white hover:bg-brand-600',
        
        className
      )}
    >
      {isLoading ? 'Loading...' : buttonText}
    </button>
  );
}

FollowButton.displayName = 'FollowButton';
```

---

### 3.2 AuthProvider 範例 (Web 版本)

```tsx
// contexts/auth-provider.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { apiClient } from '@suggar-daddy/api-client';
import type { User, LoginRequest, RegisterRequest } from '@suggar-daddy/dto';

/**
 * Authentication context with automatic token refresh
 * 
 * Features:
 * - JWT token management
 * - Automatic token refresh (60s before expiry)
 * - Session persistence (localStorage)
 * - User info caching
 * - Socket cleanup on logout
 */

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Constants
const TOKEN_KEY = 'access_token';
const USER_KEY = 'user';
const TOKEN_REFRESH_THRESHOLD = 60; // Refresh 60s before expiry
const TOKEN_CHECK_INTERVAL = 30000; // Check every 30s

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);

        if (token && savedUser) {
          // Verify token validity
          const decoded = jwtDecode<{ exp: number }>(token);
          const now = Date.now() / 1000;

          if (decoded.exp > now) {
            setUser(JSON.parse(savedUser));
            apiClient.setAuthToken(token);
          } else {
            // Token expired, clear storage
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Automatic token refresh
  useEffect(() => {
    if (!user) return;

    const checkAndRefreshToken = async () => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        const decoded = jwtDecode<{ exp: number }>(token);
        const now = Date.now() / 1000;
        const timeUntilExpiry = decoded.exp - now;

        // Refresh if less than threshold
        if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD && timeUntilExpiry > 0) {
          console.log('Refreshing token...');
          const response = await apiClient.auth.refreshToken();
          
          if (response.accessToken) {
            localStorage.setItem(TOKEN_KEY, response.accessToken);
            apiClient.setAuthToken(response.accessToken);
          }
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
        // If refresh fails, logout
        logout();
      }
    };

    const interval = setInterval(checkAndRefreshToken, TOKEN_CHECK_INTERVAL);
    
    return () => clearInterval(interval);
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiClient.auth.login({ email, password });
      
      const { accessToken, user: userData } = response;

      // Save to localStorage
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));

      // Update state
      setUser(userData);
      apiClient.setAuthToken(accessToken);

      // Redirect to feed
      router.push('/feed');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [router]);

  const register = useCallback(async (data: RegisterRequest) => {
    try {
      const response = await apiClient.auth.register(data);
      
      const { accessToken, user: userData } = response;

      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));

      setUser(userData);
      apiClient.setAuthToken(accessToken);

      router.push('/feed');
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }, [router]);

  const logout = useCallback(() => {
    // Clear storage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    // Clear state
    setUser(null);
    apiClient.setAuthToken(null);

    // Disconnect socket if exists
    if (typeof window !== 'undefined' && (window as any).socket) {
      (window as any).socket.disconnect();
    }

    // Redirect to login
    router.push('/login');
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await apiClient.user.getProfile();
      
      setUser(userData);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to refresh user:', error);
      throw error;
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context
 * @throws {Error} If used outside AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
}
```

---

### 3.3 ToastProvider 範例

```tsx
// contexts/toast-provider.tsx

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toast notification system with auto-dismiss
 * 
 * Features:
 * - 4 types: success, error, info, warning
 * - Auto-dismiss (3s default)
 * - Max 3 toasts visible
 * - Manual dismiss
 */

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const MAX_TOASTS = 3;
const AUTO_DISMISS_DELAY = 3000;

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    
    const newToast: Toast = { id, type, message };

    setToasts((prev) => {
      // Limit to MAX_TOASTS
      const updated = [...prev, newToast].slice(-MAX_TOASTS);
      return updated;
    });

    // Auto-dismiss
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_DELAY);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    success: (message) => showToast('success', message),
    error: (message) => showToast('error', message),
    info: (message) => showToast('info', message),
    warning: (message) => showToast('warning', message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastComponent
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

interface ToastComponentProps {
  toast: Toast;
  onClose: () => void;
}

function ToastComponent({ toast, onClose }: ToastComponentProps) {
  const styles: Record<ToastType, string> = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
    warning: 'bg-yellow-500 text-black',
  };

  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg',
        'min-w-[300px] max-w-[500px]',
        'animate-slide-in',
        styles[toast.type]
      )}
    >
      <span className="text-xl">{icons[toast.type]}</span>
      <p className="flex-1 font-medium">{toast.message}</p>
      <button
        onClick={onClose}
        className="hover:opacity-70 transition-opacity"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

/**
 * Hook to show toast notifications
 * @throws {Error} If used outside ToastProvider
 */
export function useToast() {
  const context = useContext(ToastContext);
  
  if (context === undefined) {
    throw new Error('useToast must be used within ToastProvider');
  }
  
  return context;
}
```

---

### 3.4 自定義 Hook 範例

#### **useSort - 通用排序 Hook**

```tsx
// lib/use-sort.ts

import { useState, useMemo } from 'react';

/**
 * Generic sorting hook for arrays
 * 
 * @example
 * ```tsx
 * const { sorted, sort, toggleSort } = useSort(users, 'name');
 * 
 * // Toggle sort
 * <button onClick={() => toggleSort('name')}>
 *   Sort by name
 * </button>
 * ```
 */

type SortDirection = 'asc' | 'desc';

interface SortConfig<T> {
  key: keyof T;
  direction: SortDirection;
}

export function useSort<T>(
  data: T[],
  initialKey?: keyof T,
  initialDirection: SortDirection = 'asc'
) {
  const [sort, setSort] = useState<SortConfig<T> | null>(
    initialKey ? { key: initialKey, direction: initialDirection } : null
  );

  const sorted = useMemo(() => {
    if (!sort) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sort.key];
      const bValue = b[sort.key];

      // Handle null/undefined
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Compare
      let comparison = 0;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sort]);

  const toggleSort = (key: keyof T) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: 'asc' };
      }
      
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      
      return null; // Reset
    });
  };

  return {
    sorted,
    sort,
    setSort,
    toggleSort,
  };
}
```

#### **useSelection - 批量選擇 Hook**

```tsx
// lib/use-selection.ts

import { useState, useCallback, useMemo } from 'react';

/**
 * Hook for managing multi-select state
 * 
 * @example
 * ```tsx
 * const selection = useSelection<User>();
 * 
 * <Checkbox
 *   checked={selection.isSelected(user.id)}
 *   onChange={() => selection.toggle(user.id)}
 * />
 * ```
 */

export function useSelection<T extends { id: string }>() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const allSelected = useCallback(
    (items: T[]) => items.length > 0 && items.every((item) => selectedIds.has(item.id)),
    [selectedIds]
  );

  const selectedCount = selectedIds.size;

  return useMemo(
    () => ({
      selectedIds: Array.from(selectedIds),
      selectedCount,
      isSelected,
      toggle,
      selectAll,
      clearSelection,
      allSelected,
    }),
    [selectedIds, selectedCount, isSelected, toggle, selectAll, clearSelection, allSelected]
  );
}
```

#### **useDebounce - 防抖 Hook**

```tsx
// lib/use-debounce.ts

import { useState, useEffect } from 'react';

/**
 * Debounce a value
 * 
 * @example
 * ```tsx
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 500);
 * 
 * useEffect(() => {
 *   // API call with debounced value
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 * ```
 */

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

---

## 4. 測試規範

### 4.1 測試結構

#### **目錄組織**

```
src/
├── components/
│   ├── follow-button.tsx
│   └── follow-button.spec.tsx
├── contexts/
│   ├── auth-provider.tsx
│   └── auth-provider.spec.tsx
└── lib/
    ├── use-sort.ts
    └── use-sort.spec.ts
```

#### **測試文件模板**

```tsx
// component.spec.tsx

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Component } from './component';

// 1. Mock dependencies
jest.mock('@suggar-daddy/api-client');

// 2. Test suite
describe('Component', () => {
  // 3. Setup/teardown
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 4. Test cases
  describe('rendering', () => {
    it('should render with default props', () => {
      render(<Component />);
      expect(screen.getByText('Component')).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('should handle click', async () => {
      const handleClick = jest.fn();
      render(<Component onClick={handleClick} />);
      
      await userEvent.click(screen.getByRole('button'));
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should display error message', async () => {
      // Test error state
    });
  });
});
```

---

### 4.2 test-utils 設置

```tsx
// test-utils.tsx

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '@/contexts/auth-provider';
import { ToastProvider } from '@/contexts/toast-provider';

/**
 * Custom render with all providers
 */

interface AllProvidersProps {
  children: React.ReactNode;
}

function AllProviders({ children }: AllProvidersProps) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthProvider>
  );
}

function customRender(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
```

#### **使用範例**

```tsx
// component.spec.tsx

import { render, screen, waitFor } from '@/test-utils';

describe('Component', () => {
  it('should access auth context', () => {
    render(<Component />);
    // Component has access to AuthProvider
  });
});
```

---

### 4.3 測試範例

#### **FollowButton 測試**

```tsx
// components/follow-button.spec.tsx

import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { FollowButton } from './follow-button';
import { apiClient } from '@suggar-daddy/api-client';

jest.mock('@suggar-daddy/api-client');

describe('FollowButton', () => {
  const mockFollowUser = jest.fn();
  const mockUnfollowUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (apiClient.matching as any) = {
      followUser: mockFollowUser,
      unfollowUser: mockUnfollowUser,
    };
  });

  describe('rendering', () => {
    it('should render "Follow" when not following', () => {
      render(
        <FollowButton
          targetUserId="user-123"
          initialIsFollowing={false}
        />
      );

      expect(screen.getByText('Follow')).toBeInTheDocument();
    });

    it('should render "Following" when following', () => {
      render(
        <FollowButton
          targetUserId="user-123"
          initialIsFollowing={true}
        />
      );

      expect(screen.getByText('Following')).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('should call followUser API on click', async () => {
      mockFollowUser.mockResolvedValue({});

      render(
        <FollowButton
          targetUserId="user-123"
          initialIsFollowing={false}
        />
      );

      const button = screen.getByText('Follow');
      await userEvent.click(button);

      expect(mockFollowUser).toHaveBeenCalledWith('user-123');
      
      await waitFor(() => {
        expect(screen.getByText('Following')).toBeInTheDocument();
      });
    });

    it('should call unfollowUser API when following', async () => {
      mockUnfollowUser.mockResolvedValue({});

      render(
        <FollowButton
          targetUserId="user-123"
          initialIsFollowing={true}
        />
      );

      const button = screen.getByText('Following');
      await userEvent.click(button);

      expect(mockUnfollowUser).toHaveBeenCalledWith('user-123');
      
      await waitFor(() => {
        expect(screen.getByText('Follow')).toBeInTheDocument();
      });
    });
  });

  describe('optimistic updates', () => {
    it('should update UI immediately on click', async () => {
      mockFollowUser.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(
        <FollowButton
          targetUserId="user-123"
          initialIsFollowing={false}
        />
      );

      const button = screen.getByText('Follow');
      await userEvent.click(button);

      // UI updates immediately
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should rollback on error', async () => {
      mockFollowUser.mockRejectedValue(new Error('API Error'));

      render(
        <FollowButton
          targetUserId="user-123"
          initialIsFollowing={false}
        />
      );

      const button = screen.getByText('Follow');
      await userEvent.click(button);

      // Should rollback to original state
      await waitFor(() => {
        expect(screen.getByText('Follow')).toBeInTheDocument();
      });
    });
  });

  describe('callbacks', () => {
    it('should call onFollowChange with new state', async () => {
      mockFollowUser.mockResolvedValue({});
      const handleChange = jest.fn();

      render(
        <FollowButton
          targetUserId="user-123"
          initialIsFollowing={false}
          onFollowChange={handleChange}
        />
      );

      await userEvent.click(screen.getByText('Follow'));

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('hover effects', () => {
    it('should show "Unfollow" on hover when following', async () => {
      render(
        <FollowButton
          targetUserId="user-123"
          initialIsFollowing={true}
        />
      );

      const button = screen.getByText('Following');
      
      await userEvent.hover(button);
      expect(screen.getByText('Unfollow')).toBeInTheDocument();

      await userEvent.unhover(button);
      expect(screen.getByText('Following')).toBeInTheDocument();
    });
  });
});
```

#### **AuthProvider 測試**

```tsx
// contexts/auth-provider.spec.tsx

import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth-provider';
import { apiClient } from '@suggar-daddy/api-client';

jest.mock('@suggar-daddy/api-client');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('initialization', () => {
    it('should initialize with no user', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should restore user from localStorage', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      const mockToken = 'valid-token';

      localStorage.setItem('access_token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        accessToken: 'token-123',
        user: { id: '1', email: 'test@example.com' },
      };

      (apiClient.auth.login as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await result.current.login('test@example.com', 'password');

      await waitFor(() => {
        expect(result.current.user).toEqual(mockResponse.user);
        expect(localStorage.getItem('access_token')).toBe('token-123');
      });
    });
  });

  describe('logout', () => {
    it('should clear user and token', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Set initial state
      localStorage.setItem('access_token', 'token');
      localStorage.setItem('user', JSON.stringify({ id: '1' }));

      result.current.logout();

      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });
});
```

#### **Custom Hook 測試**

```tsx
// lib/use-sort.spec.ts

import { renderHook, act } from '@testing-library/react';
import { useSort } from './use-sort';

describe('useSort', () => {
  const mockData = [
    { id: '1', name: 'Charlie', age: 30 },
    { id: '2', name: 'Alice', age: 25 },
    { id: '3', name: 'Bob', age: 35 },
  ];

  it('should sort by string ascending', () => {
    const { result } = renderHook(() => useSort(mockData, 'name', 'asc'));

    expect(result.current.sorted[0].name).toBe('Alice');
    expect(result.current.sorted[1].name).toBe('Bob');
    expect(result.current.sorted[2].name).toBe('Charlie');
  });

  it('should toggle sort direction', () => {
    const { result } = renderHook(() => useSort(mockData));

    act(() => {
      result.current.toggleSort('age');
    });

    expect(result.current.sorted[0].age).toBe(25);

    act(() => {
      result.current.toggleSort('age');
    });

    expect(result.current.sorted[0].age).toBe(35);
  });

  it('should reset sort on third toggle', () => {
    const { result } = renderHook(() => useSort(mockData));

    act(() => {
      result.current.toggleSort('name'); // asc
    });
    act(() => {
      result.current.toggleSort('name'); // desc
    });
    act(() => {
      result.current.toggleSort('name'); // reset
    });

    expect(result.current.sort).toBeNull();
    expect(result.current.sorted).toEqual(mockData);
  });
});
```

---

## 5. 文檔化建議

### 5.1 組件文檔模板

```tsx
/**
 * Component name and brief description
 * 
 * @remarks
 * Detailed description of what the component does, its purpose,
 * and any important implementation details.
 * 
 * @example
 * Basic usage:
 * ```tsx
 * <Component
 *   prop1="value"
 *   prop2={123}
 * />
 * ```
 * 
 * @example
 * Advanced usage with callbacks:
 * ```tsx
 * <Component
 *   prop1="value"
 *   onAction={(data) => console.log(data)}
 * />
 * ```
 */
export function Component(props: ComponentProps) {
  // Implementation
}
```

---

### 5.2 Props 文檔

```tsx
interface ComponentProps {
  /**
   * Unique identifier for the component
   * @required
   */
  id: string;

  /**
   * Display title
   * @required
   */
  title: string;

  /**
   * Optional description text
   * @optional
   * @default undefined
   */
  description?: string;

  /**
   * Size variant of the component
   * @optional
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg';

  /**
   * Callback when action is triggered
   * @param data - The action data
   * @optional
   */
  onAction?: (data: ActionData) => void;

  /**
   * Additional CSS classes
   * @optional
   */
  className?: string;
}
```

---

### 5.3 JSDoc 規範

#### **函數文檔**

```tsx
/**
 * Fetches user data from API with caching
 * 
 * @param userId - The user's unique identifier
 * @param options - Optional fetch configuration
 * @param options.cache - Whether to use cache
 * @param options.force - Force refresh cache
 * @returns Promise resolving to User data
 * @throws {ApiError} When API request fails
 * @throws {ValidationError} When userId is invalid
 * 
 * @example
 * ```ts
 * const user = await fetchUser('user-123', { cache: true });
 * ```
 */
async function fetchUser(
  userId: string,
  options?: {
    cache?: boolean;
    force?: boolean;
  }
): Promise<User> {
  // Implementation
}
```

#### **Type 文檔**

```tsx
/**
 * User authentication state
 */
interface AuthState {
  /** Currently authenticated user, null if not logged in */
  user: User | null;
  
  /** Whether authentication is being checked */
  isLoading: boolean;
  
  /** Whether user is authenticated */
  isAuthenticated: boolean;
}

/**
 * User role in the system
 */
type UserRole = 
  | 'ADMIN'      // Full system access
  | 'CREATOR'    // Content creator
  | 'SUBSCRIBER' // Regular user
;
```

#### **Constant 文檔**

```tsx
/**
 * Number of seconds before token expiry to trigger refresh
 * @constant
 * @default 60
 */
const TOKEN_REFRESH_THRESHOLD = 60;

/**
 * Maximum number of concurrent toast notifications
 * @constant
 * @default 3
 */
const MAX_TOASTS = 3;
```

#### **Complex Type 文檔**

```tsx
/**
 * Configuration for API client
 */
interface ApiConfig {
  /**
   * Base URL for API endpoints
   * @example 'https://api.example.com'
   */
  baseUrl: string;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Custom headers to include in all requests
   * @example { 'X-Client-Version': '1.0.0' }
   */
  headers?: Record<string, string>;

  /**
   * Retry configuration
   */
  retry?: {
    /** Maximum number of retry attempts */
    maxAttempts: number;
    /** Delay between retries in milliseconds */
    delay: number;
  };
}
```

---

## 總結

### 關鍵原則

1. **一致性**: 統一命名、結構和模式
2. **可預測性**: 遵循標準模式,減少認知負擔
3. **可測試性**: 編寫可測試的組件,保持高覆蓋率
4. **可維護性**: 清晰的文檔和註釋
5. **性能**: 優化渲染,使用 memo 和 callback
6. **用戶體驗**: 樂觀更新、加載狀態、錯誤處理

### 檢查清單

創建新組件時,確保:

- [ ] 使用 kebab-case 文件名
- [ ] 定義清晰的 Props interface
- [ ] 添加 JSDoc 文檔
- [ ] 實現加載和錯誤狀態
- [ ] 支持 className prop (樣式擴展)
- [ ] 編寫單元測試
- [ ] 使用 TypeScript 類型
- [ ] 清理 side effects
- [ ] 處理邊界情況
- [ ] 添加使用範例

---

## 參考資源

- [React 官方文檔](https://react.dev)
- [Next.js 文檔](https://nextjs.org/docs)
- [Testing Library](https://testing-library.com/react)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**最後更新**: 2024-01
**維護者**: Suggar Daddy 開發團隊
