# 前端測試優先級清單

**目標**: 從 35% 提升至 60% 覆蓋率  
**預估總工時**: 16 天

---

## 🔴 第一階段：核心功能測試（9 天）→ 達到 50%

### 1. discover/page.tsx - 配對卡片滑動（3 天）⭐⭐⭐
**重要性**: 核心功能，影響用戶留存

**測試案例**:
```typescript
describe('DiscoverPage', () => {
  // 基礎渲染
  it('should render user card with avatar and bio', async () => {
    render(<DiscoverPage />);
    await waitFor(() => {
      expect(screen.getByText(/探索/i)).toBeInTheDocument();
    });
  });

  // Like 操作
  it('should handle like action', async () => {
    const user = userEvent.setup();
    render(<DiscoverPage />);
    
    const likeButton = await screen.findByLabelText('喜歡');
    await user.click(likeButton);
    
    expect(mockMatchingApi.swipe).toHaveBeenCalledWith({
      targetUserId: expect.any(String),
      action: 'like',
    });
  });

  // Pass 操作
  it('should handle pass action', async () => {
    const user = userEvent.setup();
    render(<DiscoverPage />);
    
    const passButton = await screen.findByLabelText('跳過');
    await user.click(passButton);
    
    expect(mockMatchingApi.swipe).toHaveBeenCalledWith({
      targetUserId: expect.any(String),
      action: 'pass',
    });
  });

  // 配對成功彈窗
  it('should show match modal when matched', async () => {
    mockMatchingApi.swipe.mockResolvedValue({ matched: true });
    const user = userEvent.setup();
    render(<DiscoverPage />);
    
    const likeButton = await screen.findByLabelText('喜歡');
    await user.click(likeButton);
    
    await waitFor(() => {
      expect(screen.getByText(/配對成功/i)).toBeInTheDocument();
    });
  });

  // 自動載入更多
  it('should load more cards when reaching end', async () => {
    render(<DiscoverPage />);
    // ... 實作
  });

  // 空狀態
  it('should handle empty state', async () => {
    mockMatchingApi.getCards.mockResolvedValue({ cards: [], nextCursor: null });
    render(<DiscoverPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/目前沒有更多推薦/i)).toBeInTheDocument();
    });
  });

  // 錯誤狀態
  it('should handle error state', async () => {
    mockMatchingApi.getCards.mockRejectedValue(new ApiError(500, 'Error'));
    render(<DiscoverPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/載入失敗/i)).toBeInTheDocument();
    });
  });
});
```

**設置 Mock**:
```typescript
// apps/web/app/(main)/discover/__mocks__/api.ts
export const mockMatchingApi = {
  getCards: jest.fn().mockResolvedValue({
    cards: [
      {
        id: 'user1',
        displayName: 'Test User',
        bio: 'Hello world',
        role: 'sugar_baby',
        verificationStatus: 'verified',
      },
    ],
    nextCursor: 'cursor123',
  }),
  swipe: jest.fn().mockResolvedValue({ matched: false }),
};
```

---

### 2. wallet/page.tsx - 錢包與打賞（2 天）⭐⭐
**重要性**: 核心變現功能

**測試案例**:
```typescript
describe('WalletPage', () => {
  // 顯示餘額
  it('should display wallet balance', async () => {
    mockPaymentsApi.getWallet.mockResolvedValue({
      balance: 1000,
      pendingBalance: 200,
      totalEarnings: 5000,
      totalWithdrawn: 3000,
    });
    
    render(<WalletPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/1,000/)).toBeInTheDocument();
    });
  });

  // 前往提款頁面
  it('should navigate to withdraw page', async () => {
    const router = useRouter();
    const user = userEvent.setup();
    render(<WalletPage />);
    
    const withdrawButton = await screen.findByText(/提款/i);
    await user.click(withdrawButton);
    
    expect(router.push).toHaveBeenCalledWith('/wallet/withdraw');
  });

  // 開啟 Stripe Portal
  it('should open Stripe portal', async () => {
    mockPaymentsApi.getStripePortal.mockResolvedValue({
      portalUrl: 'https://stripe.com/portal',
    });
    
    global.open = jest.fn();
    const user = userEvent.setup();
    render(<WalletPage />);
    
    const portalButton = await screen.findByText(/管理付款方式/i);
    await user.click(portalButton);
    
    await waitFor(() => {
      expect(global.open).toHaveBeenCalledWith(
        'https://stripe.com/portal',
        '_blank'
      );
    });
  });

  // Loading 狀態
  it('should show loading skeleton', () => {
    render(<WalletPage />);
    expect(screen.getAllByTestId('skeleton')).toHaveLength(4);
  });

  // 錯誤處理
  it('should handle error', async () => {
    mockPaymentsApi.getWallet.mockRejectedValue(new ApiError(500, 'Error'));
    render(<WalletPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/無法載入錢包/i)).toBeInTheDocument();
    });
  });
});
```

---

