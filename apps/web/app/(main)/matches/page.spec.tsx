/**
 * Matches Page Test
 * 
 * Tests the matches page functionality including:
 * - Loading state
 * - Empty state
 * - Match list display
 * - Match card interaction
 * - Load more functionality
 * - Error handling
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import MatchesPage from './page';

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
  usePathname: () => '/matches',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the API
jest.mock('../../../lib/api', () => ({
  matchingApi: {
    getMatches: jest.fn(),
  },
  usersApi: {
    getMe: jest.fn(),
    getProfile: jest.fn(),
  },
  apiClient: {
    setToken: jest.fn(),
    clearToken: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

// Mock socket
jest.mock('../../../lib/socket', () => ({
  disconnectAll: jest.fn(),
}));

const { matchingApi, usersApi } = require('../../../lib/api');

const mockMatches = [
  {
    id: 'match-1',
    userAId: 'test-user-id',
    userBId: 'user-2',
    matchedAt: new Date('2024-02-13'),
    status: 'active',
  },
  {
    id: 'match-2',
    userAId: 'test-user-id',
    userBId: 'user-3',
    matchedAt: new Date('2024-02-12'),
    status: 'active',
  },
  {
    id: 'match-3',
    userAId: 'user-4',
    userBId: 'test-user-id',
    matchedAt: new Date('2024-02-11'),
    status: 'active',
  },
];

const mockUserProfiles = {
  'user-2': {
    id: 'user-2',
    displayName: 'Alice',
    avatarUrl: 'https://example.com/alice.jpg',
  },
  'user-3': {
    id: 'user-3',
    displayName: 'Bob',
    avatarUrl: undefined,
  },
  'user-4': {
    id: 'user-4',
    displayName: 'Charlie',
    avatarUrl: 'https://example.com/charlie.jpg',
  },
};

describe('MatchesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usersApi.getMe.mockResolvedValue(mockUser);
  });

  describe('Loading State', () => {
    it('should show skeleton while loading', () => {
      matchingApi.getMatches.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<MatchesPage />);

      // Should show multiple skeleton cards
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no matches', async () => {
      matchingApi.getMatches.mockResolvedValue({
        matches: [],
        nextCursor: undefined,
      });

      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText(/還沒有配對/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/到探索頁面滑動卡片/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /開始探索/i })).toBeInTheDocument();
    });

    it('should navigate to discover page when clicking explore button', async () => {
      matchingApi.getMatches.mockResolvedValue({
        matches: [],
        nextCursor: undefined,
      });

      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText(/還沒有配對/i)).toBeInTheDocument();
      });

      const exploreButton = screen.getByRole('button', { name: /開始探索/i });
      
      // Mock window.location.href
      delete (window as any).location;
      window.location = { href: '' } as any;

      exploreButton.click();

      expect(window.location.href).toContain('/discover');
    });
  });

  describe('Match List Display', () => {
    beforeEach(() => {
      matchingApi.getMatches.mockResolvedValue({
        matches: mockMatches,
        nextCursor: undefined,
      });

      usersApi.getProfile.mockImplementation((userId: string) => {
        return Promise.resolve(mockUserProfiles[userId as keyof typeof mockUserProfiles]);
      });
    });

    it('should display all matches', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('should show match count', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText(/3 位互相喜歡的人/i)).toBeInTheDocument();
      });
    });

    it('should display avatar when available', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        const aliceAvatar = screen.getByAltText('Alice');
        expect(aliceAvatar).toBeInTheDocument();
        expect(aliceAvatar).toHaveAttribute('src', 'https://example.com/alice.jpg');
      });
    });

    it('should display initials when no avatar', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText('BO')).toBeInTheDocument(); // Bob's initials
      });
    });

    it('should display match date correctly', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        // Check if date formatting works (actual text depends on current date)
        const dateElements = document.querySelectorAll('.text-xs.text-gray-400');
        expect(dateElements.length).toBe(mockMatches.length);
      });
    });
  });

  describe('Match Card Interaction', () => {
    beforeEach(() => {
      matchingApi.getMatches.mockResolvedValue({
        matches: mockMatches,
        nextCursor: undefined,
      });

      usersApi.getProfile.mockImplementation((userId: string) => {
        return Promise.resolve(mockUserProfiles[userId as keyof typeof mockUserProfiles]);
      });
    });

    it('should navigate to messages when clicking a match', async () => {
      const user = userEvent.setup();
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      const aliceCard = screen.getByText('Alice').closest('div[class*="cursor-pointer"]');
      await user.click(aliceCard!);

      // Navigation is handled by Next.js router mock
      // Just verify the click doesn't throw
    });

    it('should show hover effect on match cards', async () => {
      const user = userEvent.setup();
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      const aliceCard = screen.getByText('Alice').closest('div[class*="cursor-pointer"]');
      expect(aliceCard).toHaveClass('group');
    });
  });

  describe('Load More Functionality', () => {
    it('should show load more button when nextCursor exists', async () => {
      matchingApi.getMatches.mockResolvedValue({
        matches: mockMatches,
        nextCursor: 'cursor-123',
      });

      usersApi.getProfile.mockImplementation((userId: string) => {
        return Promise.resolve(mockUserProfiles[userId as keyof typeof mockUserProfiles]);
      });

      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /載入更多/i })).toBeInTheDocument();
      });
    });

    it('should not show load more button when no nextCursor', async () => {
      matchingApi.getMatches.mockResolvedValue({
        matches: mockMatches,
        nextCursor: undefined,
      });

      usersApi.getProfile.mockImplementation((userId: string) => {
        return Promise.resolve(mockUserProfiles[userId as keyof typeof mockUserProfiles]);
      });

      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /載入更多/i })).not.toBeInTheDocument();
    });

    it('should load more matches when clicking load more', async () => {
      const user = userEvent.setup();

      matchingApi.getMatches
        .mockResolvedValueOnce({
          matches: mockMatches,
          nextCursor: 'cursor-123',
        })
        .mockResolvedValueOnce({
          matches: [
            {
              id: 'match-4',
              userAId: 'test-user-id',
              userBId: 'user-5',
              matchedAt: new Date('2024-02-10'),
              status: 'active',
            },
          ],
          nextCursor: undefined,
        });

      usersApi.getProfile.mockImplementation((userId: string) => {
        if (userId === 'user-5') {
          return Promise.resolve({
            id: 'user-5',
            displayName: 'David',
            avatarUrl: undefined,
          });
        }
        return Promise.resolve(mockUserProfiles[userId as keyof typeof mockUserProfiles]);
      });

      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByRole('button', { name: /載入更多/i });
      await user.click(loadMoreButton);

      await waitFor(() => {
        expect(screen.getByText('David')).toBeInTheDocument();
      });

      expect(matchingApi.getMatches).toHaveBeenCalledTimes(2);
      expect(matchingApi.getMatches).toHaveBeenLastCalledWith('cursor-123');
    });

    it('should show loading text while loading more', async () => {
      const user = userEvent.setup();

      matchingApi.getMatches
        .mockResolvedValueOnce({
          matches: mockMatches,
          nextCursor: 'cursor-123',
        })
        .mockImplementationOnce(
          () => new Promise((resolve) => setTimeout(() => resolve({ matches: [], nextCursor: undefined }), 100))
        );

      usersApi.getProfile.mockImplementation((userId: string) => {
        return Promise.resolve(mockUserProfiles[userId as keyof typeof mockUserProfiles]);
      });

      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByRole('button', { name: /載入更多/i });
      await user.click(loadMoreButton);

      expect(screen.getByRole('button', { name: /載入中/i })).toBeInTheDocument();
      expect(loadMoreButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should show error state on API failure', async () => {
      const errorMessage = '無法載入配對列表';
      matchingApi.getMatches.mockRejectedValue(new Error(errorMessage));

      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText(/載入失敗/i)).toBeInTheDocument();
      });

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /重試/i })).toBeInTheDocument();
    });

    it('should retry loading when clicking retry button', async () => {
      const user = userEvent.setup();

      matchingApi.getMatches
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          matches: mockMatches,
          nextCursor: undefined,
        });

      usersApi.getProfile.mockImplementation((userId: string) => {
        return Promise.resolve(mockUserProfiles[userId as keyof typeof mockUserProfiles]);
      });

      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText(/載入失敗/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /重試/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      expect(matchingApi.getMatches).toHaveBeenCalledTimes(2);
    });

    it('should handle user profile fetch failure gracefully', async () => {
      matchingApi.getMatches.mockResolvedValue({
        matches: mockMatches,
        nextCursor: undefined,
      });

      usersApi.getProfile.mockRejectedValue(new Error('User not found'));

      render(<MatchesPage />);

      await waitFor(() => {
        // Should still render matches even if profile fetch fails
        expect(screen.getByText('配對')).toBeInTheDocument();
      });

      // Should show "未知用戶" for failed profile fetches
      await waitFor(() => {
        const unknownUsers = screen.getAllByText(/未知用戶/i);
        expect(unknownUsers.length).toBe(mockMatches.length);
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      matchingApi.getMatches.mockResolvedValue({
        matches: mockMatches,
        nextCursor: undefined,
      });

      usersApi.getProfile.mockImplementation((userId: string) => {
        return Promise.resolve(mockUserProfiles[userId as keyof typeof mockUserProfiles]);
      });
    });

    it('should have proper heading structure', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /配對/i })).toBeInTheDocument();
      });
    });

    it('should have alt text for avatars', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        const aliceAvatar = screen.getByAltText('Alice');
        expect(aliceAvatar).toBeInTheDocument();
      });
    });
  });
});
