# FRONT-002 組件 API 參考

完整的 FRONT-002 組件 API 文檔，包括所有組件、類型定義和使用示例。

## 目錄

1. [類型定義](#類型定義)
2. [Creator 組件](#creator-組件)
3. [Upload 組件](#upload-組件)
4. [Content 組件](#content-組件)
5. [Settings 組件](#settings-組件)
6. [Analytics 組件](#analytics-組件)
7. [使用示例](#使用示例)
8. [集成指南](#集成指南)

---

## 類型定義

### Creator 類型
```typescript
interface Creator {
  id: string;                  // 唯一標識
  name: string;               // 創作者名稱
  avatar: string;             // 頭像 URL
  bio: string;                // 簡介
  verified: boolean;          // 是否驗證
  followers: number;          // 粉絲數
  totalViews: number;         // 總觀看數
  totalEarnings: number;      // 總收入
  subscriptionPrice?: number; // 訂閱價格
  joinDate: string;           // 加入日期 (ISO 8601)
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    website?: string;
  };
}
```

### Content 類型
```typescript
interface Content {
  id: string;                           // 唯一標識
  creatorId: string;                    // 創作者 ID
  title: string;                        // 標題
  description: string;                  // 描述
  thumbnail: string;                    // 縮略圖 URL
  type: 'video' | 'image' | 'audio' | 'text'; // 內容類型
  duration?: number;                    // 時長（秒）
  views: number;                        // 觀看數
  likes: number;                        // 贊數
  comments: number;                     // 評論數
  tags: string[];                       // 標籤
  status: 'draft' | 'published' | 'archived'; // 狀態
  createdAt: string;                    // 創建時間 (ISO 8601)
  updatedAt: string;                    // 更新時間 (ISO 8601)
  price?: number;                       // 價格
}
```

### UploadProgress 類型
```typescript
interface UploadProgress {
  fileId: string;                                    // 檔案 ID
  fileName: string;                                  // 檔案名稱
  progress: number;                                  // 進度 (0-100)
  status: 'pending' | 'uploading' | 'completed' | 'failed'; // 狀態
  size: number;                                     // 檔案大小（字節）
  uploadedSize: number;                             // 已上傳大小（字節）
  error?: string;                                   // 錯誤信息
}
```

### CreatorSettings 類型
```typescript
interface CreatorSettings {
  id: string;                           // 唯一標識
  creatorId: string;                    // 創作者 ID
  subscriptionPrice: number;            // 訂閱價格
  subscriptionDescription: string;      // 訂閱描述
  emailNotifications: boolean;          // 電郵通知
  publicProfile: boolean;               // 公開資料
  allowComments: boolean;               // 允許評論
  autoPublish: boolean;                 // 自動發佈
  bankAccount?: {
    accountHolder: string;              // 帳戶持有人
    accountNumber: string;              // 帳戶號碼
    bankName: string;                   // 銀行名稱
  };
}
```

### Analytics 類型
```typescript
interface Analytics {
  period: 'day' | 'week' | 'month' | 'year';
  totalViews: number;                   // 總觀看數
  totalEarnings: number;                // 總收入
  newSubscribers: number;               // 新訂閱者
  averageEngagement: number;            // 平均參與度（百分比）
  topContent: Content[];                // 熱門內容
  viewsOverTime: { date: string; views: number }[];
  earningsOverTime: { date: string; earnings: number }[];
}
```

---

## Creator 組件

### CreatorProfile

**描述**: 完整的創作者資料展示組件

**道具**:
```typescript
interface CreatorProfileProps {
  creatorId: string;  // 創作者 ID
}
```

**特性**:
- 頭像和基本信息展示
- 驗證徽章
- 統計卡片（粉絲、觀看、收入）
- 社交連結
- 跟隨按鈕

**示例**:
```tsx
import CreatorProfile from '@/components/creator/CreatorProfile';

export default function Page({ params }) {
  return <CreatorProfile creatorId={params.id} />;
}
```

**API 集成**:
```typescript
// 在 useEffect 中替換 mock 數據：
useEffect(() => {
  fetch(`/api/creators/${creatorId}`)
    .then(res => res.json())
    .then(data => setCreator(data));
}, [creatorId]);
```

---

### StatCard

**描述**: 統計信息卡片，用於顯示關鍵指標

**道具**:
```typescript
interface StatCardProps {
  title: string;              // 卡片標題
  value: string | number;     // 顯示的值
  unit?: string;             // 單位 (如 "K", "$", "%")
  trend?: string;            // 趨勢文本 (如 "+12%")
  color?: 'blue' | 'green' | 'purple' | 'pink'; // 主題顏色
}
```

**特性**:
- 4 種顏色主題
- 顯示值、單位和趨勢
- 懸停陰影效果
- 響應式設計

**示例**:
```tsx
import StatCard from '@/components/creator/StatCard';

<StatCard
  title="Total Views"
  value={1500}
  unit="K"
  trend="+12%"
  color="blue"
/>
```

---

### FollowButton

**描述**: 創作者跟隨/取消跟隨按鈕

**道具**:
```typescript
interface FollowButtonProps {
  isFollowing: boolean;     // 是否已跟隨
  onToggle: () => void;     // 切換回調
}
```

**特性**:
- 切換跟隨狀態
- 不同的視覺反饋
- ARIA 無障礙屬性
- 響應式尺寸

**示例**:
```tsx
import FollowButton from '@/components/creator/FollowButton';

const [isFollowing, setIsFollowing] = useState(false);

<FollowButton
  isFollowing={isFollowing}
  onToggle={() => setIsFollowing(!isFollowing)}
/>
```

---

## Upload 組件

### UploadCenter

**描述**: 完整的上傳中心頁面組件

**道具**: 無

**特性**:
- 拖拽上傳支持
- 檔案選擇
- 上傳進度追蹤
- 中斷和重試功能
- 上傳歷史記錄

**示例**:
```tsx
import UploadCenter from '@/components/upload/UploadCenter';

export default function UploadPage() {
  return <UploadCenter />;
}
```

---

### FileUploadZone

**描述**: 拖拽上傳區域組件

**道具**:
```typescript
interface FileUploadZoneProps {
  isDragging: boolean;           // 是否正在拖拽
  onDragOver: (e: DragEvent) => void;   // 拖拽進入
  onDragLeave: () => void;       // 拖拽離開
  onDrop: (e: DragEvent) => void;       // 放開檔案
  onSelectFiles: () => void;     // 選擇檔案按鈕
}
```

**特性**:
- 拖拽視覺反饋
- 檔案類型提示
- 檔案大小限制提示
- 瀏覽按鈕

**示例**:
```tsx
import FileUploadZone from '@/components/upload/FileUploadZone';

<FileUploadZone
  isDragging={isDragging}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  onSelectFiles={handleSelect}
/>
```

---

### UploadProgressItem

**描述**: 單個上傳進度顯示組件

**道具**:
```typescript
interface UploadProgressItemProps {
  upload: UploadProgress;    // 上傳進度信息
  onCancel: () => void;      // 中斷上傳
  onRetry: () => void;       // 重試上傳
}
```

**特性**:
- 進度條動畫
- 檔案大小顯示
- 中斷和重試按鈕
- 狀態指示器

**示例**:
```tsx
import UploadProgressItem from '@/components/upload/UploadProgressItem';

<UploadProgressItem
  upload={uploadProgress}
  onCancel={() => handleCancel(uploadProgress.fileId)}
  onRetry={() => handleRetry(uploadProgress.fileId)}
/>
```

---

## Content 組件

### ContentManagement

**描述**: 完整的內容管理頁面

**道具**: 無

**特性**:
- 內容列表顯示
- 內容編輯
- 狀態篩選
- 內容刪除
- 新建內容

**示例**:
```tsx
import ContentManagement from '@/components/content/ContentManagement';

export default function ContentPage() {
  return <ContentManagement />;
}
```

---

### ContentCard

**描述**: 內容卡片展示組件

**道具**:
```typescript
interface ContentCardProps {
  content: Content;          // 內容對象
  onEdit: () => void;        // 編輯回調
  onDelete: () => void;      // 刪除回調
}
```

**特性**:
- 縮略圖展示
- 標題和描述
- 統計數據（觀看、贊、評論）
- 標籤顯示
- 價格顯示
- 編輯和刪除按鈕

**示例**:
```tsx
import ContentCard from '@/components/content/ContentCard';

<ContentCard
  content={content}
  onEdit={() => handleEdit(content.id)}
  onDelete={() => handleDelete(content.id)}
/>
```

---

### ContentEditor

**描述**: 內容編輯表單組件

**道具**:
```typescript
interface ContentEditorProps {
  content?: Content;                    // 要編輯的內容（可選）
  onSave: (content: Content) => void;   // 保存回調
  onCancel: () => void;                 // 取消回調
}
```

**特性**:
- 標題輸入驗證
- 描述輸入驗證
- 類型選擇
- 標籤管理（添加/移除）
- 價格設定
- 狀態選擇
- 完整的表單驗證

**示例**:
```tsx
import ContentEditor from '@/components/content/ContentEditor';

<ContentEditor
  content={editingContent}
  onSave={handleSave}
  onCancel={handleCancel}
/>
```

**表單驗證規則**:
- 標題：必填，非空
- 描述：必填，非空
- 價格：可選，大於 0

---

## Settings 組件

### SettingsPage

**描述**: 完整的設置頁面

**道具**: 無

**特性**:
- 選項卡導航
- 一般設置
- 訂閱定價設置
- 支付方式管理

**示例**:
```tsx
import SettingsPage from '@/components/settings/SettingsPage';

export default function Settings() {
  return <SettingsPage />;
}
```

---

### SettingsPanel

**描述**: 一般設置面板

**道具**:
```typescript
interface SettingsPanelProps {
  settings: CreatorSettings;                    // 當前設置
  onSave: (settings: CreatorSettings) => void;  // 保存回調
}
```

**切換項**:
- 電郵通知
- 公開資料
- 允許評論
- 自動發佈

**特性**:
- 切換開關
- 實時保存
- 成功提示

**示例**:
```tsx
import SettingsPanel from '@/components/settings/SettingsPanel';

<SettingsPanel
  settings={settings}
  onSave={handleSave}
/>
```

---

### SubscriptionPricingPanel

**描述**: 訂閱定價設置面板

**道具**:
```typescript
interface SubscriptionPricingPanelProps {
  settings: CreatorSettings;
  onSave: (settings: CreatorSettings) => void;
}
```

**特性**:
- 價格輸入
- 建議價格快捷按鈕
- 訂閱描述編輯
- 實時預覽
- 功能列表

**建議價格**:
- $4.99
- $9.99
- $19.99
- $29.99

**示例**:
```tsx
import SubscriptionPricingPanel from '@/components/settings/SubscriptionPricingPanel';

<SubscriptionPricingPanel
  settings={settings}
  onSave={handleSave}
/>
```

---

## Analytics 組件

### AnalyticsDashboard

**描述**: 完整的分析儀表板

**道具**: 無

**特性**:
- 統計卡片
- 時間段選擇
- 視圖趨勢圖
- 收入趨勢圖
- 熱門內容列表

**示例**:
```tsx
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
```

---

### AnalyticsChart

**描述**: 分析圖表組件

**道具**:
```typescript
interface AnalyticsChartProps {
  title: string;                // 圖表標題
  data: ChartDataPoint[];        // 數據點
  dataKey: string;               // 數據鍵名（如 'views', 'earnings'）
  color: string;                 // 條形顏色 (十六進制)
}

interface ChartDataPoint {
  date: string;                  // ISO 日期格式
  [key: string]: string | number; // 動態數據鍵
}
```

**特性**:
- 柱狀圖展示
- 總計統計
- 平均值計算
- 峰值顯示
- 響應式設計

**示例**:
```tsx
import AnalyticsChart from '@/components/analytics/AnalyticsChart';

const data = [
  { date: '2026-02-11', views: 5200 },
  { date: '2026-02-12', views: 7100 },
  { date: '2026-02-13', views: 6800 },
];

<AnalyticsChart
  title="Views Over Time"
  data={data}
  dataKey="views"
  color="#8b5cf6"
/>
```

---

## 使用示例

### 完整的創作者中心集成

```tsx
'use client';

import React, { useState } from 'react';
import CreatorProfile from '@/components/creator/CreatorProfile';
import ContentManagement from '@/components/content/ContentManagement';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export default function CreatorDashboard() {
  const [activeTab, setActiveTab] = useState('profile');
  const creatorId = 'creator1';

  return (
    <div>
      <nav>
        <button onClick={() => setActiveTab('profile')}>Profile</button>
        <button onClick={() => setActiveTab('content')}>Content</button>
        <button onClick={() => setActiveTab('analytics')}>Analytics</button>
      </nav>

      {activeTab === 'profile' && (
        <CreatorProfile creatorId={creatorId} />
      )}
      {activeTab === 'content' && (
        <ContentManagement />
      )}
      {activeTab === 'analytics' && (
        <AnalyticsDashboard />
      )}
    </div>
  );
}
```

---

## 集成指南

### 1. 後端 API 集成

替換所有 `mock` 數據為真實 API 調用：

```typescript
// ContentManagement.tsx
useEffect(() => {
  const fetchContents = async () => {
    try {
      const res = await fetch(`/api/creators/${creatorId}/contents`);
      const data = await res.json();
      setContents(data);
    } catch (error) {
      console.error('Failed to fetch contents:', error);
    }
  };

  fetchContents();
}, [creatorId]);
```

### 2. 檔案上傳集成

實現真實的 multipart 檔案上傳：

```typescript
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const xhr = new XMLHttpRequest();
  
  xhr.upload.addEventListener('progress', (e) => {
    const progress = (e.loaded / e.total) * 100;
    updateUploadProgress(fileId, progress);
  });

  xhr.addEventListener('load', () => {
    if (xhr.status === 200) {
      completeUpload(fileId);
    }
  });

  xhr.open('POST', '/api/uploads');
  xhr.send(formData);
};
```

### 3. 認證集成

添加認證檢查：

```typescript
// 在頁面或佈局中
import { useSession } from 'next-auth/react';

export default function ProtectedPage() {
  const { data: session } = useSession();

  if (!session) {
    return <div>請登錄</div>;
  }

  return <SettingsPage />;
}
```

### 4. 狀態管理集成

如使用 Redux 或 Zustand：

```typescript
// 使用 Zustand store
const useContentStore = create((set) => ({
  contents: [],
  fetchContents: async (creatorId) => {
    const res = await fetch(`/api/contents?creatorId=${creatorId}`);
    const data = await res.json();
    set({ contents: data });
  },
}));

// 在組件中
const contents = useContentStore((state) => state.contents);
```

---

## 測試指南

### 單元測試示例

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import ContentCard from '@/components/content/ContentCard';

describe('ContentCard', () => {
  it('renders content card with title', () => {
    const content = { /* ... */ };
    render(
      <ContentCard
        content={content}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText(content.title)).toBeInTheDocument();
  });
});
```

---

## 常見問題

**Q: 如何自訂組件樣式？**
A: 所有組件使用 Tailwind CSS，修改 `className` 或自訂 Tailwind 配置。

**Q: 如何添加新的統計指標？**
A: 使用 `StatCard` 組件或修改 `AnalyticsChart` 組件。

**Q: 如何實現實時更新？**
A: 在 `useEffect` 中添加 WebSocket 監聽或 polling。

---

**版本**: 1.0.0
**最後更新**: 2026-02-19
