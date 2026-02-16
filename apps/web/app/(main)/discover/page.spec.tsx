/**
 * Discover Page Test
 * 
 * Tests the discover page (card swipe) functionality including:
 * - Card rendering with user information
 * - Swipe actions (like, pass, super_like)
 * - Match celebration modal
 * - Auto-loading more cards
 * - Empty state handling
 * - Error handling and retry
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import DiscoverPage from './page';

// Mock useAuth
const mockUser = {
  id: 'test-user-id',
  userType: 'sugar_daddy',
  permissionRole: 'user',
  displayName: 'Test User',
  bio: 'Test bio',
  avatarUrl: 'https://example.com/avatar.jpg',
  verificationStatus: 'verified',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

jest.mock('../../../providers/auth-provider', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
  }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/discover',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the API
jest.mock('../../../lib/api', () => ({
  matchingApi: {
    getCards: jest.fn(),
    swipe: jest.fn(),
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
  usePathname: () => '/discover',
  useSearchParams: () => new URLSearchParams(),
}));

const { matchingApi } = require('../../../lib/api');

// Test fixtures
const mockUserCard = {
  id: 'user-1',
  displayName: 'Test User',
  bio: 'This is a test bio',
  avatarUrl: 'https://example.com/avatar.jpg',
  userType: 'sugar_baby',
  permissionRole: 'user',
  verificationStatus: 'verified',
  lastActiveAt: new Date('2024-01-01'),
};

const mockUserCard2 = {
  id: 'user-2',
  displayName: 'Second User',
  bio: 'Another test bio',
  avatarUrl: 'https://example.com/avatar2.jpg',
  userType: 'sugar_daddy',
  permissionRole: 'user',
  verificationStatus: 'pending',
  lastActiveAt: new Date('2024-01-02'),
};

describe('DiscoverPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockBack.mockClear();
  });

  describe('Rendering', () => {
    it('should render loading skeleton initially', () => {
      matchingApi.getCards.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<DiscoverPage />);

      // Should show skeleton loaders
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render user card with all information', async () => {
      matchingApi.getCards.mockResolvedValue({
        cards: [mockUserCard],
        nextCursor: null,
      });

      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('探索')).toBeInTheDocument();
        expect(screen.getByText('找到你感興趣的人')).toBeInTheDocument();
      });

      // Check user card information
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('This is a test bio')).toBeInTheDocument();
      expect(screen.getByText('Creator')).toBeInTheDocument(); // role label
      expect(screen.getByText('已認證')).toBeInTheDocument();
    });

    it('should render card with initials when no avatar', async () => {
      const cardWithoutAvatar = {
        ...mockUserCard,
        avatarUrl: undefined,
      };

      matchingApi.getCards.mockResolvedValue({
        cards: [cardWithoutAvatar],
        nextCursor: null,
      });

      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('TE')).toBeInTheDocument(); // First 2 chars
      });
    });

    it('should render empty bio message when no bio provided', async () => {
      const cardWithoutBio = {
        ...mockUserCard,
        bio: undefined,
      };

      matchingApi.getCards.mockResolvedValue({
        cards: [cardWithoutBio],
        nextCursor: null,
      });

      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('這位用戶還沒有填寫自我介紹')).toBeInTheDocument();
      });
    });

    it('should render action buttons', async () => {
      matchingApi.getCards.mockResolvedValue({
        cards: [mockUserCard],
        nextCursor: null,
      });

      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('跳過')).toBeInTheDocument();
        expect(screen.getByLabelText('喜歡')).toBeInTheDocument();
        expect(screen.getByLabelText('超級喜歡')).toBeInTheDocument();
      });
    });
  });

  describe('Swipe Actions', () => {
    it('should handle pass action', async () => {
      matchingApi.getCards.mockResolvedValue({
        cards: [mockUserCard, mockUserCard2],
        nextCursor: null,
      });
      matchingApi.swipe.mockResolvedValue({ matched: false });

      const user = userEvent.setup();
      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      const passButton = screen.getByLabelText('跳過');
      await user.click(passButton);

      await waitFor(() => {
        expect(matchingApi.swipe).toHaveBeenCalledWith({
          targetUserId: 'user-1',
          action: 'pass',
        });
      });

      // Should show next card
      await waitFor(() => {
        expect(screen.getByText('Second User')).toBeInTheDocument();
      });
    });

    it('should handle like action', async () => {
      matchingApi.getCards.mockResolvedValue({
        cards: [mockUserCard],
        nextCursor: null,
      });
      matchingApi.swipe.mockResolvedValue({ matched: false });

      const user = userEvent.setup();
      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      const likeButton = screen.getByLabelText('喜歡');
      await user.click(likeButton);

      await waitFor(() => {
        expect(matchingApi.swipe).toHaveBeenCalledWith({
          targetUserId: 'user-1',
          action: 'like',
        });
      });
    });

    it('should handle super like action', async () => {
      matchingApi.getCards.mockResolvedValue({
        cards: [mockUserCard],
        nextCursor: null,
      });
      matchingApi.swipe.mockResolvedValue({ matched: false });

      const user = userEvent.setup();
      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      const superLikeButton = screen.getByLabelText('超級喜歡');
      await user.click(superLikeButton);

      await waitFor(() => {
        expect(matchingApi.swipe).toHaveBeenCalledWith({
          targetUserId: 'user-1',
          action: 'super_like',
        });
      });
    });

    it('should disable buttons while swiping', async () => {
      matchingApi.getCards.mockResolvedValue({
        cards: [mockUserCard],
        nextCursor: null,
      });
      matchingApi.swipe.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ matched: false }), 100)));

      const user = userEvent.setup();
      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      const likeButton = screen.getByLabelText('喜歡');
      await user.click(likeButton);

      // Buttons should be disabled
      expect(likeButton).toBeDisabled();
      expect(screen.getByLabelText('跳過')).toBeDisabled();
      expect(screen.getByLabelText('超級喜歡')).toBeDisabled();
    });
  });

  describe('Match Modal', () => {
    it('should show match modal when matched', async () => {
      matchingApi.getCards.mockResolvedValue({
        cards: [mockUserCard],
        nextCursor: null,
      });
      matchingApi.swipe.mockResolvedValue({
        matched: true,
        matchId: 'match-123',
      });

      const user = userEvent.setup();
      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      const likeButton = screen.getByLabelText('喜歡');
      await user.click(likeButton);

      await waitFor(() => {
        expect(screen.getByText('配對成功！')).toBeInTheDocument();
        expect(screen.getByText(/互相喜歡對方/i)).toBeInTheDocument();
      });
    });

    it('should navigate to messages when clicking send message in match modal', async () => {
      matchingApi.getCards.mockResolvedValue({
        cards: [mockUserCard],
        nextCursor: null,
      });
      matchingApi.swipe.mockResolvedValue({
        matched: true,
        matchId: 'match-123',
      });

      const user = userEvent.setup();
      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      const likeButton = screen.getByLabelText('喜歡');
      await user.click(likeButton);

      await waitFor(() => {
        expect(screen.getByText('配對成功！')).toBeInTheDocument();
      });

      const sendMessageButton = screen.getByRole('button', { name: /發送訊息/i });
      await user.click(sendMessageButton);

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/messages'));
    });

    it('should close match modal and continue discovering', async () => {
      matchingApi.getCards.mockResolvedValue({
        cards: [mockUserCard, mockUserCard2],
        nextCursor: null,
      });
      matchingApi.swipe.mockResolvedValue({
        matched: true,
        matchId: 'match-123',
      });

      const user = userEvent.setup();
      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      const likeButton = screen.getByLabelText('喜歡');
      await user.click(likeButton);

      await waitFor(() => {
        expect(screen.getByText('配對成功！')).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /繼續探索/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.queryByText('配對成功！')).not.toBeInTheDocument();
      });
    });
  });

  describe('Pagination and Auto-loading', () => {
    it('should load more cards when reaching the end', async () => {
      // First load
      matchingApi.getCards.mockResolvedValueOnce({
        cards: [mockUserCard],
        nextCursor: 'cursor-123',
      });

      // Second load
      matchingApi.getCards.mockResolvedValueOnce({
        cards: [mockUserCard2],
        nextCursor: null,
      });

      matchingApi.swipe.mockResolvedValue({ matched: false });

      const user = userEvent.setup();
      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      // Pass the first card
      const passButton = screen.getByLabelText('跳過');
      await user.click(passButton);

      // Should fetch more cards and show second card
      await waitFor(() => {
        expect(matchingApi.getCards).toHaveBeenCalledWith('cursor-123');
        expect(screen.getByText('Second User')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no cards available', async () => {
      matchingApi.getCards.mockResolvedValue({
        cards: [],
        nextCursor: null,
      });

      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('目前沒有更多推薦')).toBeInTheDocument();
        expect(screen.getByText(/你已經看完所有推薦的人了/i)).toBeInTheDocument();
      });
    });

    it('should show empty state after swiping through all cards', async () => {
      matchingApi.getCards.mockResolvedValue({
        cards: [mockUserCard],
        nextCursor: null,
      });
      matchingApi.swipe.mockResolvedValue({ matched: false });

      const user = userEvent.setup();
      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      const passButton = screen.getByLabelText('跳過');
      await user.click(passButton);

      await waitFor(() => {
        expect(screen.getByText('目前沒有更多推薦')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error state when API fails', async () => {
      const ApiError = require('../../../lib/api').ApiError;
      matchingApi.getCards.mockRejectedValue(new ApiError('載入失敗', 500));

      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('載入失敗')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /重試/i })).toBeInTheDocument();
      });
    });

    it('should retry loading cards when clicking retry button', async () => {
      const ApiError = require('../../../lib/api').ApiError;
      matchingApi.getCards.mockRejectedValueOnce(new ApiError('載入失敗', 500));
      matchingApi.getCards.mockResolvedValueOnce({
        cards: [mockUserCard],
        nextCursor: null,
      });

      const user = userEvent.setup();
      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('載入失敗')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /重試/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });
    });

    it('should show error message on swipe failure', async () => {
      const ApiError = require('../../../lib/api').ApiError;
      matchingApi.getCards.mockResolvedValue({
        cards: [mockUserCard],
        nextCursor: null,
      });
      matchingApi.swipe.mockRejectedValue(new ApiError('操作失敗', 500));

      const user = userEvent.setup();
      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      const likeButton = screen.getByLabelText('喜歡');
      await user.click(likeButton);

      await waitFor(() => {
        expect(screen.getByText(/操作失敗/i)).toBeInTheDocument();
      });
    });

    it('should handle generic error with fallback message', async () => {
      matchingApi.getCards.mockRejectedValue(new Error('Network error'));

      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText(/無法載入推薦用戶/i)).toBeInTheDocument();
      });
    });
  });

  describe('Role Labels', () => {
    it('should display correct role labels', async () => {
      const daddyCard = { ...mockUserCard, userType: 'sugar_daddy' };
  permissionRole: 'user',
      matchingApi.getCards.mockResolvedValue({
        cards: [daddyCard],
        nextCursor: null,
      });

      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('Sugar Daddy')).toBeInTheDocument();
      });
    });

    it('should show verification badge for verified users', async () => {
      matchingApi.getCards.mockResolvedValue({
        cards: [mockUserCard],
        nextCursor: null,
      });

      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('已認證')).toBeInTheDocument();
      });
    });

    it('should not show verification badge for unverified users', async () => {
      const unverifiedCard = { ...mockUserCard, verificationStatus: 'pending' };
      matchingApi.getCards.mockResolvedValue({
        cards: [unverifiedCard],
        nextCursor: null,
      });

      render(<DiscoverPage />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.queryByText('已認證')).not.toBeInTheDocument();
      });
    });
  });
});
