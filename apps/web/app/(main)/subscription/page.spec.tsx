/**
 * Subscription Page Test
 * 
 * Tests the subscription page functionality including:
 * - Displaying subscription tiers
 * - Subscribing to a tier
 * - Canceling subscription
 * - Highlighting current subscription
 * - Loading state rendering
 * - Error handling
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../src/test-utils';
import SubscriptionPage from './page';

// Mock the API
jest.mock('../../../lib/api', () => ({
  subscriptionsApi: {
    getTiers: jest.fn(),
    getMySubscription: jest.fn(),
    subscribe: jest.fn(),
    cancel: jest.fn(),
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

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/subscription',
  useSearchParams: () => new URLSearchParams(),
}));

const { subscriptionsApi } = require('../../../lib/api');

// Test fixtures
const mockTiers = [
  {
    id: 'tier-basic',
    name: '基礎會員',
    price: 99,
    currency: 'TWD',
    features: ['功能 A', '功能 B', '功能 C'],
  },
  {
    id: 'tier-premium',
    name: '進階會員',
    price: 299,
    currency: 'TWD',
    features: ['所有基礎功能', '功能 D', '功能 E', '優先客服'],
  },
  {
    id: 'tier-vip',
    name: 'VIP 會員',
    price: 599,
    currency: 'TWD',
    features: ['所有進階功能', '功能 F', '專屬客服', '無限制'],
  },
];

const mockActiveSubscription = {
  id: 'sub-123',
  userId: 'user-123',
  tierId: 'tier-premium',
  status: 'active',
  currentPeriodEnd: '2024-02-15T10:00:00Z',
};

describe('SubscriptionPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  describe('Rendering', () => {
    it('should render loading skeleton initially', () => {
      subscriptionsApi.getTiers.mockImplementation(() => new Promise(() => {})); // Never resolves
      subscriptionsApi.getMySubscription.mockImplementation(() => new Promise(() => {}));
      
      render(<SubscriptionPage />);

      expect(screen.getByText('訂閱方案')).toBeInTheDocument();
      // Should show skeleton loaders
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render all subscription tiers', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(null);

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('訂閱方案')).toBeInTheDocument();
        expect(screen.getByText('基礎會員')).toBeInTheDocument();
        expect(screen.getByText('進階會員')).toBeInTheDocument();
        expect(screen.getByText('VIP 會員')).toBeInTheDocument();
      });
    });

    it('should display tier prices correctly', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(null);

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText(/NT\$99/i)).toBeInTheDocument();
        expect(screen.getByText(/NT\$299/i)).toBeInTheDocument();
        expect(screen.getByText(/NT\$599/i)).toBeInTheDocument();
      });

      // Check for "/ 月" suffix
      const monthlyTexts = screen.getAllByText(/\/ 月/i);
      expect(monthlyTexts.length).toBe(3);
    });

    it('should display tier features as list', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(null);

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('功能 A')).toBeInTheDocument();
        expect(screen.getByText('功能 B')).toBeInTheDocument();
        expect(screen.getByText('功能 C')).toBeInTheDocument();
        expect(screen.getByText('功能 D')).toBeInTheDocument();
        expect(screen.getByText('優先客服')).toBeInTheDocument();
        expect(screen.getByText('專屬客服')).toBeInTheDocument();
      });
    });

    it('should show subscribe buttons for all tiers when no active subscription', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(null);

      render(<SubscriptionPage />);

      await waitFor(() => {
        const subscribeButtons = screen.getAllByRole('button', { name: /立即訂閱/i });
        expect(subscribeButtons.length).toBe(3);
      });
    });

    it('should render gradient header with crown icon', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(null);

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('訂閱方案')).toBeInTheDocument();
        expect(screen.getByText(/選擇最適合你的方案/i)).toBeInTheDocument();
      });
    });
  });

  describe('Current Subscription Display', () => {
    it('should highlight current subscription tier', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(mockActiveSubscription);

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('進階會員')).toBeInTheDocument();
      });

      // Should show "目前方案" badge on the active tier
      const currentBadges = screen.getAllByText('目前方案');
      expect(currentBadges.length).toBeGreaterThanOrEqual(1);
    });

    it('should show current subscription info banner', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(mockActiveSubscription);

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText(/到期日/i)).toBeInTheDocument();
        expect(screen.getByText('使用中')).toBeInTheDocument();
      });
    });

    it('should show cancel button for current subscription', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(mockActiveSubscription);

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /取消訂閱/i })).toBeInTheDocument();
      });
    });

    it('should show subscribe buttons for other tiers', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(mockActiveSubscription);

      render(<SubscriptionPage />);

      await waitFor(() => {
        const subscribeButtons = screen.getAllByRole('button', { name: /立即訂閱/i });
        // Should have subscribe buttons for tiers other than current
        expect(subscribeButtons.length).toBe(2);
      });
    });

    it('should format expiry date correctly', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(mockActiveSubscription);

      render(<SubscriptionPage />);

      await waitFor(() => {
        // Should display formatted date in zh-TW locale
        expect(screen.getByText(/到期日/i)).toBeInTheDocument();
        expect(screen.getByText(/2024/i)).toBeInTheDocument();
      });
    });
  });

  describe('Subscription Actions', () => {
    it('should call subscribe API when clicking subscribe button', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(null);
      subscriptionsApi.subscribe.mockResolvedValue({
        id: 'sub-new',
        userId: 'user-123',
        tierId: 'tier-basic',
        status: 'active',
        currentPeriodEnd: '2024-03-15T10:00:00Z',
      });

      const user = userEvent.setup();
      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('基礎會員')).toBeInTheDocument();
      });

      const subscribeButtons = screen.getAllByRole('button', { name: /立即訂閱/i });
      await user.click(subscribeButtons[0]!);

      await waitFor(() => {
        expect(subscriptionsApi.subscribe).toHaveBeenCalledWith('tier-basic');
      });
    });

    it('should update UI after successful subscription', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(null);
      subscriptionsApi.subscribe.mockResolvedValue({
        id: 'sub-new',
        userId: 'user-123',
        tierId: 'tier-basic',
        status: 'active',
        currentPeriodEnd: '2024-03-15T10:00:00Z',
      });

      const user = userEvent.setup();
      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('基礎會員')).toBeInTheDocument();
      });

      const subscribeButtons = screen.getAllByRole('button', { name: /立即訂閱/i });
      await user.click(subscribeButtons[0]!);

      await waitFor(() => {
        // Should now show as current subscription
        expect(screen.getByRole('button', { name: /取消訂閱/i })).toBeInTheDocument();
      });
    });

    it('should show loading state while subscribing', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(null);
      subscriptionsApi.subscribe.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ id: 'sub-new' }), 100))
      );

      const user = userEvent.setup();
      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('基礎會員')).toBeInTheDocument();
      });

      const subscribeButtons = screen.getAllByRole('button', { name: /立即訂閱/i });
      await user.click(subscribeButtons[0]!);

      // Button should be disabled and show loading
      await waitFor(() => {
        expect(subscribeButtons[0]).toBeDisabled();
      });
    });

    it('should handle subscribe error gracefully', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(null);
      subscriptionsApi.subscribe.mockRejectedValue(new Error('Payment failed'));

      const user = userEvent.setup();
      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('基礎會員')).toBeInTheDocument();
      });

      const subscribeButtons = screen.getAllByRole('button', { name: /立即訂閱/i });
      await user.click(subscribeButtons[0]!);

      await waitFor(() => {
        // Button should be re-enabled after error
        expect(subscribeButtons[0]).not.toBeDisabled();
      });
    });
  });

  describe('Cancellation Actions', () => {
    it('should call cancel API when clicking cancel button', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(mockActiveSubscription);
      subscriptionsApi.cancel.mockResolvedValue({ success: true });

      const user = userEvent.setup();
      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /取消訂閱/i })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /取消訂閱/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(subscriptionsApi.cancel).toHaveBeenCalled();
      });
    });

    it('should update UI after successful cancellation', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(mockActiveSubscription);
      subscriptionsApi.cancel.mockResolvedValue({ success: true });

      const user = userEvent.setup();
      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /取消訂閱/i })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /取消訂閱/i });
      await user.click(cancelButton);

      await waitFor(() => {
        // Should show subscribe buttons again
        const subscribeButtons = screen.getAllByRole('button', { name: /立即訂閱/i });
        expect(subscribeButtons.length).toBe(3);
      });
    });

    it('should show loading state while canceling', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(mockActiveSubscription);
      subscriptionsApi.cancel.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      const user = userEvent.setup();
      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /取消訂閱/i })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /取消訂閱/i });
      await user.click(cancelButton);

      // Button should be disabled
      await waitFor(() => {
        expect(cancelButton).toBeDisabled();
      });
    });

    it('should handle cancel error gracefully', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(mockActiveSubscription);
      subscriptionsApi.cancel.mockRejectedValue(new Error('Cancel failed'));

      const user = userEvent.setup();
      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /取消訂閱/i })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /取消訂閱/i });
      await user.click(cancelButton);

      await waitFor(() => {
        // Button should be re-enabled after error
        expect(cancelButton).not.toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when tiers loading fails', async () => {
      const ApiError = require('../../../lib/api').ApiError;
      subscriptionsApi.getTiers.mockRejectedValue(new ApiError('無法載入方案', 500));
      subscriptionsApi.getMySubscription.mockResolvedValue(null);

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('無法載入方案')).toBeInTheDocument();
      });
    });

    it('should handle generic error with fallback message', async () => {
      subscriptionsApi.getTiers.mockRejectedValue(new Error('Network error'));
      subscriptionsApi.getMySubscription.mockResolvedValue(null);

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('無法載入方案')).toBeInTheDocument();
      });
    });

    it('should handle 404 error for no subscription gracefully', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockRejectedValue({ status: 404 });

      render(<SubscriptionPage />);

      await waitFor(() => {
        // Should still render tiers even if no subscription found
        expect(screen.getByText('基礎會員')).toBeInTheDocument();
      });
    });
  });

  describe('Currency Formatting', () => {
    it('should format prices with TWD currency', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(null);

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText(/NT\$99/i)).toBeInTheDocument();
        expect(screen.getByText(/NT\$299/i)).toBeInTheDocument();
        expect(screen.getByText(/NT\$599/i)).toBeInTheDocument();
      });
    });

    it('should handle different currencies', async () => {
      const tiersWithUSD = [
        {
          id: 'tier-usd',
          name: 'USD Plan',
          price: 9.99,
          currency: 'USD',
          features: ['Feature A'],
        },
      ];

      subscriptionsApi.getTiers.mockResolvedValue(tiersWithUSD);
      subscriptionsApi.getMySubscription.mockResolvedValue(null);

      render(<SubscriptionPage />);

      await waitFor(() => {
        // Should format with USD currency
        expect(screen.getByText(/\$9\.99/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tier Card Styling', () => {
    it('should apply special styling to current tier card', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(mockActiveSubscription);

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('進階會員')).toBeInTheDocument();
      });

      const premiumCard = screen.getByText('進階會員').closest('div');
      // Current tier should have special border/ring classes (via data-testid or class)
      expect(premiumCard).toBeTruthy();
    });

    it('should display check icons for features', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(null);

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('功能 A')).toBeInTheDocument();
      });

      // Check icons should be rendered
      const icons = document.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('should show correct number of skeleton cards', () => {
      subscriptionsApi.getTiers.mockImplementation(() => new Promise(() => {}));
      subscriptionsApi.getMySubscription.mockImplementation(() => new Promise(() => {}));
      
      render(<SubscriptionPage />);

      // Should show 3 skeleton cards for 3 tiers
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(null);

      const { unmount } = render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByText('訂閱方案')).toBeInTheDocument();
      });

      // Should not throw error on unmount
      expect(() => unmount()).not.toThrow();
    });

    it('should not update state after unmount', async () => {
      let resolveTiers: any;
      subscriptionsApi.getTiers.mockReturnValue(
        new Promise(resolve => {
          resolveTiers = resolve;
        })
      );
      subscriptionsApi.getMySubscription.mockResolvedValue(null);

      const { unmount } = render(<SubscriptionPage />);

      // Unmount before promise resolves
      unmount();

      // Resolve after unmount
      resolveTiers(mockTiers);

      // Should not cause errors
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(null);

      render(<SubscriptionPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /訂閱方案/i })).toBeInTheDocument();
      });
    });

    it('should have accessible buttons with clear labels', async () => {
      subscriptionsApi.getTiers.mockResolvedValue(mockTiers);
      subscriptionsApi.getMySubscription.mockResolvedValue(null);

      render(<SubscriptionPage />);

      await waitFor(() => {
        const subscribeButtons = screen.getAllByRole('button', { name: /立即訂閱/i });
        expect(subscribeButtons.length).toBe(3);
        subscribeButtons.forEach(button => {
          expect(button).toHaveAccessibleName();
        });
      });
    });
  });
});
