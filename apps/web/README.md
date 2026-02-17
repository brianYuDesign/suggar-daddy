# Web (用戶端前端)

## 📖 簡介

Sugar Daddy 平台的用戶端 Web 應用，使用 Next.js 14 App Router 構建，提供響應式、現代化的用戶體驗。

## 🎯 功能說明

- **用戶認證**: 註冊、登入、登出、密碼重設
- **個人資料**: 查看和編輯個人資料、頭像上傳
- **內容瀏覽**: 動態牆、貼文詳情、限時動態、影片
- **互動功能**: 點讚、評論、分享、收藏
- **訂閱系統**: 瀏覽創作者、訂閱管理、訂閱方案
- **支付功能**: 打賞、內容購買、支付歷史
- **即時訊息**: WebSocket 實時聊天
- **通知中心**: 站內通知、推播通知
- **搜尋功能**: 用戶搜尋、內容搜尋、標籤搜尋
- **個人中心**: 我的訂閱、收藏、錢包

## 🚀 端口和技術棧

- **端口**: `4200`
- **框架**: Next.js 14 (App Router)
- **語言**: TypeScript
- **樣式**: Tailwind CSS
- **狀態管理**: React Query (TanStack Query)
- **HTTP 客戶端**: Axios (透過 `@suggar-daddy/api-client`)
- **WebSocket**: Socket.IO Client
- **表單**: React Hook Form + Zod
- **UI 元件**: 自定義元件（來自 `@suggar-daddy/ui`）

## ⚙️ 環境變數

創建 `.env.local` 檔案：

```bash
# API 端點
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3005

# 應用設定
NEXT_PUBLIC_APP_NAME=Sugar Daddy
NEXT_PUBLIC_APP_URL=http://localhost:4200

# Stripe (客戶端金鑰)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Cloudinary (如果前端直接上傳)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-preset

# Google Analytics (可選)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Feature Flags (可選)
NEXT_PUBLIC_FEATURE_STORIES=true
NEXT_PUBLIC_FEATURE_VIDEOS=true
NEXT_PUBLIC_FEATURE_TIPS=true
```

## 💻 本地開發指令

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
nx serve web
# 或
npm run dev

# 建置生產版本
nx build web
# 或
npm run build

# 啟動生產伺服器
npm run start

# Lint 檢查
nx lint web

# 類型檢查
npm run type-check

# 格式化程式碼
npm run format
```

## 📁 目錄結構

```
apps/web/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/            # 認證相關頁面
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (main)/            # 主應用頁面
│   │   ├── feed/          # 動態牆
│   │   ├── profile/       # 個人資料
│   │   ├── messages/      # 訊息
│   │   ├── notifications/ # 通知
│   │   ├── search/        # 搜尋
│   │   └── layout.tsx
│   ├── creator/           # 創作者頁面
│   │   └── [username]/
│   ├── post/              # 貼文詳情
│   │   └── [postId]/
│   ├── subscribe/         # 訂閱頁面
│   ├── api/               # API Routes (極少使用)
│   ├── layout.tsx         # 根 Layout
│   ├── page.tsx           # 首頁
│   └── globals.css        # 全域樣式
├── components/            # React 元件
│   ├── common/            # 通用元件
│   ├── feed/              # 動態牆元件
│   ├── post/              # 貼文元件
│   ├── user/              # 用戶元件
│   └── layout/            # Layout 元件
├── lib/                   # 工具函數
│   ├── api-client.ts      # API 客戶端設定
│   ├── auth.ts            # 認證工具
│   ├── websocket.ts       # WebSocket 設定
│   └── utils.ts           # 通用工具
├── hooks/                 # Custom Hooks
│   ├── useAuth.ts
│   ├── useWebSocket.ts
│   └── useInfiniteScroll.ts
├── types/                 # TypeScript 類型
├── public/                # 靜態資源
├── next.config.js         # Next.js 配置
├── tailwind.config.js     # Tailwind 配置
└── tsconfig.json          # TypeScript 配置
```

## 🔐 認證流程

### JWT Token 管理

```typescript
// lib/auth.ts
export const setAuthToken = (token: string) => {
  localStorage.setItem('auth_token', token);
  // 設定到 API Client
  apiClient.setAuthToken(token);
};

export const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

export const clearAuthToken = () => {
  localStorage.removeItem('auth_token');
};
```

### 保護路由

```typescript
// app/(main)/layout.tsx
export default function MainLayout({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <LoadingSpinner />;
  
  if (!isAuthenticated) {
    redirect('/login');
  }
  
  return <>{children}</>;
}
```

## 🌐 API 整合

使用 `@suggar-daddy/api-client` 套件：

```typescript
import { apiClient } from '@suggar-daddy/api-client';

// 取得動態牆
const { data } = await apiClient.posts.getFeed({
  page: 1,
  limit: 20
});

// 點讚貼文
await apiClient.posts.likePost(postId);

// 訂閱創作者
await apiClient.subscriptions.subscribe({
  tierId: 'uuid',
  paymentMethodId: 'pm_xxx'
});
```

## 📡 WebSocket 整合

```typescript
// hooks/useWebSocket.ts
import { useEffect } from 'react';
import { io } from 'socket.io-client';

export const useWebSocket = () => {
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL, {
      auth: {
        token: getAuthToken()
      }
    });

    socket.on('message:new', handleNewMessage);
    socket.on('notification:new', handleNotification);

    return () => {
      socket.disconnect();
    };
  }, []);
};
```

## 💳 Stripe 整合

```typescript
// components/payment/CheckoutForm.tsx
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

