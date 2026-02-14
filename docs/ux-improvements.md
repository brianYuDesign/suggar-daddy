# UX 改進建議與缺失功能清單

**評估日期**: 2024-02-14  
**當前 UX 評分**: 70/100  
**目標 UX 評分**: 85/100

---

## 🔴 高優先級（必須修復）

### 1. 統一 Toast 通知系統 ⭐⭐⭐⭐⭐
**問題**: 用戶無法得到即時操作回饋
**影響**: 用戶不知道操作是否成功
**預估工時**: 2 天

**實作方案**:
```typescript
// libs/ui/src/lib/toast/toast-provider.tsx
import { createContext, useContext, useState } from 'react';
import { Toast } from './toast';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

const ToastContext = createContext<{
  showToast: (message: string, type: ToastMessage['type']) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: ToastMessage['type']) => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type, duration: 3000 }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
```

**使用範例**:
```typescript
const { showToast } = useToast();

try {
  await api.updateProfile(data);
  showToast('個人資料更新成功', 'success');
} catch (err) {
  showToast(ApiError.getMessage(err), 'error');
}
```

**受益頁面**:
- ✅ 所有表單提交
- ✅ 所有 API 操作
- ✅ 即時訊息
- ✅ 打賞/訂閱操作

---

### 2. 打賞功能入口優化 ⭐⭐⭐⭐⭐
**問題**: 打賞功能入口不明確，使用率低
**影響**: 核心變現功能無法發揮價值
**預估工時**: 3 天

**當前問題**:
- ❌ 只能從 `/wallet` 頁面查看餘額
- ❌ 無法直接從文章/個人資料打賞
- ❌ 無預設金額選項

**改進方案**:

#### 2.1 文章卡片添加打賞按鈕
```typescript
// apps/web/components/post-card.tsx
<Card>
  <CardContent>
    {/* 文章內容 */}
  </CardContent>
  <CardFooter className="flex items-center justify-between">
    <div className="flex gap-2">
      <Button variant="ghost" size="sm">
        <Heart className="mr-1 h-4 w-4" />
        {likes}
      </Button>
      <Button variant="ghost" size="sm">
        <MessageCircle className="mr-1 h-4 w-4" />
        {comments}
      </Button>
    </div>
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => setTipModalOpen(true)}
    >
      <Gift className="mr-1 h-4 w-4" />
      打賞
    </Button>
  </CardFooter>
</Card>
```

#### 2.2 打賞彈窗組件
```typescript
// apps/web/components/tip-modal.tsx
export function TipModal({ 
  isOpen, 
  onClose, 
  creatorId, 
  creatorName 
}: TipModalProps) {
  const [amount, setAmount] = useState(100);
  const { showToast } = useToast();
  
  const presetAmounts = [50, 100, 200, 500, 1000];

  const handleTip = async () => {
    try {
      await paymentsApi.sendTip({ receiverId: creatorId, amount });
      showToast(`成功打賞 $${amount} 給 ${creatorName}`, 'success');
      onClose();
      
      // 愛心飛舞動畫
      showHeartAnimation();
    } catch (err) {
      showToast(ApiError.getMessage(err), 'error');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>打賞 {creatorName}</DialogTitle>
        <DialogDescription>
          感謝創作者的優質內容
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 space-y-4">
        {/* 預設金額選擇 */}
        <div className="grid grid-cols-3 gap-2">
          {presetAmounts.map(preset => (
            <Button
              key={preset}
              variant={amount === preset ? 'default' : 'outline'}
              onClick={() => setAmount(preset)}
              className="h-16"
            >
              <div className="flex flex-col">
                <span className="text-lg font-bold">${preset}</span>
                <span className="text-xs text-gray-500">
                  {preset === 50 && '感謝'}
                  {preset === 100 && '喜歡'}
                  {preset === 200 && '很棒'}
                  {preset === 500 && '超讚'}
                  {preset === 1000 && '神作'}
                </span>
              </div>
            </Button>
          ))}
        </div>

        {/* 自訂金額 */}
        <div>
          <Label>自訂金額</Label>
          <Input
            type="number"
            min="10"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="輸入金額"
          />
        </div>

        {/* 餘額顯示 */}
        <div className="rounded-lg bg-gray-50 p-3 text-sm">
          <span className="text-gray-600">錢包餘額：</span>
          <span className="font-semibold">${wallet?.balance || 0}</span>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          取消
        </Button>
        <Button onClick={handleTip} disabled={amount < 10}>
          確認打賞 ${amount}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
```

#### 2.3 個人資料頁添加打賞按鈕
```typescript
// apps/web/app/(main)/user/[userId]/page.tsx
<div className="flex gap-2">
  <Button variant="outline" className="flex-1">
    <MessageCircle className="mr-2 h-4 w-4" />
    發送訊息
  </Button>
  <Button className="flex-1 bg-brand-500">
    <Gift className="mr-2 h-4 w-4" />
    打賞
  </Button>
</div>
```

**預期效果**:
- ✅ 打賞率提升 3-5 倍
- ✅ 用戶體驗更直覺
- ✅ 創作者收入增加