### 3. subscription/page.tsx - 訂閱管理（2 天）⭐⭐
**重要性**: 核心營收功能

**測試案例**:
```typescript
describe('SubscriptionPage', () => {
  // 顯示所有方案
  it('should display all subscription tiers', async () => {
    mockSubscriptionsApi.getTiers.mockResolvedValue([
      { id: '1', name: '基礎會員', price: 99 },
      { id: '2', name: '進階會員', price: 299 },
    ]);
    
    render(<SubscriptionPage />);
    
    await waitFor(() => {
      expect(screen.getByText('基礎會員')).toBeInTheDocument();
      expect(screen.getByText('進階會員')).toBeInTheDocument();
    });
  });

  // 訂閱操作
  it('should handle subscription', async () => {
    const user = userEvent.setup();
    render(<SubscriptionPage />);
    
    const subscribeButton = await screen.findByText(/訂閱/i);
    await user.click(subscribeButton);
    
    expect(mockSubscriptionsApi.subscribe).toHaveBeenCalled();
  });

  // 取消訂閱
  it('should handle cancellation', async () => {
    mockSubscriptionsApi.getMySubscription.mockResolvedValue({
      id: 'sub1',
      tierId: 'tier1',
      status: 'active',
    });
    
    const user = userEvent.setup();
    render(<SubscriptionPage />);
    
    const cancelButton = await screen.findByText(/取消訂閱/i);
    await user.click(cancelButton);
    
    expect(mockSubscriptionsApi.cancel).toHaveBeenCalled();
  });

  // 高亮當前方案
  it('should highlight current subscription tier', async () => {
    mockSubscriptionsApi.getMySubscription.mockResolvedValue({
      tierId: 'tier1',
    });
    
    render(<SubscriptionPage />);
    
    await waitFor(() => {
      const currentTier = screen.getByTestId('tier-tier1');
      expect(currentTier).toHaveClass('border-brand-500');
    });
  });
});
```

---

### 4. post/create/page.tsx - 內容發佈（2 天）⭐⭐
**重要性**: 創作者核心功能

**測試案例**:
```typescript
describe('CreatePostPage', () => {
  // 提交文章
  it('should submit post with valid data', async () => {
    const user = userEvent.setup();
    render(<CreatePostPage />);
    
    const contentInput = screen.getByPlaceholderText(/分享你的想法/i);
    await user.type(contentInput, '測試文章內容');
    
    const submitButton = screen.getByText(/發佈/i);
    await user.click(submitButton);
    
    expect(mockContentApi.createPost).toHaveBeenCalledWith({
      content: '測試文章內容',
      visibility: 'public',
    });
  });

  // 上傳媒體
  it('should handle media upload', async () => {
    const file = new File(['dummy'], 'test.png', { type: 'image/png' });
    const user = userEvent.setup();
    render(<CreatePostPage />);
    
    const fileInput = screen.getByLabelText(/上傳圖片/i);
    await user.upload(fileInput, file);
    
    expect(screen.getByAltText('test.png')).toBeInTheDocument();
  });

  // 表單驗證
  it('should validate empty content', async () => {
    const user = userEvent.setup();
    render(<CreatePostPage />);
    
    const submitButton = screen.getByText(/發佈/i);
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/內容不可為空/i)).toBeInTheDocument();
    });
  });

  // 選擇可見度
  it('should allow selecting visibility', async () => {
    const user = userEvent.setup();
    render(<CreatePostPage />);
    
    const premiumRadio = screen.getByLabelText(/訂閱者限定/i);
    await user.click(premiumRadio);
    
    expect(premiumRadio).toBeChecked();
  });
});
```

---

## 🟡 第二階段：UI 組件測試（4 天）→ 達到 57%

### 5. Card 組件（1 天）
```typescript
describe('Card', () => {
  it('should render with children', () => {
    render(<Card>Test Content</Card>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<Card className="custom">Test</Card>);
    expect(screen.getByText('Test').parentElement).toHaveClass('custom');
  });

  it('should render CardHeader', () => {
    render(
      <Card>
        <CardHeader>Header</CardHeader>
      </Card>
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  // ... CardTitle, CardContent, CardFooter
});
```

### 6. Dialog 組件（1 天）
```typescript
describe('Dialog', () => {
  it('should render when open', () => {
    render(
      <Dialog open={true} onClose={() => {}}>
        Content
      </Dialog>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <Dialog open={false} onClose={() => {}}>
        Content
      </Dialog>
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should call onClose on Escape', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(
      <Dialog open={true} onClose={onClose}>
        Content
      </Dialog>
    );
    
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose on backdrop click', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(
      <Dialog open={true} onClose={onClose}>
        Content
      </Dialog>
    );
    
    const backdrop = screen.getByText('Content').parentElement?.parentElement;
    if (backdrop) await user.click(backdrop);
    
    expect(onClose).toHaveBeenCalled();
  });
});
```

### 7. Badge 組件（0.5 天）
### 8. Avatar 組件（0.5 天）
### 9. Table 組件（1 天）

---

