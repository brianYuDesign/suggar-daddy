/**
 * Register Page Test
 * 
 * Tests the registration page functionality including:
 * - Form rendering
 * - Role selection
 * - Form validation
 * - Successful registration
 * - Failed registration
 * - Password visibility toggle
 * - Navigation to login page
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockAuthResponse, mockUser } from '../../../src/test-utils';
import RegisterPage from './page';

// Mock the API
jest.mock('../../../lib/api', () => ({
  authApi: {
    register: jest.fn(),
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

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should render registration form with all elements', () => {
      render(<RegisterPage />);

      expect(screen.getByRole('heading', { name: /建立帳號/i })).toBeInTheDocument();
      expect(screen.getByText(/開始你的 Suggar Daddy 旅程/i)).toBeInTheDocument();
      expect(screen.getByText(/選擇你的身份/i)).toBeInTheDocument();
      expect(screen.getByText('Sugar Daddy')).toBeInTheDocument();
      expect(screen.getByText('Sugar Baby')).toBeInTheDocument();
      expect(screen.getByLabelText(/暱稱/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/密碼/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /建立帳號/i })).toBeInTheDocument();
      expect(screen.getByText(/已經有帳號/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /登入/i })).toBeInTheDocument();
    });

    it('should have correct link to login page', () => {
      render(<RegisterPage />);

      const loginLink = screen.getByRole('link', { name: /登入/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Role Selection', () => {
    it('should allow selecting Sugar Daddy role', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const sugarDaddyButton = screen.getByText('Sugar Daddy').closest('button');
      await user.click(sugarDaddyButton!);

      expect(sugarDaddyButton).toHaveClass('border-brand-500');
    });

    it('should allow selecting Sugar Baby role', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const sugarBabyButton = screen.getByText('Sugar Baby').closest('button');
      await user.click(sugarBabyButton!);

      expect(sugarBabyButton).toHaveClass('border-brand-500');
    });

    it('should allow switching between roles', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const sugarDaddyButton = screen.getByText('Sugar Daddy').closest('button');
      const sugarBabyButton = screen.getByText('Sugar Baby').closest('button');

      // Select Sugar Daddy first
      await user.click(sugarDaddyButton!);
      expect(sugarDaddyButton).toHaveClass('border-brand-500');

      // Switch to Sugar Baby
      await user.click(sugarBabyButton!);
      expect(sugarBabyButton).toHaveClass('border-brand-500');
      expect(sugarDaddyButton).not.toHaveClass('border-brand-500');
    });
  });

  describe('Form Validation', () => {
    it('should show error when role is not selected', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      // Fill other fields but not role
      await user.type(screen.getByLabelText(/暱稱/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/密碼/i), 'password123');
      
      const submitButton = screen.getByRole('button', { name: /建立帳號/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/請選擇你的身份/i)).toBeInTheDocument();
      });
    });

    it('should show error for empty display name', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const sugarDaddyButton = screen.getByText('Sugar Daddy').closest('button');
      await user.click(sugarDaddyButton!);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/密碼/i), 'password123');
      
      const submitButton = screen.getByRole('button', { name: /建立帳號/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/請輸入暱稱/i)).toBeInTheDocument();
      });
    });

    it('should show error for invalid email', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /建立帳號/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/請輸入有效的 Email/i)).toBeInTheDocument();
      });
    });

    it('should show error for short password', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/密碼/i);
      const submitButton = screen.getByRole('button', { name: /建立帳號/i });

      await user.type(passwordInput, 'short');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/密碼至少 8 個字元/i)).toBeInTheDocument();
      });
    });

    it('should show error for display name too long', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const displayNameInput = screen.getByLabelText(/暱稱/i);
      const submitButton = screen.getByRole('button', { name: /建立帳號/i });

      await user.type(displayNameInput, 'a'.repeat(51)); // 51 characters
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/暱稱不可超過 50 個字元/i)).toBeInTheDocument();
      });
    });

    it('should not submit form with validation errors', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const submitButton = screen.getByRole('button', { name: /建立帳號/i });
      await user.click(submitButton);

      expect(authApi.register).not.toHaveBeenCalled();
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

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

  describe('Successful Registration', () => {
    it('should register successfully with valid data', async () => {
      authApi.register.mockResolvedValue(mockAuthResponse);
      usersApi.getMe.mockResolvedValue(mockUser);

      const user = userEvent.setup();
      render(<RegisterPage />);

      // Select role
      const sugarDaddyButton = screen.getByText('Sugar Daddy').closest('button');
      await user.click(sugarDaddyButton!);

      // Fill form
      await user.type(screen.getByLabelText(/暱稱/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/密碼/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /建立帳號/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authApi.register).toHaveBeenCalledWith({
          role: 'sugar_daddy',
          displayName: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(usersApi.getMe).toHaveBeenCalled();
    });

    it('should show loading state during registration', async () => {
      authApi.register.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockAuthResponse), 100))
      );
      usersApi.getMe.mockResolvedValue(mockUser);

      const user = userEvent.setup();
      render(<RegisterPage />);

      // Select role
      const sugarDaddyButton = screen.getByText('Sugar Daddy').closest('button');
      await user.click(sugarDaddyButton!);

      // Fill form
      await user.type(screen.getByLabelText(/暱稱/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/密碼/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /建立帳號/i });
      await user.click(submitButton);

      // Should show loading text
      expect(screen.getByRole('button', { name: /建立中/i })).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(authApi.register).toHaveBeenCalled();
      });
    });
  });

  describe('Failed Registration', () => {
    it('should show error message on registration failure', async () => {
      const errorMessage = 'Email 已被使用';
      authApi.register.mockRejectedValue(new Error(errorMessage));

      const user = userEvent.setup();
      render(<RegisterPage />);

      // Select role
      const sugarDaddyButton = screen.getByText('Sugar Daddy').closest('button');
      await user.click(sugarDaddyButton!);

      // Fill form
      await user.type(screen.getByLabelText(/暱稱/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/密碼/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /建立帳號/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should show default error message on unknown error', async () => {
      authApi.register.mockRejectedValue(new Error());

      const user = userEvent.setup();
      render(<RegisterPage />);

      // Select role
      const sugarDaddyButton = screen.getByText('Sugar Daddy').closest('button');
      await user.click(sugarDaddyButton!);

      // Fill form
      await user.type(screen.getByLabelText(/暱稱/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/密碼/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /建立帳號/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/註冊失敗，請稍後再試/i)).toBeInTheDocument();
      });
    });

    it('should clear error message on new submission', async () => {
      authApi.register.mockRejectedValueOnce(new Error('First error'));
      
      const user = userEvent.setup();
      render(<RegisterPage />);

      // Select role
      const sugarDaddyButton = screen.getByText('Sugar Daddy').closest('button');
      await user.click(sugarDaddyButton!);

      // Fill form
      await user.type(screen.getByLabelText(/暱稱/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/密碼/i), 'wrong');

      const submitButton = screen.getByRole('button', { name: /建立帳號/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      // Second attempt - error should be cleared
      authApi.register.mockResolvedValue(mockAuthResponse);
      usersApi.getMe.mockResolvedValue(mockUser);

      const passwordInput = screen.getByLabelText(/密碼/i);
      await user.clear(passwordInput);
      await user.type(passwordInput, 'correctpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<RegisterPage />);

      const displayNameInput = screen.getByLabelText(/暱稱/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/密碼/i);

      expect(displayNameInput).toHaveAttribute('type', 'text');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(displayNameInput).toHaveAttribute('autocomplete', 'nickname');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
    });

    it('should have proper button roles', () => {
      render(<RegisterPage />);

      const submitButton = screen.getByRole('button', { name: /建立帳號/i });
      const loginLink = screen.getByRole('link', { name: /登入/i });

      expect(submitButton).toBeInTheDocument();
      expect(loginLink).toBeInTheDocument();
    });

    it('should have role selection buttons', () => {
      render(<RegisterPage />);

      const sugarDaddyButton = screen.getByText('Sugar Daddy').closest('button');
      const sugarBabyButton = screen.getByText('Sugar Baby').closest('button');

      expect(sugarDaddyButton).toHaveAttribute('type', 'button');
      expect(sugarBabyButton).toHaveAttribute('type', 'button');
    });
  });
});