---

### 3. 配對卡片滑動動畫 ⭐⭐⭐⭐
**問題**: 無手勢滑動，體驗不符合用戶預期
**影響**: 核心功能體驗差，用戶留存率低
**預估工時**: 3 天

**實作方案**:
```bash
npm install framer-motion
```

```typescript
// apps/web/app/(main)/discover/page.tsx
import { motion, useAnimation, PanInfo } from 'framer-motion';

export default function DiscoverPage() {
  const controls = useAnimation();
  const [exitX, setExitX] = useState(0);

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const threshold = 100;
    
    if (info.offset.x > threshold) {
      // 向右滑動 = Like
      setExitX(300);
      controls.start({ x: 300, opacity: 0 });
      setTimeout(() => handleSwipe('like'), 200);
    } else if (info.offset.x < -threshold) {
      // 向左滑動 = Pass
      setExitX(-300);
      controls.start({ x: -300, opacity: 0 });
      setTimeout(() => handleSwipe('pass'), 200);
    } else {
      // 回彈
      controls.start({ x: 0, y: 0, rotate: 0 });
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={controls}
      style={{
        x: useMotionValue(0),
        rotate: useTransform(x, [-200, 200], [-25, 25]),
      }}
      className="relative cursor-grab active:cursor-grabbing"
    >
      {/* 滑動指示器 */}
      <motion.div
        className="absolute left-4 top-4 rounded-lg bg-green-500 px-4 py-2 text-white font-bold"
        style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
      >
        LIKE
      </motion.div>
      <motion.div
        className="absolute right-4 top-4 rounded-lg bg-red-500 px-4 py-2 text-white font-bold"
        style={{ opacity: useTransform(x, [-100, 0], [1, 0]) }}
      >
        PASS
      </motion.div>

      {/* 卡片內容 */}
      <Card>...</Card>
    </motion.div>
  );
}
```

**功能包含**:
- ✅ 手勢拖曳
- ✅ 滑動指示器（LIKE/PASS）
- ✅ 卡片旋轉動畫
- ✅ 回彈效果
- ✅ 流暢過場

---

### 4. 響應式設計優化 ⭐⭐⭐⭐
**問題**: 大螢幕（1440px+）顯示浪費空間
**影響**: 桌面用戶體驗差
**預估工時**: 2 天

**改進方案**:

#### 4.1 統一容器寬度策略
```typescript
// apps/web/lib/utils.ts
export function containerClasses(variant: 'sm' | 'md' | 'lg' | 'xl' = 'md') {
  const variants = {
    sm: 'max-w-sm md:max-w-md',
    md: 'max-w-sm md:max-w-2xl lg:max-w-4xl',
    lg: 'max-w-sm md:max-w-2xl lg:max-w-5xl xl:max-w-6xl',
    xl: 'max-w-full',
  };
  return variants[variant];
}
```

#### 4.2 Grid 列數響應式
```typescript
// 配對列表
<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
  {matches.map(match => <MatchCard key={match.id} {...match} />)}
</div>

// 訂閱方案
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {tiers.map(tier => <TierCard key={tier.id} {...tier} />)}
</div>
```

#### 4.3 Padding 層級
```css
.page-container {
  padding: 1rem;                  /* 16px - mobile */
  @screen md { padding: 1.5rem; } /* 24px - tablet */
  @screen lg { padding: 2rem; }   /* 32px - desktop */
}
```

**改進頁面**:
- ✅ discover/page.tsx
- ✅ matches/page.tsx
- ✅ feed/page.tsx
- ✅ subscription/page.tsx

---

### 5. Loading States 統一 ⭐⭐⭐
**問題**: Loading 顯示方式不一致
**影響**: 用戶體驗混亂
**預估工時**: 1 天

**統一規範**:

| 場景 | 使用組件 | 範例 |
|-----|---------|------|
| 頁面初次載入 | Skeleton | 卡片骨架屏 |
| 按鈕操作中 | Spinner + disabled | 提交中... |
| 列表加載更多 | Inline Spinner | 載入更多... |
| 檔案上傳 | Progress Bar | 上傳進度 45% |

```typescript
// 統一 Loading 組件
export function PageLoader() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

// 按鈕 Loading
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? '提交中...' : '提交'}
</Button>
```

---

## 🟡 中優先級（重要但不緊急）

### 6. 創作者數據分析儀表板 ⭐⭐⭐⭐
**預估工時**: 5 天

**功能清單**:
- 📊 收入趨勢圖（日/週/月）
- 👥 粉絲增長曲線
- 🔥 熱門內容排名（Top 10）
- 💰 平均每篇收入
- 📈 訂閱流失率
- 🎯 轉換漏斗（瀏覽 → 訂閱 → 續訂）

**頁面位置**: `/creator/analytics`

---

### 7. 訊息已讀狀態 ⭐⭐⭐
**預估工時**: 2 天

**實作方案**:
```typescript
// 後端添加欄位
interface Message {
  readAt?: Date;
}

// 前端顯示
{message.readAt ? (
  <Check className="h-3 w-3 text-blue-500" />
) : (
  <Check className="h-3 w-3 text-gray-400" />
)}
```

