/**
 * Login Page Test
 * 
 * Tests the login page functionality including:
 * - Form rendering
 * - Form validation
 * - Successful login
 * - Failed login
 * - Password visibility toggle
 * - Navigation to register page
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import LoginPage from './page';

// Test fixtures
const mockAuthResponse = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3600,
};

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

function mockApiSuccess<T>(data: T) {
  return Promise.resolve(data);
}

function mockApiError(message: string, status = 400) {
  const error = new Error(message) as any;
  error.response = { status };
  return Promise.reject(error);
}

// Create mock login function
const mockLogin = jest.fn();
const mockPush = jest.fn();

// Mock useAuth
jest.mock('../../../providers/auth-provider', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: mockLogin,
  }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the API
jest.mock('../../../lib/api', () => ({
  authApi: {
    login: jest.fn(),
    logout: jest.fn(),
    refresh: jest.fn(),
  },
  usersApi: {
    getMe: jest.fn(),
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
    static getMessage(error: unknown, defaultMessage: string): string {
      if (error instanceof ApiError) return error.message;
      if (error instanceof Error) return error.message;
      return defaultMessage;
    }
  },
}));

// Mock socket
jest.mock('../../../lib/socket', () => ({
  disconnectAll: jest.fn(),
}));

const { authApi, usersApi } = require('../../../lib/api');

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should render login form with all elements', () => {
      render(<LoginPage />);

      expect(screen.getByRole('heading', { name: /歡迎回來/i })).toBeInTheDocument();
      expect(screen.getByText(/登入你的帳號繼續使用/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/密碼/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /登入/i })).toBeInTheDocument();
      expect(screen.getByText(/還沒有帳號/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /免費註冊/i })).toBeInTheDocument();
    });

    it('should have correct link to register page', () => {
      render(<LoginPage />);

      const registerLink = screen.getByRole('link', { name: /免費註冊/i });
      expect(registerLink).toHaveAttribute('href', '/register');
    });
  });

  describe('Form Validation', () => {
    it('should show error for invalid email', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /登入/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/請輸入有效的 Email/i)).toBeInTheDocument();
      });
    });

    it('should show error for empty password', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /登入/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/請輸入密碼/i)).toBeInTheDocument();
      });
    });

    it('should not submit form with validation errors', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const submitButton = screen.getByRole('button', { name: /登入/i });
      await user.click(submitButton);

      expect(authApi.login).not.toHaveBeenCalled();
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText(/密碼/i) as HTMLInputElement;
      const toggleButton = screen.getByRole('button', { name: '' });

      // Initially password should be hidden
      expect(passwordInput.type).toBe('password');

      // Click to show password
      await user.click(toggleButton);
      expect(passwordInput.type).toBe('text');

      // Click to hide password again
      await user.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    });
  });

  describe('Successful Login', () => {
    it('should login successfully with valid credentials', async () => {
      mockLogin.mockResolvedValue(undefined);

      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/密碼/i);
      const submitButton = screen.getByRole('button', { name: /登入/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should show loading state during login', async () => {
      mockLogin.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );

      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/密碼/i);
      const submitButton = screen.getByRole('button', { name: /登入/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should show loading text
      expect(screen.getByRole('button', { name: /登入中/i })).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });
  });

  describe('Failed Login', () => {
    it('should show error message on login failure', async () => {
      const errorMessage = '帳號或密碼錯誤';
      mockLogin.mockRejectedValue(new Error(errorMessage));

      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/密碼/i);
      const submitButton = screen.getByRole('button', { name: /登入/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should show default error message on unknown error', async () => {
      mockLogin.mockRejectedValue(new Error());

      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/密碼/i);
      const submitButton = screen.getByRole('button', { name: /登入/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/登入失敗，請檢查帳號密碼/i)).toBeInTheDocument();
      });
    });

    it('should clear error message on new submission', async () => {
      mockLogin.mockRejectedValueOnce(new Error('First error'));
      
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/密碼/i);
      const submitButton = screen.getByRole('button', { name: /登入/i });

      // First failed attempt
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrong');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      // Second attempt - error should be cleared
      authApi.login.mockResolvedValue(mockAuthResponse);
      usersApi.getMe.mockResolvedValue(mockUser);

      await user.clear(passwordInput);
      await user.type(passwordInput, 'correct');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/密碼/i);

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('should have proper button roles', () => {
      render(<LoginPage />);

      const submitButton = screen.getByRole('button', { name: /登入/i });
      const registerLink = screen.getByRole('link', { name: /免費註冊/i });

      expect(submitButton).toBeInTheDocument();
      expect(registerLink).toBeInTheDocument();
    });
  });
});