## 🟢 第三階段：輔助功能測試（3 天）→ 達到 60%

### 10. Auth Provider（1 天）
```typescript
describe('AuthProvider', () => {
  it('should login successfully', async () => {
    mockAuthApi.login.mockResolvedValue({
      accessToken: 'token',
      refreshToken: 'refresh',
    });
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });
    
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle token refresh', async () => {
    // ... 實作
  });

  it('should logout and clear tokens', async () => {
    // ... 實作
  });
});
```

### 11. Socket 連接測試（1 天）
```typescript
describe('Socket', () => {
  it('should connect to messaging socket', () => {
    const socket = getMessagingSocket('token');
    expect(socket.connected).toBe(true);
  });

  it('should receive new message event', async () => {
    const callback = jest.fn();
    const socket = getMessagingSocket('token');
    
    socket.on('message:new', callback);
    socket.emit('message:new', { content: 'Test' });
    
    await waitFor(() => {
      expect(callback).toHaveBeenCalledWith({ content: 'Test' });
    });
  });

  it('should disconnect all sockets', () => {
    getMessagingSocket('token');
    disconnectAll();
    
    expect(io().connected).toBe(false);
  });
});
```

### 12. API Error Handling（1 天）
```typescript
describe('ApiError', () => {
  it('should extract status code from ApiError', () => {
    const error = new ApiError(404, 'Not Found');
    expect(ApiError.getStatusCode(error)).toBe(404);
  });

  it('should extract status code from Axios error', () => {
    const axiosError = {
      isAxiosError: true,
      response: { status: 500 },
    };
    expect(ApiError.getStatusCode(axiosError)).toBe(500);
  });

  it('should return user-friendly message', () => {
    const error = new ApiError(400, 'Bad Request', {
      message: '郵箱格式錯誤',
    });
    expect(ApiError.getMessage(error)).toBe('郵箱格式錯誤');
  });

  it('should use fallback message', () => {
    const error = new Error('Network Error');
    expect(ApiError.getMessage(error, '網路錯誤')).toBe('Network Error');
  });
});
```

---

## 📊 進度追蹤表

| 項目 | 預估 | 實際 | 完成日期 | 狀態 |
|-----|------|------|---------|------|
| discover/page.tsx | 3 天 | - | - | ⬜ |
| wallet/page.tsx | 2 天 | - | - | ⬜ |
| subscription/page.tsx | 2 天 | - | - | ⬜ |
| post/create/page.tsx | 2 天 | - | - | ⬜ |
| Card 組件 | 1 天 | - | - | ⬜ |
| Dialog 組件 | 1 天 | - | - | ⬜ |
| Badge 組件 | 0.5 天 | - | - | ⬜ |
| Avatar 組件 | 0.5 天 | - | - | ⬜ |
| Table 組件 | 1 天 | - | - | ⬜ |
| Auth Provider | 1 天 | - | - | ⬜ |
| Socket 測試 | 1 天 | - | - | ⬜ |
| API Error | 1 天 | - | - | ⬜ |
| **總計** | **16 天** | **0 天** | - | **0%** |

---

## 🎯 成功標準

### 量化指標
- ✅ 測試覆蓋率達到 60%
- ✅ 所有核心頁面有測試
- ✅ 所有 UI 組件有基礎測試
- ✅ CI/CD 整合測試

### 質化指標
- ✅ 測試易於維護
- ✅ 測試執行速度 < 30 秒
- ✅ Mock 設計合理
- ✅ 測試文檔完整

---

## 🚀 執行建議

### 1. 設置測試基礎設施（第 0 天）
```bash
# 安裝必要套件（已安裝）
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event

# 建立 Mock 輔助工具
mkdir -p libs/test-utils/src/lib
touch libs/test-utils/src/lib/mock-api.ts
touch libs/test-utils/src/lib/test-providers.tsx
```

### 2. 建立測試模板
```typescript
// libs/test-utils/src/lib/page-test-template.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from './test-providers';

export function renderWithProviders(ui: React.ReactElement) {
  return render(<TestProviders>{ui}</TestProviders>);
}
```

### 3. 每日站會檢查進度
- 昨天完成了什麼測試？
- 今天計劃寫哪些測試？
- 遇到什麼困難？

### 4. Code Review 重點
- 測試案例是否涵蓋主要路徑？
- Mock 是否合理？
- 斷言是否清晰？
- 是否有重複程式碼？

---

## 📚 參考資源

### 官方文檔
- [React Testing Library](https://testing-library.com/react)
- [Jest](https://jestjs.io/)
- [User Event](https://testing-library.com/docs/user-event/intro/)

### 最佳實踐
- [Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details)

### 專案內範例
- `libs/ui/src/lib/button/button.spec.tsx`（完美範例 🏆）
- `apps/admin/app/login/page.spec.tsx`（完整測試 442 行）

---

**建議開始日期**: 2024-02-15  
**預計完成日期**: 2024-03-08（約 3 週）  
**負責人**: Frontend Developer Team
