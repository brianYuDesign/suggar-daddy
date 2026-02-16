# 🚀 性能優化計劃

**規劃日期**: 2024-01-XX  
**目標**: 提升前端應用性能和用戶體驗  
**負責人**: Frontend Developer Team

---

## 📋 執行摘要

本文檔詳細規劃了 Sugar Daddy 平台前端的性能優化方案，涵蓋打包優化、運行時性能、網絡性能和代碼重構四個維度。

### 性能目標

| 指標 | 當前 | 目標 | 改善 |
|-----|------|------|------|
| **First Contentful Paint (FCP)** | ~2.5s | < 1.5s | -40% |
| **Largest Contentful Paint (LCP)** | ~4.0s | < 2.5s | -38% |
| **Time to Interactive (TTI)** | ~5.5s | < 3.5s | -36% |
| **Total Blocking Time (TBT)** | ~400ms | < 200ms | -50% |
| **Cumulative Layout Shift (CLS)** | 0.15 | < 0.1 | -33% |
| **Bundle Size** | ~1.2MB | < 800KB | -33% |

---

## 1. 打包和構建優化

### 1.1 Next.js 配置優化

#### 當前配置

```javascript
// apps/web/next.config.js
const nextConfig = {
  nx: {
    svgr: false,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@suggar-daddy/auth': false,
        '@nestjs/common': false,
        '@nestjs/core': false,
        '@nestjs/platform-express': false,
        'class-validator': false,
        'class-transformer': false,
        typeorm: false,
      };
    }
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });
    return config;
  },
  transpilePackages: [],
};
```

#### 優化方案

```javascript
// apps/web/next.config.js - 優化版本
const nextConfig = {
  // ✨ 圖片優化
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    domains: ['cdn.suggar-daddy.com'], // CDN 域名
  },

  // ✨ 壓縮和優化
  compress: true,
  swcMinify: true,
  productionBrowserSourceMaps: false,

  // ✨ 實驗性功能
  experimental: {
    optimizePackageImports: [
      '@suggar-daddy/ui',
      'lucide-react',
      'date-fns',
    ],
    optimizeCss: true,
  },

  // ✨ 構建優化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // ✨ 頁面重定向優化
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/api/:path*',
      },
    ];
  },

  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@suggar-daddy/auth': false,
        '@nestjs/common': false,
        '@nestjs/core': false,
        '@nestjs/platform-express': false,
        'class-validator': false,
        'class-transformer': false,
        typeorm: false,
      };
    }

    // ✨ 代碼分割優化
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // UI 組件單獨打包
          ui: {
            name: 'ui',
            test: /[\\/]node_modules[\\/](@suggar-daddy\/ui|lucide-react)[\\/]/,
            priority: 40,
            reuseExistingChunk: true,
          },
          // 工具庫單獨打包
          lib: {
            name: 'lib',
            test: /[\\/]node_modules[\\/](date-fns|zod|react-hook-form)[\\/]/,
            priority: 30,
            reuseExistingChunk: true,
          },
          // 共用代碼
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
            reuseExistingChunk: true,
          },
        },
      },
    };

    // ✨ 分析工具（開發環境）
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: './analyze.html',
        })
      );
    }

    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    return config;
  },

  transpilePackages: [],
};

module.exports = nextConfig;
```

**預期收益**:
- Bundle 大小減少 25-30%
- 首屏加載時間減少 30%
- 代碼分割更合理

**預估工作量**: 3 小時  
**優先級**: 🔴 高

---

### 1.2 動態導入（Code Splitting）

#### 問題分析

當前所有組件都靜態導入，導致初始 bundle 過大。

#### 優化方案

```typescript
// ❌ 靜態導入 - 所有組件都在初始 bundle
import { StoryViewer } from '@/components/stories/story-viewer';
import { TipModal } from '@/app/components/TipModal';
import { DateRangePicker } from '@/components/date-range-picker';

// ✅ 動態導入 - 按需加載
import dynamic from 'next/dynamic';

const StoryViewer = dynamic(
  () => import('@/components/stories/story-viewer').then(mod => ({ default: mod.StoryViewer })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />,
    ssr: false, // 僅客戶端渲染
  }
);

const TipModal = dynamic(
  () => import('@/app/components/TipModal').then(mod => ({ default: mod.TipModal })),
  {
    loading: () => null,
    ssr: false,
  }
);

const DateRangePicker = dynamic(
  () => import('@/components/date-range-picker'),
  {
    loading: () => <Skeleton className="h-10 w-full" />,
  }
);
```

