# 🚀 P0 修復快速參考指南

## 新組件使用方式

### 1. Button with Loading State

```tsx
import { Button } from '@suggar-daddy/ui';

// 基本用法
<Button loading={isSubmitting} loadingText="處理中...">
  提交
</Button>

// 所有選項
<Button
  loading={isSubmitting}
  loadingText="登入中..."
  variant="default"  // default | destructive | outline | secondary | ghost | link
  size="default"     // default | sm | lg | icon
  disabled={false}
  className="custom-class"
>
  登入
</Button>
```

**何時使用**:
- 所有表單提交按鈕
- 異步操作（保存、刪除、上傳等）
- 需要防止重複點擊的操作

---

### 2. ConfirmDialog

```tsx
import { ConfirmDialog } from '@suggar-daddy/ui';
import { useState } from 'react';

function MyComponent() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteUser(userId);
      setShowConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setShowConfirm(true)}>刪除</Button>
      
      <ConfirmDialog
        open={showConfirm}
        title="確認刪除"
        description="此操作不可撤銷，確定要繼續嗎？"
        confirmText="確認刪除"
        cancelText="取消"
        isDestructive={true}
        isLoading={isLoading}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        disableOverlayClick={isLoading}
      />
    </>
  );
}
```

**何時使用**:
- 刪除操作
- 批量操作
- 不可逆的操作
- 重要的狀態變更

---

### 3. Enhanced Dialog

```tsx
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@suggar-daddy/ui';

function MyDialog({ open, onClose }) {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      closeOnOverlayClick={true}      // 允許點擊背景關閉
      ariaLabelledBy="my-dialog-title" // 可訪問性標籤
    >
      <DialogHeader>
        <DialogTitle id="my-dialog-title">
          對話框標題
        </DialogTitle>
        <DialogDescription>
          這是描述文字
        </DialogDescription>
      </DialogHeader>

      {/* 對話框內容 */}
      <div className="my-4">
        內容區域
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button onClick={handleSave}>
          保存
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
```

**新特性**:
- ✅ 焦點陷阱（Tab 鍵循環）
- ✅ ESC 鍵關閉
- ✅ 自動聚焦
- ✅ 背景滾動鎖定
- ✅ 完整 ARIA 支持

---

### 4. Tooltip

```tsx
import { Tooltip } from '@suggar-daddy/ui';

// 基本用法
<Tooltip content="這是提示文字">
  <Button>懸停查看提示</Button>
</Tooltip>

// 所有選項
<Tooltip
  content="詳細的提示信息"
  position="top"      // top | bottom | left | right
  delay={200}         // 延遲顯示時間（毫秒）
  disabled={false}
  className="custom-class"
>
  <Button>按鈕</Button>
</Tooltip>

// 簡化版（使用原生 title）
import { SimpleTooltip } from '@suggar-daddy/ui';

<SimpleTooltip title="簡單提示">
  <Button>按鈕</Button>
</SimpleTooltip>
```

**何時使用**:
- 圖標按鈕說明
- 禁用按鈕原因
- 額外的上下文信息
- 縮寫或術語解釋

---

## Hooks 使用方式

### useAutoRetry

```tsx
import { useAutoRetry } from '@suggar-daddy/ui';

function MyComponent() {
  const {
    data,
    error,
    isLoading,
    retryCount,
    isRetrying,
    retry,
    refresh,
    reset,
  } = useAutoRetry(
    async () => {
      const response = await fetch('/api/posts');
      if (!response.ok) throw new Error('Failed');
      return response.json();
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      exponentialBackoff: true,
      autoRetry: true,
      onError: (error, count) => {
        console.log(`Attempt ${count} failed:`, error);
      },
      onRetry: (count) => {
        console.log(`Retrying... (${count}/3)`);
      },
      onMaxRetriesReached: () => {
        console.log('Max retries reached');
      },
    }
  );

  if (isLoading) return <div>載入中...</div>;
  
  if (error) {
    return (
      <div>
        <p>錯誤：{error.message}</p>
        {isRetrying ? (
          <p>自動重試中... ({retryCount}/3)</p>
        ) : (
          <Button onClick={retry}>手動重試</Button>
        )}
      </div>
    );
  }

  return <div>{/* 顯示數據 */}</div>;
}
```

**何時使用**:
- API 請求容易失敗
- 網絡不穩定的環境
- 需要自動恢復的操作
- 減少用戶手動操作

---

## 可訪問性最佳實踐

### 1. 表單標籤

```tsx
// ✅ 正確
<Label htmlFor="email">Email 地址</Label>
<Input
  id="email"
  type="email"
  aria-required="true"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? "email-error email-hint" : "email-hint"}
  {...register('email')}
/>
{errors.email && (
  <p id="email-error" className="text-xs text-red-500" role="alert">
    {errors.email.message}
  </p>
)}
<p id="email-hint" className="text-xs text-gray-500">
  我們不會分享您的郵箱地址
</p>

// ❌ 錯誤
<label>Email</label>
<input type="email" />
{errors.email && <p>{errors.email.message}</p>}
```

