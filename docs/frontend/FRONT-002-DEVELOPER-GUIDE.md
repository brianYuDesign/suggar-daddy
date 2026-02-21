# FRONT-002 開發者指南

**Sugar-Daddy Creator Center - Developer Guide**

如何在 FRONT-002 基礎上進行開發、修改和擴展。

---

## 📖 本指南包含

1. [架構概述](#架構概述)
2. [開發工作流](#開發工作流)
3. [添加新功能](#添加新功能)
4. [修改現有組件](#修改現有組件)
5. [API 集成](#api-集成)
6. [測試指南](#測試指南)
7. [常見任務](#常見任務)
8. [故障排除](#故障排除)

---

## 架構概述

### 項目分層

```
Pages (Next.js App Router)
    ↓
Components (React)
    ↓
Types (TypeScript)
    ↓
Utils & Hooks
```

### 數據流

```
API (Backend)
    ↓
useEffect (數據獲取)
    ↓
Component State
    ↓
Render (UI)
    ↓
User Interaction (Events)
```

### 文件夾組織

```
components/
├── creator/      ← 創作者相關
├── upload/       ← 上傳相關
├── content/      ← 內容管理
├── settings/     ← 設置
├── analytics/    ← 分析
└── common/       ← 共用組件 (未來)
```

---

## 開發工作流

### 1. 設置開發環境

```bash
# 克隆項目
cd frontend

# 安裝依賴
npm install

# 啟動開發服務器
npm run dev

# 訪問 http://localhost:3000
```

### 2. 進行變更

```bash
# 編輯組件
# example: components/creator/StatCard.tsx

# 或編輯頁面
# example: app/creator/[id]/page.tsx
```

### 3. 測試變更

```bash
# 熱重載會自動應用
# 打開瀏覽器查看結果

# 或運行測試
npm test -- StatCard
```

### 4. 提交變更

```bash
# 檢查代碼質量
npm run lint

# 運行所有測試
npm test

# 提交到版本控制
git add .
git commit -m "描述你的變更"
```

---

## 添加新功能

### 場景 1: 添加新頁面

```bash
# 1. 創建頁面文件
touch app/mynewpage/page.tsx

# 2. 創建組件
mkdir components/mynewpage
touch components/mynewpage/MyNewComponent.tsx

# 3. 添加類型定義 (如需要)
# 編輯 types/creator.ts

# 4. 添加類型定義
interface MyNewType { ... }

# 5. 實現組件
# 編輯 components/mynewpage/MyNewComponent.tsx

# 6. 連接到頁面
# 編輯 app/mynewpage/page.tsx

# 7. 添加測試
touch components/mynewpage/MyNewComponent.test.tsx

# 8. 運行測試
npm test
```

### 場景 2: 添加新組件到現有頁面

```bash
# 1. 創建組件
touch components/content/MyNewCard.tsx

# 2. 實現組件
// 使用現有組件作為參考

# 3. 導出組件
export default function MyNewCard() { ... }

# 4. 在頁面中使用
import MyNewCard from '@/components/content/MyNewCard';

// 在 JSX 中使用
<MyNewCard data={data} />

# 5. 添加測試
touch components/content/MyNewCard.test.tsx
```

### 場景 3: 添加新功能到現有組件

```bash
# 1. 修改組件
// 編輯 components/content/ContentCard.tsx

# 2. 更新類型 (如需要)
// 編輯 types/creator.ts

# 3. 更新測試
// 編輯 components/content/ContentCard.test.tsx

# 4. 運行測試確保無斷裂
npm test -- ContentCard
```

---

## 修改現有組件

### 修改組件 Props

```typescript
// 之前
interface MyComponentProps {
  title: string;
}

// 之後 - 添加新 prop
interface MyComponentProps {
  title: string;
  subtitle?: string;    // 新的可選 prop
}
```

### 修改組件樣式

```tsx
// 修改類名
<div className="old-class">
  {/* 變更為 */}
</div>

<div className="new-class">
  {/* 新樣式 */}
</div>
```

### 修改組件行為

```tsx
// 添加新的 event handler
const handleNewAction = () => {
  // 新邏輯
};

// 或修改現有 handler
const handleExisting = () => {
  // 修改的邏輯
};
```

---

## API 集成

### 步驟 1: 識別 Mock 調用

```typescript
// 在組件中查找這樣的代碼
useEffect(() => {
  // Mock data - 需要替換
  const timer = setTimeout(() => {
    setCreator(mockData);
  }, 500);
}, []);
```

### 步驟 2: 替換為 API 調用

```typescript
// 替換為真實 API
useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch(`/api/creators/${creatorId}`);
      const data = await response.json();
      setCreator(data);
    } catch (error) {
      console.error('Failed to fetch creator:', error);
      setError(error.message);
    }
  };

  fetchData();
}, [creatorId]);
```

### 步驟 3: 添加錯誤處理

```typescript
const [error, setError] = useState<string | null>(null);

if (error) {
  return <div className="error-message">{error}</div>;
}
```

### 步驟 4: 添加加載狀態

```typescript
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/creators/${creatorId}`);
      const data = await response.json();
      setCreator(data);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [creatorId]);

if (loading) return <LoadingSpinner />;
```

---

## 測試指南

### 運行測試

```bash
# 運行所有測試
npm test

# 運行特定文件的測試
npm test -- StatCard

# 監視模式（變更時自動重新運行）
npm test -- --watch

# 查看覆蓋率
npm test -- --coverage

# 更新快照（當界面有意改動時）
npm test -- --updateSnapshot
```

### 寫新測試

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from '@/components/path/MyComponent';

describe('MyComponent', () => {
  it('should render the component', () => {
    render(<MyComponent prop="value" />);
    expect(screen.getByText('expected text')).toBeInTheDocument();
  });

  it('should handle click event', () => {
    const handleClick = jest.fn();
    render(<MyComponent onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### 測試常見場景

```typescript
// 異步數據加載
it('should load data on mount', async () => {
  render(<MyComponent />);
  await waitFor(() => {
    expect(screen.getByText('loaded data')).toBeInTheDocument();
  });
});

// 表單提交
it('should submit form', () => {
  render(<FormComponent />);
  fireEvent.change(screen.getByLabelText('input'), { target: { value: 'test' } });
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
  // 驗證結果
});

// 條件渲染
it('should show different content based on state', () => {
  const { rerender } = render(<MyComponent state="loading" />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();

  rerender(<MyComponent state="ready" />);
  expect(screen.getByText('Content')).toBeInTheDocument();
});
```

---

## 常見任務

### 任務 1: 添加新的設置選項

```typescript
// 1. 更新 CreatorSettings 類型
interface CreatorSettings {
  // ... 現有字段
  newOption: boolean;  // 新選項
}

// 2. 在 SettingsPanel 中添加切換
<div className="flex items-center justify-between">
  <div>New Option</div>
  <button
    onClick={() => handleToggle('newOption')}
    // ... 切換按鈕邏輯
  />
</div>

// 3. 添加測試
it('should toggle new option', () => {
  // ... 測試代碼
});
```

### 任務 2: 修改統計卡片的顏色

```typescript
// 方法 1: 直接修改
<StatCard
  title="Views"
  value={1500}
  unit="K"
  color="green"  // 改這裡
/>

// 方法 2: 添加新顏色
// 編輯 components/creator/StatCard.tsx
const colorMap = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  purple: 'from-purple-500 to-purple-600',
  pink: 'from-pink-500 to-pink-600',
  newColor: 'from-cyan-500 to-cyan-600',  // 添加
};
```

### 任務 3: 調整響應式斷點

```tsx
// Tailwind 響應式修飾符
<div className="sm:grid-cols-2 lg:grid-cols-4">
  {/* sm: 640px 以上為 2 列 */}
  {/* lg: 1024px 以上為 4 列 */}
</div>

// 自訂斷點（編輯 tailwind.config.ts）
theme: {
  extend: {
    screens: {
      '2xl': '1400px',  // 添加新斷點
    }
  }
}
```

### 任務 4: 添加新的分析圖表類型

```typescript
// 1. 創建新圖表組件
touch components/analytics/LineChart.tsx

// 2. 實現圖表邏輯
export default function LineChart({ data, dataKey, color }) {
  // 實現折線圖邏輯
}

// 3. 在儀表板中使用
import LineChart from '@/components/analytics/LineChart';

<LineChart
  title="Daily Trend"
  data={dailyData}
  dataKey="views"
  color="#8b5cf6"
/>
```

---

## 故障排除

### 問題 1: TypeScript 錯誤

```
Property 'xxx' does not exist on type 'yyy'
```

**解決方案**:
1. 檢查類型定義是否完整
2. 確保 import 正確
3. 運行 `npm run lint`
4. 清除 TypeScript cache: `rm -rf node_modules/.cache`

### 問題 2: 測試失敗

```
Expected element not in document
```

**解決方案**:
1. 檢查選擇器是否正確
2. 使用 `screen.debug()` 查看 DOM
3. 等待異步操作: `await waitFor(() => { ... })`
4. 檢查 mock 數據

### 問題 3: 樣式不生效

```
Class names not applied
```

**解決方案**:
1. 確認 Tailwind 配置正確
2. 清除緩存: `rm -rf .next`
3. 重啟開發服務器: `npm run dev`
4. 檢查類名拼寫

### 問題 4: 性能問題

```
Page loads slowly
```

**解決方案**:
1. 檢查是否有不必要的 re-renders
2. 使用 React DevTools Profiler
3. 檢查 useEffect 依賴
4. 考慮使用 React.memo 或 useMemo

---

## 最佳實踐

### ✅ 代碼質量

- 使用 TypeScript (strict mode)
- 添加 JSDoc 註釋
- 遵循命名約定
- 保持組件小而專注

### ✅ 測試

- 為新功能添加測試
- 目標覆蓋率 > 80%
- 測試實現，不要測試實現細節
- 使用有意義的測試名稱

### ✅ 文檔

- 更新 COMPONENT-API.md
- 在組件中添加 JSDoc
- 更新類型定義文檔
- 包含使用示例

### ✅ 性能

- 避免不必要的 re-renders
- 使用 React.memo 當需要時
- 懶加載大組件
- 優化圖像

### ✅ 無障礙性

- 添加 ARIA 標籤
- 確保鍵盤導航
- 檢查顏色對比度
- 測試屏幕閱讀器

---

## 有用的命令

```bash
# 開發
npm run dev              # 啟動開發服務器
npm run build           # 構建生產版本
npm start               # 運行生產版本

# 質量檢查
npm run lint            # 檢查代碼質量
npm test                # 運行測試
npm run test:cov        # 測試覆蓋率

# 清理
rm -rf node_modules     # 移除依賴
npm install             # 重新安裝
npm cache clean --force # 清除 npm 緩存
```

---

## 資源

- [Next.js 文檔](https://nextjs.org/docs)
- [React 文檔](https://react.dev)
- [TypeScript 文檔](https://www.typescriptlang.org/docs)
- [Tailwind CSS 文檔](https://tailwindcss.com/docs)
- [Jest 文檔](https://jestjs.io/docs/getting-started)
- [React Testing Library 文檔](https://testing-library.com/docs/react-testing-library/intro)

---

## 支持

有問題？
1. 查看 FRONT-002-COMPONENT-API.md
2. 查看現有組件代碼
3. 查看單元測試作為示例
4. 查看本指南的相應部分

---

**版本**: 1.0.0
**最後更新**: 2026-02-19
**作者**: Frontend Developer Agent

Happy coding! 🚀
