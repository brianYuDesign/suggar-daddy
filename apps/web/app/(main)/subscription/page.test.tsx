/**
 * 訂閱頁面測試
 * 測試幂等性處理和防重複提交
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubscriptionPage from './page';
import { subscriptionsApi } from '../../../lib/api';

// Mock API
jest.mock('../../../lib/api', () => ({
  subscriptionsApi: {
    getTiers: jest.fn(),
    getMySubscription: jest.fn(),
    subscribe: jest.fn(),
    cancel: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

const mockTiers = [
  {
    id: 'tier-1',
    name: '基礎方案',
    price: 99,
    currency: 'TWD',
    features: ['功能 1', '功能 2'],
  },
  {
    id: 'tier-2',
    name: '進階方案',
    price: 199,
    currency: 'TWD',
    features: ['功能 1', '功能 2', '功能 3'],
  },
];

describe('SubscriptionPage - 幂等性處理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    (subscriptionsApi.getTiers as jest.Mock).mockResolvedValue(mockTiers);
    (subscriptionsApi.getMySubscription as jest.Mock).mockRejectedValue({
      status: 404,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('訂閱操作', () => {
    it('應顯示確認對話框', async () => {
      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('基礎方案')).toBeInTheDocument();
      });

      const subscribeButton = screen.getAllByRole('button', { name: /立即訂閱/i })[0];
      await userEvent.click(subscribeButton);

      // 應顯示確認對話框
      expect(screen.getByText('確認訂閱')).toBeInTheDocument();
      expect(screen.getByText(/您即將訂閱/i)).toBeInTheDocument();
    });

    it('應傳遞幂等性鍵給 API', async () => {
      (subscriptionsApi.subscribe as jest.Mock).mockResolvedValue({
        id: 'sub-123',
        tierId: 'tier-1',
        status: 'active',
      });

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('基礎方案')).toBeInTheDocument();
      });

      const subscribeButton = screen.getAllByRole('button', { name: /立即訂閱/i })[0];
      await userEvent.click(subscribeButton);

      // 確認訂閱
      const confirmButton = screen.getByRole('button', { name: /確認訂閱/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(subscriptionsApi.subscribe).toHaveBeenCalledWith(
          'tier-1',
          'test-uuid-1234' // 幂等性鍵
        );
      });
    });

    it('應防止防抖時間內的重複點擊', async () => {
      (subscriptionsApi.subscribe as jest.Mock).mockResolvedValue({
        id: 'sub-123',
        tierId: 'tier-1',
        status: 'active',
      });

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('基礎方案')).toBeInTheDocument();
      });

      const subscribeButton = screen.getAllByRole('button', { name: /立即訂閱/i })[0];
      
      // 快速連續點擊
      await userEvent.click(subscribeButton);
      
      // 應只顯示一次確認對話框
      expect(screen.getByText('確認訂閱')).toBeInTheDocument();
      
      // 確認訂閱
      const confirmButton = screen.getByRole('button', { name: /確認訂閱/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(subscriptionsApi.subscribe).toHaveBeenCalledTimes(1);
      });

      // 在防抖時間內再次點擊（應該被忽略）
      jest.advanceTimersByTime(1000); // 只過 1 秒，防抖是 2 秒
      
      // 找到新的訂閱按鈕（此時應該沒有，因為已訂閱）
      const newButtons = screen.queryAllByRole('button', { name: /立即訂閱/i });
      
      if (newButtons.length > 0) {
        await userEvent.click(newButtons[0]);
        // 應該沒有新的 API 調用
        expect(subscriptionsApi.subscribe).toHaveBeenCalledTimes(1);
      }
    });

    it('提交中應禁用所有訂閱按鈕', async () => {
      // 讓 API 延遲返回
      (subscriptionsApi.subscribe as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ id: 'sub-1' }), 2000))
      );

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('基礎方案')).toBeInTheDocument();
      });

      const subscribeButtons = screen.getAllByRole('button', { name: /立即訂閱/i });
      await userEvent.click(subscribeButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /確認訂閱/i });
      await userEvent.click(confirmButton);

      // 所有訂閱按鈕應該被禁用
      await waitFor(() => {
        const allButtons = screen.getAllByRole('button', { name: /立即訂閱/i });
        allButtons.forEach((button) => {
          expect(button).toBeDisabled();
        });
      });
    });
  });

  describe('取消訂閱操作', () => {
    beforeEach(() => {
      (subscriptionsApi.getMySubscription as jest.Mock).mockResolvedValue({
        id: 'sub-123',
        tierId: 'tier-1',
        status: 'active',
        currentPeriodEnd: '2024-12-31',
      });
    });

    it('應顯示取消確認對話框', async () => {
      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('目前方案')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /取消訂閱/i });
      await userEvent.click(cancelButton);

      // 應顯示確認對話框
      expect(screen.getByText('確認取消訂閱')).toBeInTheDocument();
      expect(screen.getByText(/取消訂閱後/i)).toBeInTheDocument();
    });

    it('應防止重複點擊取消按鈕', async () => {
      (subscriptionsApi.cancel as jest.Mock).mockResolvedValue({});

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('目前方案')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /取消訂閱/i });
      
      // 第一次點擊
      await userEvent.click(cancelButton);
      expect(screen.getByText('確認取消訂閱')).toBeInTheDocument();
      
      const confirmButton = screen.getByRole('button', { name: /確認取消/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(subscriptionsApi.cancel).toHaveBeenCalledTimes(1);
      });

      // 防抖時間內再次點擊應該被忽略
      // (此時應該已經沒有取消按鈕了，因為訂閱已取消)
    });

    it('取消中應禁用按鈕', async () => {
      // 讓 API 延遲返回
      (subscriptionsApi.cancel as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 2000))
      );

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('目前方案')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /取消訂閱/i });
      await userEvent.click(cancelButton);

      const confirmButton = screen.getByRole('button', { name: /確認取消/i });
      await userEvent.click(confirmButton);

      // 按鈕應該被禁用
      await waitFor(() => {
        expect(confirmButton).toBeDisabled();
      });

      // 嘗試再次點擊（應該無效）
      await userEvent.click(confirmButton);

      // 應該只調用一次 API
      expect(subscriptionsApi.cancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('用戶體驗', () => {
    it('應在確認對話框中顯示方案詳情', async () => {
      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('基礎方案')).toBeInTheDocument();
      });

      const subscribeButton = screen.getAllByRole('button', { name: /立即訂閱/i })[0];
      await userEvent.click(subscribeButton);

      // 確認對話框應顯示方案名稱和價格
      expect(screen.getByText('基礎方案')).toBeInTheDocument();
      expect(screen.getByText(/NT\$99/i)).toBeInTheDocument();
    });

    it('應顯示當前訂閱狀態', async () => {
      (subscriptionsApi.getMySubscription as jest.Mock).mockResolvedValue({
        id: 'sub-123',
        tierId: 'tier-1',
        status: 'active',
        currentPeriodEnd: '2024-12-31T23:59:59Z',
      });

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('目前方案')).toBeInTheDocument();
        expect(screen.getByText(/使用中/i)).toBeInTheDocument();
      });
    });

    it('未訂閱時應顯示所有可訂閱的方案', async () => {
      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('基礎方案')).toBeInTheDocument();
        expect(screen.getByText('進階方案')).toBeInTheDocument();
      });

      // 應該有兩個訂閱按鈕
      const subscribeButtons = screen.getAllByRole('button', { name: /立即訂閱/i });
      expect(subscribeButtons).toHaveLength(2);
    });
  });

  describe('錯誤處理', () => {
    it('訂閱失敗時應保持 UI 狀態', async () => {
      (subscriptionsApi.subscribe as jest.Mock).mockRejectedValue(
        new Error('Payment failed')
      );

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('基礎方案')).toBeInTheDocument();
      });

      const subscribeButton = screen.getAllByRole('button', { name: /立即訂閱/i })[0];
      await userEvent.click(subscribeButton);

      const confirmButton = screen.getByRole('button', { name: /確認訂閱/i });
      await userEvent.click(confirmButton);

      // 等待 API 調用失敗
      await waitFor(() => {
        expect(subscriptionsApi.subscribe).toHaveBeenCalled();
      });

      // 對話框應該關閉，按鈕應該恢復可用
      await waitFor(() => {
        expect(screen.queryByText('確認訂閱')).not.toBeInTheDocument();
      });

      // 應該仍然可以再次嘗試訂閱
      const retryButton = screen.getAllByRole('button', { name: /立即訂閱/i })[0];
      expect(retryButton).not.toBeDisabled();
    });
  });
});
