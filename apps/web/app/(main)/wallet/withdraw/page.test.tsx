/**
 * 提款頁面測試
 * 測試提款金額驗證和幂等性保護
 */

import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WithdrawPage from './page';
import { paymentsApi } from '../../../../lib/api';

// Mock API
jest.mock('../../../../lib/api', () => ({
  paymentsApi: {
    getWallet: jest.fn(),
    getWithdrawals: jest.fn(),
    requestWithdrawal: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

describe('WithdrawPage - 提款金額驗證', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 默認 mock 返回值
    (paymentsApi.getWallet as jest.Mock).mockResolvedValue({
      balance: 10000,
    });
    
    (paymentsApi.getWithdrawals as jest.Mock).mockResolvedValue([]);
  });

  describe('金額範圍驗證', () => {
    it('應拒絕低於最低金額 ($20) 的提款', async () => {
      render(<WithdrawPage />);

      await waitFor(() => {
        expect(screen.getByText('$10,000')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText('提款金額');
      const submitButton = screen.getByRole('button', { name: /確認提款/i });

      // 輸入低於最低金額
      await userEvent.clear(amountInput);
      await userEvent.type(amountInput, '10');
      
      await userEvent.click(submitButton);

      // 應顯示錯誤訊息
      await waitFor(() => {
        expect(screen.getByText(/最低提款金額為 \$20/i)).toBeInTheDocument();
      });

      // 不應該調用 API
      expect(paymentsApi.requestWithdrawal).not.toHaveBeenCalled();
    });

    it('應拒絕高於最高金額 ($50,000) 的提款', async () => {
      render(<WithdrawPage />);

      await waitFor(() => {
        expect(screen.getByText('$10,000')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText('提款金額');
      const submitButton = screen.getByRole('button', { name: /確認提款/i });

      // 輸入高於最高金額
      await userEvent.clear(amountInput);
      await userEvent.type(amountInput, '60000');
      
      await userEvent.click(submitButton);

      // 應顯示錯誤訊息
      await waitFor(() => {
        expect(screen.getByText(/單次提款不能超過 \$50,000/i)).toBeInTheDocument();
      });

      expect(paymentsApi.requestWithdrawal).not.toHaveBeenCalled();
    });

    it('應接受範圍內的提款金額', async () => {
      (paymentsApi.requestWithdrawal as jest.Mock).mockResolvedValue({
        id: 'withdraw-123',
        status: 'pending',
      });

      render(<WithdrawPage />);

      await waitFor(() => {
        expect(screen.getByText('$10,000')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText('提款金額');
      const submitButton = screen.getByRole('button', { name: /確認提款/i });

      // 輸入有效金額
      await userEvent.clear(amountInput);
      await userEvent.type(amountInput, '1000');
      
      await userEvent.click(submitButton);

      // 應顯示確認對話框
      await waitFor(() => {
        expect(screen.getByText('確認提款')).toBeInTheDocument();
      });

      // 確認提款
      const confirmButton = screen.getByRole('button', { name: /確認送出/i });
      await userEvent.click(confirmButton);

      // 應調用 API
      await waitFor(() => {
        expect(paymentsApi.requestWithdrawal).toHaveBeenCalledWith(
          1000,
          'bank_transfer',
          expect.any(String),
          'test-uuid-1234'
        );
      });
    });
  });

  describe('小數位數驗證', () => {
    it('應拒絕超過兩位小數的金額', async () => {
      render(<WithdrawPage />);

      await waitFor(() => {
        expect(screen.getByText('$10,000')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText('提款金額');
      const submitButton = screen.getByRole('button', { name: /確認提款/i });

      // 輸入三位小數
      await userEvent.clear(amountInput);
      await userEvent.type(amountInput, '100.123');
      
      await userEvent.click(submitButton);

      // 應顯示錯誤訊息
      await waitFor(() => {
        expect(screen.getByText(/金額最多 2 位小數/i)).toBeInTheDocument();
      });

      expect(paymentsApi.requestWithdrawal).not.toHaveBeenCalled();
    });

    it('應接受兩位小數的金額', async () => {
      (paymentsApi.requestWithdrawal as jest.Mock).mockResolvedValue({
        id: 'withdraw-123',
        status: 'pending',
      });

      render(<WithdrawPage />);

      await waitFor(() => {
        expect(screen.getByText('$10,000')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText('提款金額');
      await userEvent.clear(amountInput);
      await userEvent.type(amountInput, '100.50');
      
      const submitButton = screen.getByRole('button', { name: /確認提款/i });
      await userEvent.click(submitButton);

      // 應顯示確認對話框
      await waitFor(() => {
        expect(screen.getByText('確認提款')).toBeInTheDocument();
      });
    });
  });

  describe('餘額檢查', () => {
    it('應拒絕超過可用餘額的提款', async () => {
      (paymentsApi.getWallet as jest.Mock).mockResolvedValue({
        balance: 100,
      });

      render(<WithdrawPage />);

      await waitFor(() => {
        expect(screen.getByText('$100')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText('提款金額');
      const submitButton = screen.getByRole('button', { name: /確認提款/i });

      // 輸入超過餘額的金額
      await userEvent.clear(amountInput);
      await userEvent.type(amountInput, '200');
      
      await userEvent.click(submitButton);

      // 應顯示錯誤訊息
      await waitFor(() => {
        expect(screen.getByText(/可用餘額不足/i)).toBeInTheDocument();
      });

      expect(paymentsApi.requestWithdrawal).not.toHaveBeenCalled();
    });

    it('應考慮待處理提款計算可用餘額', async () => {
      (paymentsApi.getWallet as jest.Mock).mockResolvedValue({
        balance: 1000,
      });

      (paymentsApi.getWithdrawals as jest.Mock).mockResolvedValue([
        {
          id: 'w1',
          amount: 500,
          status: 'pending',
        },
      ]);

      render(<WithdrawPage />);

      await waitFor(() => {
        expect(screen.getByText('$1,000')).toBeInTheDocument();
        expect(screen.getByText('$500')).toBeInTheDocument(); // 可用餘額
      });

      // 應顯示待處理提款提示
      expect(screen.getByText(/有待處理的提款申請/i)).toBeInTheDocument();
    });
  });

  describe('幂等性保護', () => {
    it('應傳遞幂等性鍵給 API', async () => {
      (paymentsApi.requestWithdrawal as jest.Mock).mockResolvedValue({
        id: 'withdraw-123',
        status: 'pending',
      });

      render(<WithdrawPage />);

      await waitFor(() => {
        expect(screen.getByText('$10,000')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText('提款金額');
      await userEvent.clear(amountInput);
      await userEvent.type(amountInput, '100');
      
      const submitButton = screen.getByRole('button', { name: /確認提款/i });
      await userEvent.click(submitButton);

      // 確認提款
      const confirmButton = screen.getByRole('button', { name: /確認送出/i });
      await userEvent.click(confirmButton);

      // 驗證 API 調用包含幂等性鍵
      await waitFor(() => {
        expect(paymentsApi.requestWithdrawal).toHaveBeenCalledWith(
          100,
          'bank_transfer',
          expect.any(String),
          'test-uuid-1234' // 幂等性鍵
        );
      });
    });

    it('提交中應禁用按鈕防止重複提交', async () => {
      // 讓 API 延遲返回
      (paymentsApi.requestWithdrawal as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ id: 'w1' }), 1000))
      );

      render(<WithdrawPage />);

      await waitFor(() => {
        expect(screen.getByText('$10,000')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText('提款金額');
      await userEvent.clear(amountInput);
      await userEvent.type(amountInput, '100');
      
      const submitButton = screen.getByRole('button', { name: /確認提款/i });
      await userEvent.click(submitButton);

      const confirmButton = screen.getByRole('button', { name: /確認送出/i });
      await userEvent.click(confirmButton);

      // 按鈕應該被禁用
      await waitFor(() => {
        expect(confirmButton).toBeDisabled();
      });

      // 嘗試再次點擊（應該無效）
      await userEvent.click(confirmButton);

      // 應該只調用一次 API
      await waitFor(() => {
        expect(paymentsApi.requestWithdrawal).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('收款帳戶驗證', () => {
    it('應驗證銀行帳號格式', async () => {
      render(<WithdrawPage />);

      await waitFor(() => {
        expect(screen.getByText('$10,000')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText('提款金額');
      const detailsInput = screen.getByLabelText('收款帳戶資訊');
      const submitButton = screen.getByRole('button', { name: /確認提款/i });

      await userEvent.clear(amountInput);
      await userEvent.type(amountInput, '100');
      
      // 輸入無效的銀行帳號（非數字）
      await userEvent.clear(detailsInput);
      await userEvent.type(detailsInput, 'abc123');
      
      await userEvent.click(submitButton);

      // 應顯示錯誤訊息
      await waitFor(() => {
        expect(screen.getByText(/請輸入有效的銀行帳號/i)).toBeInTheDocument();
      });

      expect(paymentsApi.requestWithdrawal).not.toHaveBeenCalled();
    });

    it('應驗證 PayPal email 格式', async () => {
      render(<WithdrawPage />);

      await waitFor(() => {
        expect(screen.getByText('$10,000')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText('提款金額');
      const methodSelect = screen.getByLabelText('提款方式');
      const detailsInput = screen.getByLabelText('收款帳戶資訊');
      const submitButton = screen.getByRole('button', { name: /確認提款/i });

      await userEvent.clear(amountInput);
      await userEvent.type(amountInput, '100');
      
      // 選擇 PayPal
      await userEvent.selectOptions(methodSelect, 'paypal');
      
      // 輸入無效的 email
      await userEvent.clear(detailsInput);
      await userEvent.type(detailsInput, 'invalid-email');
      
      await userEvent.click(submitButton);

      // 應顯示錯誤訊息
      await waitFor(() => {
        expect(screen.getByText(/請輸入有效的 PayPal 電子郵件地址/i)).toBeInTheDocument();
      });

      expect(paymentsApi.requestWithdrawal).not.toHaveBeenCalled();
    });
  });
});
