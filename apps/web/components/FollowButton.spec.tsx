/**
 * FollowButton Component Test
 * 
 * Tests for the FollowButton component:
 * - Rendering (follow/unfollow states)
 * - Click handling
 * - Optimistic updates
 * - Error handling with rollback
 * - Loading states
 * - Callback invocation
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FollowButton } from './FollowButton';

// Mock API
const mockUsersApi = {
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
};

jest.mock('../lib/api', () => ({
  usersApi: mockUsersApi,
  ApiError: {
    getMessage: jest.fn((err: unknown, defaultMsg: string) => defaultMsg),
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  UserPlus: ({ className }: { className?: string }) => (
    <span data-testid="user-plus-icon" className={className} />
  ),
  UserCheck: ({ className }: { className?: string }) => (
    <span data-testid="user-check-icon" className={className} />
  ),
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="loader-icon" className={className} />
  ),
}));

describe('FollowButton', () => {
  const targetUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsersApi.followUser.mockResolvedValue(undefined);
    mockUsersApi.unfollowUser.mockResolvedValue(undefined);
    
    // Mock console.error to suppress error logs in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  describe('Rendering - Not Following State', () => {
    it('should render "追蹤" button when not following', () => {
      render(
        <FollowButton targetUserId={targetUserId} initialIsFollowing={false} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('追蹤');
      expect(screen.getByTestId('user-plus-icon')).toBeInTheDocument();
    });

    it('should apply correct styles when not following', () => {
      render(
        <FollowButton targetUserId={targetUserId} initialIsFollowing={false} />
      );

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-brand-500');
      expect(button.className).toContain('text-white');
    });
  });

  describe('Rendering - Following State', () => {
    it('should render "追蹤中" button when following', () => {
      render(
        <FollowButton targetUserId={targetUserId} initialIsFollowing={true} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('追蹤中');
      expect(screen.getByTestId('user-check-icon')).toBeInTheDocument();
    });

    it('should apply correct styles when following', () => {
      render(
        <FollowButton targetUserId={targetUserId} initialIsFollowing={true} />
      );

      const button = screen.getByRole('button');
      expect(button.className).toContain('variant="outline"');
      expect(button.className).toContain('border-brand-200');
    });
  });

  describe('Follow Action', () => {
    it('should call followUser API when clicking follow button', async () => {
      const user = userEvent.setup();

      render(
        <FollowButton targetUserId={targetUserId} initialIsFollowing={false} />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(mockUsersApi.followUser).toHaveBeenCalledWith(targetUserId);
      });
    });

    it('should update UI optimistically when following', async () => {
      const user = userEvent.setup();

      mockUsersApi.followUser.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(
        <FollowButton targetUserId={targetUserId} initialIsFollowing={false} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('追蹤');

      await user.click(button);

      // Should immediately show loading state
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();

      // After API call, should show "追蹤中"
      await waitFor(() => {
        expect(button).toHaveTextContent('追蹤中');
      });
    });

    it('should disable button during follow request', async () => {
      const user = userEvent.setup();

      mockUsersApi.followUser.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(
        <FollowButton targetUserId={targetUserId} initialIsFollowing={false} />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(button).toBeDisabled();

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('Unfollow Action', () => {
    it('should call unfollowUser API when clicking unfollow button', async () => {
      const user = userEvent.setup();

      render(
        <FollowButton targetUserId={targetUserId} initialIsFollowing={true} />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(mockUsersApi.unfollowUser).toHaveBeenCalledWith(targetUserId);
      });
    });

    it('should update UI optimistically when unfollowing', async () => {
      const user = userEvent.setup();

      mockUsersApi.unfollowUser.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(
        <FollowButton targetUserId={targetUserId} initialIsFollowing={true} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('追蹤中');

      await user.click(button);

      // Should immediately show loading state
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();

      // After API call, should show "追蹤"
      await waitFor(() => {
        expect(button).toHaveTextContent('追蹤');
      });
    });
  });

  describe('Error Handling', () => {
    it('should rollback state when follow fails', async () => {
      const user = userEvent.setup();

      mockUsersApi.followUser.mockRejectedValue(new Error('Network error'));

      render(
        <FollowButton targetUserId={targetUserId} initialIsFollowing={false} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('追蹤');

      await user.click(button);

      // Should revert back to "追蹤" after error
      await waitFor(() => {
        expect(button).toHaveTextContent('追蹤');
        expect(mockUsersApi.followUser).toHaveBeenCalled();
      });
    });

    it('should rollback state when unfollow fails', async () => {
      const user = userEvent.setup();

      mockUsersApi.unfollowUser.mockRejectedValue(new Error('Network error'));

      render(
        <FollowButton targetUserId={targetUserId} initialIsFollowing={true} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('追蹤中');

      await user.click(button);

      // Should revert back to "追蹤中" after error
      await waitFor(() => {
        expect(button).toHaveTextContent('追蹤中');
        expect(mockUsersApi.unfollowUser).toHaveBeenCalled();
      });
    });

    it('should log error to console', async () => {
      const user = userEvent.setup();

      mockUsersApi.followUser.mockRejectedValue(new Error('Network error'));

      render(
        <FollowButton targetUserId={targetUserId} initialIsFollowing={false} />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalled();
      });
    });
  });

  describe('Callback Invocation', () => {
    it('should call onFollowChange with true when following', async () => {
      const user = userEvent.setup();
      const onFollowChange = jest.fn();

      render(
        <FollowButton
          targetUserId={targetUserId}
          initialIsFollowing={false}
          onFollowChange={onFollowChange}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(onFollowChange).toHaveBeenCalledWith(true);
      });
    });

    it('should call onFollowChange with false when unfollowing', async () => {
      const user = userEvent.setup();
      const onFollowChange = jest.fn();

      render(
        <FollowButton
          targetUserId={targetUserId}
          initialIsFollowing={true}
          onFollowChange={onFollowChange}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(onFollowChange).toHaveBeenCalledWith(false);
      });
    });

    it('should call onFollowChange on rollback', async () => {
      const user = userEvent.setup();
      const onFollowChange = jest.fn();

      mockUsersApi.followUser.mockRejectedValue(new Error('Error'));

      render(
        <FollowButton
          targetUserId={targetUserId}
          initialIsFollowing={false}
          onFollowChange={onFollowChange}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        // Called twice: once on optimistic update, once on rollback
        expect(onFollowChange).toHaveBeenCalledTimes(2);
        expect(onFollowChange).toHaveBeenNthCalledWith(1, true);
        expect(onFollowChange).toHaveBeenNthCalledWith(2, false);
      });
    });
  });

  describe('Size Prop', () => {
    it('should apply small size', () => {
      render(
        <FollowButton
          targetUserId={targetUserId}
          initialIsFollowing={false}
          size="sm"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('size', 'sm');
    });

    it('should apply default size', () => {
      render(
        <FollowButton
          targetUserId={targetUserId}
          initialIsFollowing={false}
          size="default"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('size', 'default');
    });
  });

  describe('Loading State', () => {
    it('should show loading icon during API call', async () => {
      const user = userEvent.setup();

      mockUsersApi.followUser.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(
        <FollowButton targetUserId={targetUserId} initialIsFollowing={false} />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      // Should show loader during API call
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('user-plus-icon')).not.toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      });
    });

    it('should prevent multiple clicks during loading', async () => {
      const user = userEvent.setup();

      mockUsersApi.followUser.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(
        <FollowButton targetUserId={targetUserId} initialIsFollowing={false} />
      );

      const button = screen.getByRole('button');
      
      // Click multiple times quickly
      await user.click(button);
      await user.click(button);
      await user.click(button);

      // Should only call API once
      await waitFor(() => {
        expect(mockUsersApi.followUser).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();

      render(
        <FollowButton targetUserId={targetUserId} initialIsFollowing={false} />
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockUsersApi.followUser).toHaveBeenCalled();
      });
    });

    it('should have button role', () => {
      render(
        <FollowButton targetUserId={targetUserId} initialIsFollowing={false} />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
