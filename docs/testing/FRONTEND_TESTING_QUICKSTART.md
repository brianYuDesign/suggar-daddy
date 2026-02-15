# Frontend Testing Quick Start

快速上手指南 - 5 分鐘開始撰寫測試

## 🚀 快速開始

### 1. 運行測試

```bash
# 運行所有測試
npm test

# 運行特定應用的測試
npm test -- apps/web
npm test -- apps/admin

# 運行特定測試文件
npm test -- apps/web/app/\(auth\)/login/page.spec.tsx

# 運行並顯示覆蓋率
npm test -- --coverage

# Watch 模式
npm test -- --watch
```

### 2. 撰寫第一個測試

創建 `page.spec.tsx` 在你的頁面旁邊：

```typescript
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../src/test-utils';
import YourPage from './page';

// Mock API
jest.mock('../../lib/api', () => ({
  yourApi: {
    fetchData: jest.fn(),
  },
}));

const { yourApi } = require('../../lib/api');

describe('YourPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render successfully', () => {
    render(<YourPage />);
    
    expect(screen.getByText('Your Page Title')).toBeInTheDocument();
  });

  it('should load data on mount', async () => {
    yourApi.fetchData.mockResolvedValue({ data: 'test' });
    
    render(<YourPage />);
    
    await waitFor(() => {
      expect(screen.getByText('test')).toBeInTheDocument();
    });
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<YourPage />);
    
    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);
    
    expect(screen.getByText('Clicked!')).toBeInTheDocument();
  });
});
```

### 3. 常用查詢

優先使用順序：

```typescript
// 1. getByRole (最佳) - 可訪問性友好
screen.getByRole('button', { name: /submit/i })
screen.getByRole('heading', { name: /title/i })
screen.getByRole('textbox', { name: /email/i })

// 2. getByLabelText - 表單元素
screen.getByLabelText(/email/i)
screen.getByLabelText(/password/i)

// 3. getByPlaceholderText
screen.getByPlaceholderText(/enter email/i)

// 4. getByText - 通用文字
screen.getByText(/hello world/i)

// 5. getByTestId (最後選擇)
screen.getByTestId('custom-element')
```

### 4. 異步操作

```typescript
// 等待元素出現
await waitFor(() => {
  expect(screen.getByText('loaded')).toBeInTheDocument();
});

// 等待元素消失
await waitFor(() => {
  expect(screen.queryByText('loading')).not.toBeInTheDocument();
});

// 找到異步元素
const element = await screen.findByText('async content');
```

### 5. 用戶互動

```typescript
const user = userEvent.setup();

// 輸入文字
await user.type(screen.getByLabelText(/email/i), 'test@example.com');

// 點擊
await user.click(screen.getByRole('button', { name: /submit/i }));

// 選擇
await user.selectOptions(screen.getByLabelText(/country/i), 'US');

// 鍵盤
await user.keyboard('{Enter}');
await user.keyboard('{Escape}');
```

## 📝 測試模板

### 頁面測試模板

```typescript
/**
 * [Page Name] Test
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../src/test-utils';
import PageComponent from './page';

// Mock APIs
jest.mock('../../lib/api', () => ({
  api: {
    method: jest.fn(),
  },
}));

const { api } = require('../../lib/api');

describe('PageComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render successfully', () => {
      render(<PageComponent />);
      expect(screen.getByText('Title')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state', () => {
      api.method.mockImplementation(() => new Promise(() => {}));
      render(<PageComponent />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('should display data', async () => {
      api.method.mockResolvedValue({ data: 'test' });
      render(<PageComponent />);
      await waitFor(() => {
        expect(screen.getByText('test')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message', async () => {
      api.method.mockRejectedValue(new Error('Failed'));
      render(<PageComponent />);
      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interaction', () => {
    it('should handle user action', async () => {
      const user = userEvent.setup();
      render(<PageComponent />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(api.method).toHaveBeenCalled();
    });
  });
});
```

### 組件測試模板

```typescript
/**
 * [Component Name] Test
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from './component';

describe('ComponentName', () => {
  describe('Rendering', () => {
    it('should render successfully', () => {
      render(<ComponentName>Test</ComponentName>);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should apply variant prop', () => {
      render(<ComponentName variant="primary">Test</ComponentName>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('primary');
    });
  });

  describe('Events', () => {
    it('should call onClick', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<ComponentName onClick={handleClick}>Click</ComponentName>);
      await user.click(screen.getByText('Click'));
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<ComponentName onClick={handleClick}>Test</ComponentName>);
      
      const element = screen.getByText('Test');
      element.focus();
      
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalled();
    });
  });
});
```

## 🎯 檢查清單

撰寫測試時檢查：

- [ ] 使用 AAA 模式 (Arrange-Act-Assert)
- [ ] 使用可訪問性查詢 (getByRole, getByLabelText)
- [ ] 測試用戶行為，非實作細節
- [ ] 包含 loading, success, error 狀態
- [ ] 正確處理異步操作 (await, waitFor)
- [ ] 清理 mocks (beforeEach)
- [ ] 描述性測試名稱
- [ ] 測試獨立可運行

## 📚 更多資源

- [完整測試指南](./FRONTEND_TESTING.md)
- [P0 完成報告](./FRONTEND_TESTING_P0_REPORT.md)
- [Testing Library 文檔](https://testing-library.com/docs/react-testing-library/intro/)

## 💡 提示

1. **測試用戶看到的**: 不要測試實作細節
2. **可訪問性優先**: 使用語義化查詢
3. **真實互動**: 使用 userEvent 而非 fireEvent
4. **等待異步**: 總是使用 waitFor 或 findBy
5. **清理**: 每個測試後清理 mocks 和狀態

## 🐛 常見錯誤

### ❌ 錯誤
```typescript
// 測試實作細節
expect(component.state.count).toBe(1);

// 使用不可訪問的查詢
container.querySelector('.button');

// 不等待異步
expect(screen.getByText('loaded')).toBeInTheDocument(); // ❌ 可能失敗
```

### ✅ 正確
```typescript
// 測試用戶看到的
expect(screen.getByText('Count: 1')).toBeInTheDocument();

// 使用可訪問查詢
screen.getByRole('button', { name: /submit/i });

// 等待異步
await waitFor(() => {
  expect(screen.getByText('loaded')).toBeInTheDocument();
});
```

---

**開始撰寫測試吧！** 🎉