---

### 8. 搜尋功能 ⭐⭐⭐
**預估工時**: 4 天

**功能清單**:
- 🔍 搜尋創作者（姓名、bio）
- 🔽 篩選器（年齡、地區、標籤）
- 📊 排序（人氣、最新、評分）
- 📌 搜尋歷史

**頁面位置**: `/search`

---

### 9. 復原上一張卡片 ⭐⭐⭐
**預估工時**: 1 天

**實作方案**:
```typescript
const [history, setHistory] = useState<UserCard[]>([]);

function handleSwipe(action: 'like' | 'pass') {
  setHistory(prev => [...prev, currentCard]);
  // ... 滑動邏輯
}

function handleUndo() {
  if (history.length === 0) return;
  const lastCard = history[history.length - 1];
  setCards([lastCard, ...cards]);
  setHistory(history.slice(0, -1));
  setCurrentIndex(0);
}
```

---

### 10. 取消訂閱確認對話框 ⭐⭐
**預估工時**: 0.5 天

```typescript
<Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
  <DialogHeader>
    <DialogTitle>確定要取消訂閱嗎？</DialogTitle>
    <DialogDescription>
      取消後將無法查看 {creatorName} 的訂閱者限定內容
    </DialogDescription>
  </DialogHeader>
  <DialogFooter>
    <Button variant="ghost" onClick={() => setCancelDialogOpen(false)}>
      我再想想
    </Button>
    <Button variant="destructive" onClick={handleCancel}>
      確認取消
    </Button>
  </DialogFooter>
</Dialog>
```

---

## 🟢 低優先級（可選）

### 11. 忘記密碼流程 ⭐⭐
**預估工時**: 2 天

**流程**:
1. 輸入郵箱
2. 發送重置連結
3. 點擊連結跳轉重置頁面
4. 輸入新密碼
5. 完成重置

---

### 12. 訂閱記錄/發票下載 ⭐⭐
**預估工時**: 2 天

**頁面**: `/subscription/history`

---

### 13. 頭像上傳進度條 ⭐⭐
**預估工時**: 1 天

```typescript
<Progress value={uploadProgress} max={100} />
<span>{uploadProgress}%</span>
```

---

### 14. 配對篩選器（年齡、距離） ⭐⭐
**預估工時**: 3 天

**篩選項目**:
- 年齡範圍（18-25, 26-35...）
- 距離範圍（5km, 10km, 50km, 不限）
- 驗證狀態（僅顯示已認證）

---

### 15. 訂閱者列表管理 ⭐⭐
**預估工時**: 3 天

**功能**:
- 查看訂閱者清單
- 訂閱層級標籤
- 訂閱時長
- 發送專屬訊息

---

### 16. 相簿功能（多張照片） ⭐
**預估工時**: 2 天

---

### 17. 暗黑模式 ⭐
**預估工時**: 3 天

---

### 18. 國際化 (i18n) ⭐
**預估工時**: 5 天

---

## 📊 總工時估算

| 優先級 | 項目數 | 總工時 | 完成後提升 |
|--------|--------|--------|-----------|
| 🔴 高優先級 | 5 | 11 天 | UX 70% → 80% |
| 🟡 中優先級 | 5 | 12.5 天 | UX 80% → 85% |
| 🟢 低優先級 | 8 | 21 天 | UX 85% → 90% |
| **總計** | **18** | **44.5 天** | **UX 70% → 90%** |

---

## 🎯 建議執行順序

### 第一週（5 天）
1. ✅ 統一 Toast 系統（2 天）
2. ✅ 打賞功能優化（3 天）

### 第二週（5 天）
3. ✅ 配對卡片滑動動畫（3 天）
4. ✅ 響應式設計優化（2 天）

### 第三週（5 天）
5. ✅ Loading States 統一（1 天）
6. ✅ 搜尋功能（4 天）

### 第四週（5 天）
7. ✅ 創作者數據分析（5 天）

**4 週完成高優先級 + 部分中優先級，UX 提升至 82%**

---

## ✅ 驗收標準

### Toast 系統
- [ ] 所有 API 操作有回饋
- [ ] 成功/錯誤顏色區分
- [ ] 3 秒自動關閉
- [ ] 支援手動關閉

### 打賞功能
- [ ] 文章卡片有打賞按鈕
- [ ] 個人資料頁有打賞按鈕
- [ ] 預設金額選項 5 個
- [ ] 打賞成功有動畫

### 滑動動畫
- [ ] 支援手勢拖曳
- [ ] 有 LIKE/PASS 指示器
- [ ] 卡片旋轉流暢
- [ ] 回彈效果自然

### 響應式
- [ ] 1440px 顯示正常
- [ ] 1920px 顯示正常
- [ ] 所有頁面一致

### Loading States
- [ ] 統一使用 Skeleton
- [ ] 按鈕統一用 Spinner
- [ ] 無閃爍

---

**文件版本**: 1.0  
**最後更新**: 2024-02-14  
**負責人**: Frontend Developer Team