#### 應該動態加載的組件

| 組件 | 原因 | 預期節省 |
|-----|------|---------|
| StoryViewer | 不是所有用戶都查看 Story | ~50KB |
| TipModal | 低頻使用 | ~30KB |
| DateRangePicker | Admin 專用 | ~40KB |
| CSVExport | Admin 低頻功能 | ~35KB |
| SimpleChart | Admin Dashboard | ~60KB |
| TakeDownDialog | Admin 低頻操作 | ~20KB |

**預期收益**: 初始 bundle 減少 ~235KB  
**預估工作量**: 4 小時  
**優先級**: 🔴 高

---

### 1.3 圖片優化

#### 當前問題

```tsx
// ❌ 使用原始 <img> 標籤
<img
  src={url}
  alt={`Media ${idx + 1}`}
  className="h-full w-full object-cover"
/>
```

#### 優化方案

```tsx
// ✅ 使用 Next.js Image
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
  blurDataURL={generateBlurDataURL(url)}
  quality={75}
/>

// 生成模糊佔位符
function generateBlurDataURL(url: string): string {
  // 使用 plaiceholder 或類似庫生成
  return `data:image/svg+xml;base64,...`;
}
```

#### CDN 配置

```typescript
// lib/image-loader.ts
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  const params = new URLSearchParams({
    url: src,
    w: width.toString(),
    q: (quality || 75).toString(),
  });
  
  return `https://cdn.suggar-daddy.com/_next/image?${params.toString()}`;
}

// next.config.js
module.exports = {
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
  },
};
```

**預期收益**:
- 圖片體積減少 40-50%
- 加載速度提升 35%
- 自動格式轉換（WebP/AVIF）

**預估工作量**: 6 小時  
**優先級**: 🔴 高

---

## 2. 運行時性能優化

### 2.1 React 組件渲染優化

#### 問題 2.1.1: Feed 頁面重新渲染

**當前代碼** (`apps/web/app/(main)/feed/page.tsx`):

```tsx
// ❌ PostCard 每次都重新渲染
function PostCard({ post, currentUserId, onLikeToggle, likedPosts }: PostCardProps) {
  // 沒有 memo
  return (...);
}

// ❌ 作者名稱載入效率低
useEffect(() => {
  const unknownIds = state.posts
    .map((p) => p.authorId)
    .filter((id) => !authorNames[id]);
  
  Promise.all(
    uniqueIds.map(async (id) => {
      const profile = await usersApi.getProfile(id);
      return [id, profile.displayName] as const;
    })
  ).then(...)
}, [state.posts]); // ❌ 依賴整個數組
```

**優化方案**:

```tsx
// ✅ 使用 memo 和自定義比較
const PostCard = memo(function PostCard({
  post,
  currentUserId,
  onLikeToggle,
  isLiked,
  authorName,
}: PostCardProps) {
  const isOwner = currentUserId === post.authorId;
  const isLocked = post.isPremium && !isOwner;

  return (
    <Card className="relative overflow-hidden">
      {/* ... */}
    </Card>
  );
}, (prevProps, nextProps) => {
  // 自定義比較邏輯 - 只比較必要的屬性
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.authorName === nextProps.authorName &&
    prevProps.currentUserId === nextProps.currentUserId
  );
});

// ✅ 優化作者信息加載
const authorIds = useMemo(
  () => state.posts.map((p) => p.authorId),
  [state.posts]
);

