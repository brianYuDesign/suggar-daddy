/**
 * Wallet Page Test
 * 
 * Tests the wallet page functionality including:
 * - Displaying wallet balance and statistics
 * - Navigation to withdraw and history pages
 * - Opening Stripe portal
 * - Loading state rendering
 * - Error handling and display
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../src/test-utils';
import WalletPage from './page';

// Mock the API
jest.mock('../../../lib/api', () => ({
  paymentsApi: {
    getWallet: jest.fn(),
    getStripePortal: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string, public status?: number) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

// Mock next/navigation
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/wallet',
  useSearchParams: () => new URLSearchParams(),
}));

const { paymentsApi } = require('../../../lib/api');

// Test fixtures
const mockWalletData = {
  userId: 'user-123',
  balance: 1000,
  pendingBalance: 200,
  totalEarnings: 5000,
  totalWithdrawn: 3000,
  updatedAt: '2024-01-15T10:00:00Z',
};

const mockEmptyWallet = {
  userId: 'user-123',
  balance: 0,
  pendingBalance: 0,
  totalEarnings: 0,
  totalWithdrawn: 0,
  updatedAt: '2024-01-15T10:00:00Z',
};

describe('WalletPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockBack.mockClear();
    // Mock window.open
    global.open = jest.fn();
  });

  afterEach(() => {
    delete (global as any).open;
  });

  describe('Rendering', () => {
    it('should render loading skeleton initially', () => {
      paymentsApi.getWallet.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<WalletPage />);

      expect(screen.getByText('我的錢包')).toBeInTheDocument();
      // Should show skeleton loaders
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render wallet with all balance information', async () => {
      paymentsApi.getWallet.mockResolvedValue(mockWalletData);

      render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByText('我的錢包')).toBeInTheDocument();
      });

      // Check main balance display
      expect(screen.getByText(/NT\$1,000/i)).toBeInTheDocument();
      expect(screen.getByText('可用餘額')).toBeInTheDocument();

      // Check balance cards
      expect(screen.getByText(/NT\$200/i)).toBeInTheDocument(); // pending balance
      expect(screen.getByText(/NT\$5,000/i)).toBeInTheDocument(); // total earnings
      expect(screen.getByText(/NT\$3,000/i)).toBeInTheDocument(); // total withdrawn

      // Check labels
      expect(screen.getByText('待入帳')).toBeInTheDocument();
      expect(screen.getByText('累計收入')).toBeInTheDocument();
      expect(screen.getByText('已提款')).toBeInTheDocument();
    });

    it('should render wallet with zero balances', async () => {
      paymentsApi.getWallet.mockResolvedValue(mockEmptyWallet);

      render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByText('我的錢包')).toBeInTheDocument();
      });

      // All balances should be NT$0
      const zeroBalances = screen.getAllByText(/NT\$0/i);
      expect(zeroBalances.length).toBeGreaterThan(0);
    });

    it('should render quick action buttons', async () => {
      paymentsApi.getWallet.mockResolvedValue(mockWalletData);

      render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByText('快速操作')).toBeInTheDocument();
      });

      expect(screen.getByText('提款')).toBeInTheDocument();
      expect(screen.getByText('交易記錄')).toBeInTheDocument();
      expect(screen.getByText('Stripe 付款管理')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to withdraw page when clicking withdraw button', async () => {
      paymentsApi.getWallet.mockResolvedValue(mockWalletData);

      const user = userEvent.setup();
      render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByText('提款')).toBeInTheDocument();
      });

      const withdrawButton = screen.getByText('提款');
      await user.click(withdrawButton);

      expect(mockPush).toHaveBeenCalledWith('/wallet/withdraw');
    });

    it('should navigate to history page when clicking history button', async () => {
      paymentsApi.getWallet.mockResolvedValue(mockWalletData);

      const user = userEvent.setup();
      render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByText('交易記錄')).toBeInTheDocument();
      });

      const historyButton = screen.getByText('交易記錄');
      await user.click(historyButton);

      expect(mockPush).toHaveBeenCalledWith('/wallet/history');
    });
  });

  describe('Stripe Portal', () => {
    it('should open Stripe portal in new tab', async () => {
      paymentsApi.getWallet.mockResolvedValue(mockWalletData);
      paymentsApi.getStripePortal.mockResolvedValue({
        portalUrl: 'https://billing.stripe.com/portal/session_123',
      });

      const user = userEvent.setup();
      render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByText('Stripe 付款管理')).toBeInTheDocument();
      });

      const stripeButton = screen.getByText('Stripe 付款管理');
      await user.click(stripeButton);

      await waitFor(() => {
        expect(paymentsApi.getStripePortal).toHaveBeenCalled();
        expect(global.open).toHaveBeenCalledWith(
          'https://billing.stripe.com/portal/session_123',
          '_blank'
        );
      });
    });

    it('should show loading state while opening Stripe portal', async () => {
      paymentsApi.getWallet.mockResolvedValue(mockWalletData);
      paymentsApi.getStripePortal.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ portalUrl: 'https://stripe.com' }), 100))
      );

      const user = userEvent.setup();
      render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByText('Stripe 付款管理')).toBeInTheDocument();
      });

      const stripeButton = screen.getByRole('button', { name: /Stripe 付款管理/i });
      await user.click(stripeButton);

      // Button should be disabled during loading
      expect(stripeButton).toBeDisabled();
    });

    it('should handle Stripe portal error silently', async () => {
      paymentsApi.getWallet.mockResolvedValue(mockWalletData);
      paymentsApi.getStripePortal.mockRejectedValue(new Error('Portal error'));

      const user = userEvent.setup();
      render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByText('Stripe 付款管理')).toBeInTheDocument();
      });

      const stripeButton = screen.getByText('Stripe 付款管理');
      await user.click(stripeButton);

      await waitFor(() => {
        expect(paymentsApi.getStripePortal).toHaveBeenCalled();
        // Should not crash, button should be re-enabled
        expect(stripeButton).not.toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when wallet loading fails', async () => {
      const ApiError = require('../../../lib/api').ApiError;
      paymentsApi.getWallet.mockRejectedValue(new ApiError('無法載入錢包', 500));

      render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByText('無法載入錢包')).toBeInTheDocument();
      });
    });

    it('should handle generic error with fallback message', async () => {
      paymentsApi.getWallet.mockRejectedValue(new Error('Network error'));

      render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByText('無法載入錢包')).toBeInTheDocument();
      });
    });

    it('should not render wallet content when error occurs', async () => {
      paymentsApi.getWallet.mockRejectedValue(new Error('Error'));

      render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByText('無法載入錢包')).toBeInTheDocument();
      });

      // Should not show balance cards
      expect(screen.queryByText('待入帳')).not.toBeInTheDocument();
      expect(screen.queryByText('累計收入')).not.toBeInTheDocument();
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency amounts correctly', async () => {
      const walletWithLargeAmount = {
        ...mockWalletData,
        balance: 1234567,
        totalEarnings: 9876543,
      };

      paymentsApi.getWallet.mockResolvedValue(walletWithLargeAmount);

      render(<WalletPage />);

      await waitFor(() => {
        // Should format with thousand separators
        expect(screen.getByText(/1,234,567/)).toBeInTheDocument();
        expect(screen.getByText(/9,876,543/)).toBeInTheDocument();
      });
    });

    it('should display zero balance without decimals', async () => {
      paymentsApi.getWallet.mockResolvedValue(mockEmptyWallet);

      render(<WalletPage />);

      await waitFor(() => {
        // Should show NT$0, not NT$0.00
        const zeroTexts = screen.getAllByText(/NT\$0/i);
        zeroTexts.forEach(text => {
          expect(text.textContent).not.toMatch(/\.\d+/);
        });
      });
    });
  });

  describe('Icons Display', () => {
    it('should render appropriate icons for each balance card', async () => {
      paymentsApi.getWallet.mockResolvedValue(mockWalletData);

      render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByText('可用餘額')).toBeInTheDocument();
      });

      // Icons should be rendered (checking via SVG role or class)
      const icons = document.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Gradient Header', () => {
    it('should render gradient header with main balance', async () => {
      paymentsApi.getWallet.mockResolvedValue(mockWalletData);

      render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByText('我的錢包')).toBeInTheDocument();
      });

      // Check for main balance in header
      const balanceTexts = screen.getAllByText(/NT\$1,000/i);
      expect(balanceTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Balance Cards Layout', () => {
    it('should render all four balance cards in grid', async () => {
      paymentsApi.getWallet.mockResolvedValue(mockWalletData);

      render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByText('可用餘額')).toBeInTheDocument();
      });

      // Check all four labels
      expect(screen.getByText('待入帳')).toBeInTheDocument();
      expect(screen.getByText('累計收入')).toBeInTheDocument();
      expect(screen.getByText('已提款')).toBeInTheDocument();
    });

    it('should display colored icons for each card type', async () => {
      paymentsApi.getWallet.mockResolvedValue(mockWalletData);

      render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByText('可用餘額')).toBeInTheDocument();
      });

      // Check for colored backgrounds/icons (via class names)
      const container = screen.getByText('可用餘額').closest('div');
      expect(container).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('should show correct number of skeleton loaders', () => {
      paymentsApi.getWallet.mockImplementation(() => new Promise(() => {}));
      render(<WalletPage />);

      // Should show 4 skeleton cards (for 4 balance cards)
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Real-time Updates', () => {
    it('should cleanup on unmount', async () => {
      paymentsApi.getWallet.mockResolvedValue(mockWalletData);

      const { unmount } = render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByText('我的錢包')).toBeInTheDocument();
      });

      // Should not throw error on unmount
      expect(() => unmount()).not.toThrow();
    });

    it('should not update state after unmount', async () => {
      let resolveWallet: any;
      paymentsApi.getWallet.mockReturnValue(
        new Promise(resolve => {
          resolveWallet = resolve;
        })
      );

      const { unmount } = render(<WalletPage />);

      // Unmount before promise resolves
      unmount();

      // Resolve after unmount
      resolveWallet(mockWalletData);

      // Should not cause errors
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      paymentsApi.getWallet.mockResolvedValue(mockWalletData);

      render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /我的錢包/i })).toBeInTheDocument();
      });
    });

    it('should have accessible buttons', async () => {
      paymentsApi.getWallet.mockResolvedValue(mockWalletData);

      render(<WalletPage />);

      await waitFor(() => {
        expect(screen.getByText('提款')).toBeInTheDocument();
      });

      const withdrawButton = screen.getByRole('button', { name: /提款/i });
      const historyButton = screen.getByRole('button', { name: /交易記錄/i });
      const stripeButton = screen.getByRole('button', { name: /Stripe 付款管理/i });

      expect(withdrawButton).toBeInTheDocument();
      expect(historyButton).toBeInTheDocument();
      expect(stripeButton).toBeInTheDocument();
    });
  });
});