export function TipForm({ creatorId, amount }) {
  const stripe = useStripe();
  
  const handleSubmit = async () => {
    // 創建 Payment Intent
    const { clientSecret } = await apiClient.tips.createPaymentIntent({
      creatorId,
      amount
    });
    
    // 確認支付
    const { error } = await stripe.confirmCardPayment(clientSecret);
    
    if (error) {
      showError(error.message);
    } else {
      showSuccess('Tip sent successfully!');
    }
  };
  
  return (
    <Elements stripe={stripePromise}>
      <CardElement />
      <button onClick={handleSubmit}>Send Tip</button>
    </Elements>
  );
}
```

## 🎨 樣式和主題

### Tailwind 配置

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    '../../libs/ui/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          // ...
          900: '#7f1d1d',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
```

### 深色模式

```typescript
// components/ThemeToggle.tsx
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? '🌞' : '🌙'}
    </button>
  );
}
```

## 📱 響應式設計

使用 Tailwind 的響應式斷點：

```jsx
<div className="
  grid grid-cols-1      // Mobile
  md:grid-cols-2        // Tablet
  lg:grid-cols-3        // Desktop
  gap-4
">
  {posts.map(post => <PostCard key={post.id} post={post} />)}
</div>
```

## 🔄 狀態管理

使用 React Query (TanStack Query)：

```typescript
// hooks/usePosts.ts
import { useInfiniteQuery } from '@tanstack/react-query';

export const useFeed = () => {
  return useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = 1 }) => 
      apiClient.posts.getFeed({ page: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => 
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });
};

// 使用
const { data, fetchNextPage, hasNextPage, isLoading } = useFeed();
```

## 🖼️ 圖片優化

使用 Next.js Image 元件：

```jsx
import Image from 'next/image';

<Image
  src={user.avatarUrl}
  alt={user.username}
  width={48}
  height={48}
  className="rounded-full"
  placeholder="blur"
  blurDataURL="/placeholder.png"
/>
```

## 🧪 測試

```bash
# 單元測試 (Jest + React Testing Library)
npm run test

# E2E 測試 (Playwright)
npm run test:e2e

# 覆蓋率報告
npm run test:coverage
```

## 📦 建置和部署

```bash
# 建置
npm run build

# 分析打包大小
npm run analyze

# 部署到 Vercel
vercel deploy

# 部署到 Docker
docker build -t suggar-daddy-web .
docker run -p 4200:3000 suggar-daddy-web
```

## 🚀 效能優化

### 程式碼分割

```typescript
// 動態導入大型元件
import dynamic from 'next/dynamic';

const VideoPlayer = dynamic(() => import('@/components/VideoPlayer'), {
  loading: () => <VideoSkeleton />,
  ssr: false
});
```

### 預渲染

```typescript
// app/creator/[username]/page.tsx
export async function generateStaticParams() {
  const creators = await getPopularCreators();
  
  return creators.map((creator) => ({
    username: creator.username,
  }));
}
```

## 🔍 SEO 優化

```typescript
// app/creator/[username]/page.tsx
export async function generateMetadata({ params }) {
  const creator = await getCreator(params.username);
  
  return {
    title: `${creator.displayName} - Sugar Daddy`,
    description: creator.bio,
    openGraph: {
      images: [creator.avatarUrl],
    },
  };
}
```

## 📚 相關文檔

- [Next.js 14 文檔](https://nextjs.org/docs)
- [Tailwind CSS 文檔](https://tailwindcss.com/docs)
- [React Query 文檔](https://tanstack.com/query/latest)
- [Stripe 整合](../../docs/STRIPE.md)
- [API 文檔](../../docs/02-開發指南.md)

## 🤝 依賴服務

- **API Gateway**: 所有 API 請求
- **Messaging Service**: WebSocket 連接
- **Stripe**: 支付處理

## 🚨 已知問題

- 離線支援（PWA）待實作
- 圖片延遲載入優化
- 無限滾動效能待優化
- SEO 元數據待完善

## 📝 開發注意事項

1. **API 路由代理**: 開發環境使用 `next.config.js` 的 rewrites 代理 API
2. **環境變數**: 客戶端變數必須以 `NEXT_PUBLIC_` 開頭
3. **類型安全**: 使用 `@suggar-daddy/dto` 共享類型定義
4. **錯誤處理**: 使用 Error Boundary 捕捉渲染錯誤
5. **載入狀態**: 所有非同步操作都需顯示載入狀態
6. **無限滾動**: 使用 Intersection Observer API
7. **表單驗證**: 使用 React Hook Form + Zod schema