useEffect(() => {
  const abortController = new AbortController();
  
  const unknownIds = authorIds.filter((id) => !authorNames[id]);
  const uniqueIds = [...new Set(unknownIds)];
  
  if (uniqueIds.length === 0) return;

  // ✅ 批量 API（如果後端支持）
  const loadAuthors = async () => {
    try {
      const profiles = await usersApi.getProfiles(uniqueIds);
      setAuthorNames((prev) => ({
        ...prev,
        ...Object.fromEntries(
          profiles.map((p) => [p.id, p.displayName])
        ),
      }));
    } catch (error) {
      if (error instanceof Error && error.message !== 'cancelled') {
        console.error('Failed to load author names:', error);
      }
    }
  };

  loadAuthors();

  return () => {
    abortController.abort();
  };
}, [authorIds, authorNames]);

// ✅ 穩定的回調
const handleLikeToggle = useCallback(async (postId: string) => {
  const isCurrentlyLiked = likedPosts.has(postId);

  // 樂觀更新
  setLikedPosts((prev) => {
    const next = new Set(prev);
    isCurrentlyLiked ? next.delete(postId) : next.add(postId);
    return next;
  });

  try {
    isCurrentlyLiked
      ? await contentApi.unlikePost(postId)
      : await contentApi.likePost(postId);
  } catch {
    // 回滾
    setLikedPosts((prev) => {
      const next = new Set(prev);
      isCurrentlyLiked ? next.add(postId) : next.delete(postId);
      return next;
    });
  }
}, [likedPosts]);
```

**預期收益**:
- 重新渲染減少 60%
- 交互響應速度提升 40%
- API 請求減少 50%（批量加載）

**預估工作量**: 4 小時  
**優先級**: 🔴 高

---

### 2.2 虛擬滾動

#### 當前問題

長列表（如 Feed、Messages）加載所有項目，導致 DOM 節點過多。

#### 優化方案

```typescript
// hooks/useVirtualScroll.ts
import { useEffect, useRef, useState } from 'react';

interface UseVirtualScrollOptions {
  itemHeight: number;
  overscan?: number;
}

export function useVirtualScroll<T>(
  items: T[],
  options: UseVirtualScrollOptions
) {
  const { itemHeight, overscan = 3 } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });

    container.addEventListener('scroll', handleScroll, { passive: true });
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / itemHeight) - overscan
  );
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex).map((item, i) => ({
    item,
    index: startIndex + i,
  }));

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
  };
}

