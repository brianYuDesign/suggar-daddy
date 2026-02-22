/**
 * Feed Page Test
 *
 * Tests the feed page functionality including:
 * - Post list rendering
 * - Like/unlike toggle
 * - Premium content overlay for non-subscribers
 * - Pagination (load more)
 * - Empty state
 * - Loading skeleton
 * - Error handling
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import FeedPage from './page';

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

// Mock useAuth
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
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the API
jest.mock('../../../lib/api', () => ({
  contentApi: {
    getPosts: jest.fn(),
    likePost: jest.fn(),
    unlikePost: jest.fn(),
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
    constructor(message: string, public status?: number) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

// Mock socket
jest.mock('../../../lib/socket', () => ({
  disconnectAll: jest.fn(),
}));

const { contentApi, usersApi } = require('../../../lib/api');

// Test fixtures
const mockPosts = [
  {
    id: 'post-1',
    authorId: 'author-1',
    content: 'This is the first post content',
    mediaUrls: ['https://example.com/img1.jpg'],
    isPremium: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'post-2',
    authorId: 'author-2',
    content: 'This is a premium post',
    mediaUrls: [],
    isPremium: true,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'post-3',
    authorId: 'author-1',
    content: 'Third post by same author',
    mediaUrls: [],
    isPremium: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const mockAuthorProfiles: Record<string, { id: string; displayName: string }> = {
  'author-1': { id: 'author-1', displayName: 'Alice Creator' },
  'author-2': { id: 'author-2', displayName: 'Bob Creator' },
};

describe('FeedPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usersApi.getMe.mockResolvedValue(mockUser);
    usersApi.getProfile.mockImplementation((userId: string) => {
      const profile = mockAuthorProfiles[userId];
      if (profile) return Promise.resolve(profile);
      return Promise.reject(new Error('Not found'));
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton initially', () => {
      contentApi.getPosts.mockImplementation(() => new Promise(() => {}));

      render(<FeedPage />);

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Post List Rendering', () => {
    beforeEach(() => {
      contentApi.getPosts.mockResolvedValue({
        posts: mockPosts,
        nextCursor: undefined,
      });
    });

    it('should render post list after loading', async () => {
      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByText('This is the first post content')).toBeInTheDocument();
      });

      expect(screen.getByText('This is a premium post')).toBeInTheDocument();
      expect(screen.getByText('Third post by same author')).toBeInTheDocument();
    });

    it('should display author names after fetching profiles', async () => {
      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Alice Creator').length).toBeGreaterThan(0);
      });

      expect(screen.getByText('Bob Creator')).toBeInTheDocument();
    });

    it('should display welcome card with user name', async () => {
      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByText(/嗨，Test User/)).toBeInTheDocument();
      });
    });

    it('should display welcome card with role-specific message for sugar_daddy', async () => {
      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByText(/探索你感興趣的創作者/)).toBeInTheDocument();
      });
    });
  });

  describe('Like/Unlike Toggle', () => {
    beforeEach(() => {
      contentApi.getPosts.mockResolvedValue({
        posts: mockPosts,
        nextCursor: undefined,
      });
      contentApi.likePost.mockResolvedValue({});
      contentApi.unlikePost.mockResolvedValue({});
    });

    it('should call likePost API when clicking like button', async () => {
      const user = userEvent.setup();
      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByText('This is the first post content')).toBeInTheDocument();
      });

      const likeButtons = screen.getAllByRole('button', { name: /喜歡/ });
      await user.click(likeButtons[0]);

      await waitFor(() => {
        expect(contentApi.likePost).toHaveBeenCalledWith('post-1');
      });
    });

    it('should toggle like state optimistically', async () => {
      const user = userEvent.setup();
      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByText('This is the first post content')).toBeInTheDocument();
      });

      const likeButtons = screen.getAllByRole('button', { name: /喜歡/ });
      await user.click(likeButtons[0]);

      // Should show "已喜歡" after clicking
      await waitFor(() => {
        expect(screen.getByText('已喜歡')).toBeInTheDocument();
      });
    });

    it('should call unlikePost API when clicking unlike', async () => {
      const user = userEvent.setup();
      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByText('This is the first post content')).toBeInTheDocument();
      });

      // Click like first
      const likeButtons = screen.getAllByRole('button', { name: /喜歡/ });
      await user.click(likeButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('已喜歡')).toBeInTheDocument();
      });

      // Click again to unlike
      const unlikeButton = screen.getByText('已喜歡').closest('button')!;
      await user.click(unlikeButton);

      await waitFor(() => {
        expect(contentApi.unlikePost).toHaveBeenCalledWith('post-1');
      });
    });

    it('should revert like state on API failure', async () => {
      contentApi.likePost.mockRejectedValue(new Error('Failed'));

      const user = userEvent.setup();
      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByText('This is the first post content')).toBeInTheDocument();
      });

      const likeButtons = screen.getAllByRole('button', { name: /喜歡/ });
      await user.click(likeButtons[0]);

      // Should revert to "喜歡" after failure
      await waitFor(() => {
        const allLikeButtons = screen.getAllByText('喜歡');
        expect(allLikeButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Premium Content Overlay', () => {
    it('should show premium overlay for non-owner premium posts', async () => {
      contentApi.getPosts.mockResolvedValue({
        posts: [mockPosts[1]], // premium post by author-2
        nextCursor: undefined,
      });

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByText('此為付費內容')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /解鎖此內容/ })).toBeInTheDocument();
    });

    it('should show premium badge on premium posts', async () => {
      contentApi.getPosts.mockResolvedValue({
        posts: [mockPosts[1]],
        nextCursor: undefined,
      });

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByText('付費')).toBeInTheDocument();
      });
    });

    it('should not show premium overlay for own premium posts', async () => {
      const ownPremiumPost = {
        ...mockPosts[1],
        authorId: 'test-user-id', // same as mockUser.id
      };

      contentApi.getPosts.mockResolvedValue({
        posts: [ownPremiumPost],
        nextCursor: undefined,
      });

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByText('This is a premium post')).toBeInTheDocument();
      });

      expect(screen.queryByText('此為付費內容')).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should show load more button when nextCursor exists', async () => {
      contentApi.getPosts.mockResolvedValue({
        posts: mockPosts,
        nextCursor: 'cursor-123',
      });

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /載入更多/ })).toBeInTheDocument();
      });
    });

    it('should not show load more button when no nextCursor', async () => {
      contentApi.getPosts.mockResolvedValue({
        posts: mockPosts,
        nextCursor: undefined,
      });

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByText('This is the first post content')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /載入更多/ })).not.toBeInTheDocument();
    });

    it('should load more posts when clicking load more', async () => {
      const user = userEvent.setup();

      contentApi.getPosts
        .mockResolvedValueOnce({
          posts: mockPosts.slice(0, 2),
          nextCursor: 'cursor-123',
        })
        .mockResolvedValueOnce({
          posts: [mockPosts[2]],
          nextCursor: undefined,
        });

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /載入更多/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /載入更多/ }));

      await waitFor(() => {
        expect(contentApi.getPosts).toHaveBeenCalledTimes(2);
        expect(contentApi.getPosts).toHaveBeenLastCalledWith('cursor-123');
      });
    });

    it('should show loading state while loading more', async () => {
      const user = userEvent.setup();

      contentApi.getPosts
        .mockResolvedValueOnce({
          posts: mockPosts.slice(0, 2),
          nextCursor: 'cursor-123',
        })
        .mockImplementationOnce(
          () => new Promise(resolve => setTimeout(() => resolve({ posts: [], nextCursor: undefined }), 100))
        );

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /載入更多/ })).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByRole('button', { name: /載入更多/ });
      await user.click(loadMoreButton);

      expect(screen.getByText(/載入中/)).toBeInTheDocument();
      expect(loadMoreButton).toBeDisabled();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no posts', async () => {
      contentApi.getPosts.mockResolvedValue({
        posts: [],
        nextCursor: undefined,
      });

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByText('還沒有任何動態')).toBeInTheDocument();
      });

      expect(screen.getByText(/目前還沒有人發布內容/)).toBeInTheDocument();
    });

    it('should show create post button in empty state', async () => {
      contentApi.getPosts.mockResolvedValue({
        posts: [],
        nextCursor: undefined,
      });

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /發布動態/ })).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message when loading fails', async () => {
      contentApi.getPosts.mockRejectedValue(new Error('Network error'));

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByText(/無法載入動態/)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      contentApi.getPosts.mockRejectedValue(new Error('Network error'));

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /重試/ })).toBeInTheDocument();
      });
    });

    it('should retry loading when clicking retry', async () => {
      const user = userEvent.setup();

      contentApi.getPosts
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          posts: mockPosts,
          nextCursor: undefined,
        });

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /重試/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /重試/ }));

      await waitFor(() => {
        expect(screen.getByText('This is the first post content')).toBeInTheDocument();
      });

      expect(contentApi.getPosts).toHaveBeenCalledTimes(2);
    });

    it('should show ApiError message when available', async () => {
      const ApiError = require('../../../lib/api').ApiError;
      contentApi.getPosts.mockRejectedValue(new ApiError('伺服器忙碌中', 503));

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByText('伺服器忙碌中')).toBeInTheDocument();
      });
    });
  });

  describe('FAB Button', () => {
    it('should render floating create post button', async () => {
      contentApi.getPosts.mockResolvedValue({
        posts: mockPosts,
        nextCursor: undefined,
      });

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('發布新動態')).toBeInTheDocument();
      });
    });

    it('should link to post creation page', async () => {
      contentApi.getPosts.mockResolvedValue({
        posts: mockPosts,
        nextCursor: undefined,
      });

      render(<FeedPage />);

      await waitFor(() => {
        const fab = screen.getByLabelText('發布新動態');
        expect(fab.closest('a')).toHaveAttribute('href', '/post/create');
      });
    });
  });

  describe('Post Card Details', () => {
    beforeEach(() => {
      contentApi.getPosts.mockResolvedValue({
        posts: mockPosts,
        nextCursor: undefined,
      });
    });

    it('should link author name to user profile', async () => {
      render(<FeedPage />);

      await waitFor(() => {
        const authorLinks = screen.getAllByText('Alice Creator');
        const link = authorLinks[0].closest('a');
        expect(link).toHaveAttribute('href', '/user/author-1');
      });
    });

    it('should display media thumbnails when available', async () => {
      render(<FeedPage />);

      await waitFor(() => {
        const img = screen.getByAltText('Media 1');
        expect(img).toHaveAttribute('src', 'https://example.com/img1.jpg');
      });
    });

    it('should display tip button for each post', async () => {
      render(<FeedPage />);

      await waitFor(() => {
        const tipButtons = screen.getAllByText('打賞');
        expect(tipButtons.length).toBe(mockPosts.length);
      });
    });
  });
});