### 2. 圖標按鈕

```tsx
// ✅ 正確
<button
  onClick={handleToggle}
  aria-label={isVisible ? '隱藏' : '顯示'}
  aria-pressed={isVisible}
  title={isVisible ? '隱藏' : '顯示'}
>
  <Icon className="h-4 w-4" aria-hidden="true" />
</button>

// ❌ 錯誤
<button onClick={handleToggle}>
  <Icon className="h-4 w-4" />
</button>
```

### 3. 模態框

```tsx
// ✅ 正確（使用增強的 Dialog）
<Dialog open={open} onClose={onClose}>
  <DialogTitle id="dialog-title">標題</DialogTitle>
  {/* 自動處理焦點陷阱 */}
</Dialog>

// ❌ 錯誤
<div className="modal" onClick={onClose}>
  <h2>標題</h2>
  {/* 缺少焦點管理、ESC 鍵、ARIA */}
</div>
```

---

## iOS 安全區域

### Tailwind 配置

```js
// tailwind.config.js - 已添加
module.exports = {
  theme: {
    extend: {
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.pb-safe': {
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
        '.pt-safe': {
          paddingTop: 'env(safe-area-inset-top)',
        },
      });
    },
  ],
};
```

### 使用方式

```tsx
// 底部導航
<nav className="fixed bottom-0 pb-safe">
  {/* 導航內容 */}
</nav>

// 頂部導航
<header className="fixed top-0 pt-safe">
  {/* 標題欄 */}
</header>

// 全螢幕內容（需要兩端都處理）
<div className="pt-safe pb-safe">
  {/* 內容 */}
</div>
```

---

## 遷移指南

### 從舊 Button 遷移

```tsx
// 舊代碼
<Button disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      提交中...
    </>
  ) : '提交'}
</Button>

// 新代碼
<Button loading={isSubmitting} loadingText="提交中...">
  提交
</Button>
```

### 從自定義確認框遷移

```tsx
// 舊代碼
const [showConfirm, setShowConfirm] = useState(false);

{showConfirm && (
  <div className="modal">
    <h2>確認刪除？</h2>
    <button onClick={handleDelete}>確認</button>
    <button onClick={() => setShowConfirm(false)}>取消</button>
  </div>
)}

// 新代碼
<ConfirmDialog
  open={showConfirm}
  title="確認刪除"
  description="此操作不可撤銷"
  isDestructive={true}
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
/>
```

---

## 常見問題

### Q: Button loading 屬性不工作？
**A**: 確保已更新 `@suggar-daddy/ui` 到最新版本：
```bash
cd libs/ui && npm run build
```

### Q: Dialog 焦點陷阱在某些情況下不工作？
**A**: 確保 Dialog 內有可聚焦的元素（按鈕、輸入框等）。如果沒有，Dialog 會聚焦到自身。

### Q: Tooltip 不顯示？
**A**: 檢查：
1. `content` 屬性是否有值
2. `disabled` 是否為 `false`
3. 父元素是否有足夠的空間顯示 Tooltip

### Q: useAutoRetry 無限重試？
**A**: 檢查 `maxRetries` 設置，默認為 3 次。確保設置了合理的值。

### Q: iOS 安全區域不生效？
**A**: 確保：
1. Tailwind 配置已更新
2. 使用 `pb-safe` 類
3. viewport meta 標籤包含 `viewport-fit=cover`

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

---

## 完整範例

### 完整的表單頁面

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Label, ConfirmDialog } from '@suggar-daddy/ui';
import { useToast } from '@/providers/toast-provider';

const schema = z.object({
  name: z.string().min(1, '請輸入姓名'),
  email: z.string().email('請輸入有效的郵箱'),
});

type FormData = z.infer<typeof schema>;

export default function MyForm() {
  const toast = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<FormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    setPendingData(data);
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    if (!pendingData) return;

    try {
      await saveData(pendingData);
      toast.success('保存成功');
      setShowConfirm(false);
    } catch (error) {
      toast.error('保存失敗，請重試');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name">姓名</Label>
          <Input
            id="name"
            aria-required="true"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
            {...register('name')}
          />
          {errors.name && (
            <p id="name-error" className="text-xs text-red-500" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="email">郵箱</Label>
          <Input
            id="email"
            type="email"
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" className="text-xs text-red-500" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <Button 
          type="submit"
          loading={isSubmitting}
          loadingText="保存中..."
          className="w-full"
        >
          保存
        </Button>
      </form>

      <ConfirmDialog
        open={showConfirm}
        title="確認保存"
        description="確定要保存這些更改嗎？"
        confirmText="確認"
        cancelText="取消"
        isLoading={isSubmitting}
        onConfirm={confirmSubmit}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
```

---

**最後更新**: 2024-01-XX  
**版本**: 1.0  
**維護者**: Frontend Team