// 使用
function FeedPage() {
  const { posts } = useFeed();
  const { containerRef, visibleItems, totalHeight, offsetY } = useVirtualScroll(
    posts,
    { itemHeight: 400, overscan: 2 }
  );

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-auto"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <PostCard key={item.id} post={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

**預期收益**:
- 初始渲染時間減少 70%
- 滾動性能提升 80%
- 內存使用減少 60%

**預估工作量**: 6 小時  
**優先級**: 🟠 中

---

## 3. 網絡性能優化

### 3.1 API 請求優化

#### 3.1.1 請求去重

```typescript
// libs/api-client/src/dedup.ts
type CacheEntry = {
  promise: Promise<unknown>;
  timestamp: number;
};

const cache = new Map<string, CacheEntry>();
const TTL = 10000; // 10 秒

export function withRequestDedup<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  generateKey: (...args: Parameters<T>) => string
): T {
  return ((...args: Parameters<T>) => {
    const key = generateKey(...args);
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < TTL) {
      return cached.promise;
    }

    const promise = fn(...args);
    cache.set(key, { promise, timestamp: Date.now() });

    promise.finally(() => {
      setTimeout(() => cache.delete(key), TTL);
    });

    return promise;
  }) as T;
}

// 使用
export const usersApi = {
  getProfile: withRequestDedup(
    (id: string) => apiClient.get(`/users/${id}`),
    (id) => `user:${id}`
  ),
};
```

**預期收益**: 重複請求減少 80%  
**預估工作量**: 3 小時

---

#### 3.1.2 批量 API 端點

```typescript
// libs/api-client/src/lib/users-api.ts
export class UsersApi {
  // ✨ 新增批量獲取端點
  async getProfiles(userIds: string[]): Promise<UserProfile[]> {
    const response = await this.httpClient.get('/users/batch', {
      params: { ids: userIds.join(',') },
    });
    return response.data;
  }

  // ✨ 分頁消息
  async getMessages(
    conversationId: string,
    limit = 50,
    offset = 0
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const response = await this.httpClient.get(
      `/conversations/${conversationId}/messages`,
      { params: { limit, offset } }
    );
    return response.data;
  }
}
```

**預期收益**: API 請求減少 50%  
**預估工作量**: 後端 6 小時 + 前端 3 小時

---

### 3.2 數據預取

```typescript
// hooks/usePrefetch.ts
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function usePrefetch(href: string, prefetch: () => Promise<void>) {
  const router = useRouter();

  useEffect(() => {
    // 當鼠標懸停時預取
    const link = document.querySelector(`a[href="${href}"]`);
    
    if (!link) return;

    const handleMouseEnter = () => {
      prefetch();
    };

    link.addEventListener('mouseenter', handleMouseEnter);
    return () => link.removeEventListener('mouseenter', handleMouseEnter);
  }, [href, prefetch]);
}

// 使用
function UserCard({ userId }: { userId: string }) {
  usePrefetch(`/user/${userId}`, async () => {
    await usersApi.getProfile(userId);
  });

  return (
    <Link href={`/user/${userId}`}>
      <Card>{/* ... */}</Card>
    </Link>
  );
}
```

**預期收益**: 頁面跳轉速度提升 40%  
**預估工作量**: 4 小時

---

## 4. 代碼重構

### 4.1 提取通用 Hook

```typescript
// hooks/useInfiniteList.ts
import { useCallback, useState } from 'react';

interface UseInfiniteListOptions<T> {
  fetchFn: (cursor?: string) => Promise<{
    items: T[];
    nextCursor?: string;
  }>;
}

export function useInfiniteList<T>(options: UseInfiniteListOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(
    async (cursor?: string) => {
      const isMore = !!cursor;
      isMore ? setIsLoadingMore(true) : setIsLoading(true);

      try {
        const result = await options.fetchFn(cursor);
        setItems((prev) =>
          isMore ? [...prev, ...result.items] : result.items
        );
        setNextCursor(result.nextCursor);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading data');
      } finally {
        isMore ? setIsLoadingMore(false) : setIsLoading(false);
      }
    },
    [options]
  );

  const loadMore = useCallback(() => {
    if (nextCursor && !isLoadingMore) {
      fetch(nextCursor);
    }
  }, [nextCursor, isLoadingMore, fetch]);

  return {
    items,
    isLoading,
    isLoadingMore,
    error,
    fetch,
    loadMore,
    hasMore: !!nextCursor,
  };
}
```

**預期收益**: 代碼重複減少 30%  
**預估工作量**: 4 小時

---

## 5. 實施計劃

### Phase 1: 快速優化（Week 1）

| 任務 | 預估時間 | 負責人 |
|-----|---------|-------|
| Next.js 配置優化 | 3h | Developer A |
| 動態導入優化 | 4h | Developer B |
| Feed 頁面優化 | 4h | Developer C |
| 圖片優化 | 6h | Developer A |

**總計**: 17 小時

### Phase 2: 深度優化（Week 2-3）

| 任務 | 預估時間 |
|-----|---------|
| 批量 API 端點 | 9h |
| 請求去重 | 3h |
| 數據預取 | 4h |
| 虛擬滾動 | 6h |

**總計**: 22 小時

### Phase 3: 重構和完善（Week 4）

| 任務 | 預估時間 |
|-----|---------|
| 提取通用 Hook | 4h |
| 性能監控 | 3h |
| 文檔更新 | 2h |

**總計**: 9 小時

---

## 6. 性能監控

### 6.1 Core Web Vitals 監控

```typescript
// lib/performance.ts
export function reportWebVitals(metric: any) {
  // 發送到分析服務
  console.log(metric);
  
  // 也可以發送到後端
  if (metric.label === 'web-vital') {
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    });
  }
}

// app/layout.tsx
export { reportWebVitals };
```

---

**報告編制**: Frontend Developer Team  
**版本**: 1.0  
**日期**: 2024-01-XX
