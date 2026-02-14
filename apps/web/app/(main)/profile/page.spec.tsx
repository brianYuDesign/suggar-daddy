/**
 * Profile Page Test
 * 
 * Tests the profile page functionality including:
 * - Profile information display
 * - Avatar rendering
 * - Role badge display
 * - Verification status
 * - Navigation to edit profile
 * - Navigation to settings
 * - Logout functionality
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockUser } from '../../../../src/test-utils';
import ProfilePage from './page';

// Mock the auth provider
const mockLogout = jest.fn();
const mockPush = jest.fn();

jest.mock('../../../../providers/auth-provider', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render profile page with user information', () => {
      render(<ProfilePage />);

      expect(screen.getByRole('heading', { name: /我的檔案/i })).toBeInTheDocument();
      expect(screen.getByText(mockUser.displayName)).toBeInTheDocument();
      expect(screen.getByText(/Sugar Daddy/i)).toBeInTheDocument(); // Role badge
    });

    it('should display avatar when available', () => {
      render(<ProfilePage />);

      const avatar = screen.getByRole('img');
      expect(avatar).toBeInTheDocument();
    });

    it('should display initials when avatar is not available', () => {
      const userWithoutAvatar = {
        ...mockUser,
        avatarUrl: undefined,
        displayName: 'John Doe',
      };

      jest.spyOn(require('../../../../providers/auth-provider'), 'useAuth').mockReturnValue({
        user: userWithoutAvatar,
        logout: mockLogout,
      });

      render(<ProfilePage />);

      expect(screen.getByText('Jo')).toBeInTheDocument();
    });

    it('should display verification status for verified users', () => {
      render(<ProfilePage />);

      expect(screen.getByText(/已驗證/i)).toBeInTheDocument();
    });

    it('should not display verification status for unverified users', () => {
      const unverifiedUser = {
        ...mockUser,
        verificationStatus: 'pending',
      };

      jest.spyOn(require('../../../../providers/auth-provider'), 'useAuth').mockReturnValue({
        user: unverifiedUser,
        logout: mockLogout,
      });

      render(<ProfilePage />);

      expect(screen.queryByText(/已驗證/i)).not.toBeInTheDocument();
    });

    it('should display bio when available', () => {
      render(<ProfilePage />);

      expect(screen.getByText(mockUser.bio)).toBeInTheDocument();
    });

    it('should display placeholder when bio is not available', () => {
      const userWithoutBio = {
        ...mockUser,
        bio: undefined,
      };

      jest.spyOn(require('../../../../providers/auth-provider'), 'useAuth').mockReturnValue({
        user: userWithoutBio,
        logout: mockLogout,
      });

      render(<ProfilePage />);

      expect(screen.getByText(/尚未填寫自我介紹/i)).toBeInTheDocument();
    });

    it('should display join date', () => {
      render(<ProfilePage />);

      expect(screen.getByText(/加入於/i)).toBeInTheDocument();
    });
  });

  describe('Role Badge', () => {
    it('should display "創作者" for sugar_baby role', () => {
      const sugarBabyUser = {
        ...mockUser,
        role: 'sugar_baby',
      };

      jest.spyOn(require('../../../../providers/auth-provider'), 'useAuth').mockReturnValue({
        user: sugarBabyUser,
        logout: mockLogout,
      });

      render(<ProfilePage />);

      expect(screen.getByText(/創作者/i)).toBeInTheDocument();
    });

    it('should display "探索者" for sugar_daddy role', () => {
      const sugarDaddyUser = {
        ...mockUser,
        role: 'sugar_daddy',
      };

      jest.spyOn(require('../../../../providers/auth-provider'), 'useAuth').mockReturnValue({
        user: sugarDaddyUser,
        logout: mockLogout,
      });

      render(<ProfilePage />);

      expect(screen.getByText(/探索者/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to edit profile page when clicking edit button', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const editButton = screen.getByRole('button', { name: /編輯個人檔案/i });
      await user.click(editButton);

      expect(mockPush).toHaveBeenCalledWith('/profile/edit');
    });

    it('should navigate to settings page when clicking settings button', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const settingsButton = screen.getByRole('button', { name: /設定/i });
      await user.click(settingsButton);

      expect(mockPush).toHaveBeenCalledWith('/profile/settings');
    });
  });

  describe('Logout', () => {
    it('should call logout when clicking logout button', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const logoutButton = screen.getByRole('button', { name: /登出/i });
      await user.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('should display logout button with correct styling', () => {
      render(<ProfilePage />);

      const logoutButton = screen.getByRole('button', { name: /登出/i });
      expect(logoutButton).toHaveClass('text-red-500');
    });
  });

  describe('Action Buttons', () => {
    it('should display all action buttons', () => {
      render(<ProfilePage />);

      expect(screen.getByRole('button', { name: /編輯個人檔案/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /設定/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /登出/i })).toBeInTheDocument();
    });

    it('should display icons in action buttons', () => {
      render(<ProfilePage />);

      const editButton = screen.getByRole('button', { name: /編輯個人檔案/i });
      const settingsButton = screen.getByRole('button', { name: /設定/i });
      const logoutButton = screen.getByRole('button', { name: /登出/i });

      // Check that buttons contain SVG elements (icons)
      expect(editButton.querySelector('svg')).toBeInTheDocument();
      expect(settingsButton.querySelector('svg')).toBeInTheDocument();
      expect(logoutButton.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('No User State', () => {
    it('should render nothing when user is not available', () => {
      jest.spyOn(require('../../../../providers/auth-provider'), 'useAuth').mockReturnValue({
        user: null,
        logout: mockLogout,
      });

      const { container } = render(<ProfilePage />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<ProfilePage />);

      const mainHeading = screen.getByRole('heading', { name: /我的檔案/i });
      expect(mainHeading).toBeInTheDocument();

      const nameHeading = screen.getByRole('heading', { name: mockUser.displayName });
      expect(nameHeading).toBeInTheDocument();
    });

    it('should have accessible buttons with descriptive labels', () => {
      render(<ProfilePage />);

      const editButton = screen.getByRole('button', { name: /編輯個人檔案/i });
      const settingsButton = screen.getByRole('button', { name: /設定/i });
      const logoutButton = screen.getByRole('button', { name: /登出/i });

      expect(editButton).toBeInTheDocument();
      expect(settingsButton).toBeInTheDocument();
      expect(logoutButton).toBeInTheDocument();
    });

    it('should have alt text for avatar', () => {
      render(<ProfilePage />);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('alt');
    });
  });

  describe('Date Formatting', () => {
    it('should format join date correctly', () => {
      const testUser = {
        ...mockUser,
        createdAt: new Date('2024-01-15'),
      };

      jest.spyOn(require('../../../../providers/auth-provider'), 'useAuth').mockReturnValue({
        user: testUser,
        logout: mockLogout,
      });

      render(<ProfilePage />);

      // Check that a formatted date is displayed
      expect(screen.getByText(/加入於.*2024/i)).toBeInTheDocument();
    });
  });

  describe('UI Components', () => {
    it('should display profile card', () => {
      render(<ProfilePage />);

      const card = screen.getByText(mockUser.displayName).closest('div[class*="rounded"]');
      expect(card).toBeInTheDocument();
    });

    it('should display separators', () => {
      render(<ProfilePage />);

      const separators = document.querySelectorAll('[class*="Separator"]');
      expect(separators.length).toBeGreaterThan(0);
    });

    it('should display calendar icon for join date', () => {
      render(<ProfilePage />);

      const calendarIcon = screen.getByText(/加入於/i).parentElement?.querySelector('svg');
      expect(calendarIcon).toBeInTheDocument();
    });
  });
});
