/**
 * Admin Login Page Test
 * 
 * Tests the admin login page functionality including:
 * - Form rendering
 * - Form validation
 * - Successful login
 * - Failed login
 * - Lockout mechanism after multiple failures
 * - Countdown timer during lockout
 */

import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockAuthResponse } from '../../src/test-utils';
import LoginPage from './page';

// Mock the API
jest.mock('@/lib/api', () => ({
  authApi: {
    login: jest.fn(),
  },
}));

// Mock auth utilities
jest.mock('@/lib/auth', () => ({
  setToken: jest.fn(),
  setRefreshToken: jest.fn(),
  getToken: jest.fn(() => null),
}));

const { authApi } = require('@/lib/api');
const { setToken, setRefreshToken } = require('@/lib/auth');

// Mock ApiError
jest.mock('@suggar-daddy/api-client', () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string, public status?: number) {
      super(message);
      this.name = 'ApiError';
    }
    static getMessage(error: unknown, defaultMessage: string): string {
      if (error instanceof Error) return error.message;
      return defaultMessage;
    }
  },
}));

describe('Admin LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render login form with all elements', () => {
      render(<LoginPage />);

      expect(screen.getByRole('heading', { name: /Admin Login/i })).toBeInTheDocument();
      expect(screen.getByText(/Sign in to the management panel/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });

    it('should have email input with correct attributes', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/Email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'admin@example.com');
      expect(emailInput).toBeRequired();
    });

    it('should have password input with correct attributes', () => {
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText(/Password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toBeRequired();
    });
  });

  describe('Form Interaction', () => {
    it('should update input values when typing', async () => {
      const user = userEvent.setup({ delay: null });
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;

      await user.type(emailInput, 'admin@example.com');
      await user.type(passwordInput, 'password123');

      expect(emailInput.value).toBe('admin@example.com');
      expect(passwordInput.value).toBe('password123');
    });
  });

  describe('Successful Login', () => {
    it('should login successfully with valid credentials', async () => {
      authApi.login.mockResolvedValue(mockAuthResponse);

      const user = userEvent.setup({ delay: null });
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      await user.type(emailInput, 'admin@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalledWith({
          email: 'admin@example.com',
          password: 'password123',
        });
      });

      expect(setToken).toHaveBeenCalledWith(mockAuthResponse.accessToken);
      expect(setRefreshToken).toHaveBeenCalledWith(mockAuthResponse.refreshToken);
    });

    it('should show loading state during login', async () => {
      authApi.login.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockAuthResponse), 100))
      );

      const user = userEvent.setup({ delay: null });
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      await user.type(emailInput, 'admin@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(screen.getByRole('button', { name: /Signing in/i })).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should clear login attempts on successful login', async () => {
      authApi.login.mockResolvedValue(mockAuthResponse);
      
      // Set some failed attempts
      localStorage.setItem('admin_login_attempts', '2');

      const user = userEvent.setup({ delay: null });
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      await user.type(emailInput, 'admin@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalled();
      });

      expect(localStorage.getItem('admin_login_attempts')).toBeNull();
      expect(localStorage.getItem('admin_login_lockout')).toBeNull();
    });
  });

  describe('Failed Login', () => {
    it('should show error message on login failure', async () => {
      const errorMessage = 'Invalid credentials';
      authApi.login.mockRejectedValue(new Error(errorMessage));

      const user = userEvent.setup({ delay: null });
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      await user.type(emailInput, 'admin@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('should show remaining attempts after failure', async () => {
      authApi.login.mockRejectedValue(new Error('Invalid credentials'));

      const user = userEvent.setup({ delay: null });
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      await user.type(emailInput, 'admin@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/4 attempts remaining/i)).toBeInTheDocument();
      });
    });

    it('should increment failed attempts counter', async () => {
      authApi.login.mockRejectedValue(new Error('Invalid credentials'));

      const user = userEvent.setup({ delay: null });
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      await user.type(emailInput, 'admin@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(localStorage.getItem('admin_login_attempts')).toBe('1');
      });
    });
  });

  describe('Lockout Mechanism', () => {
    it('should lock account after 5 failed attempts', async () => {
      authApi.login.mockRejectedValue(new Error('Invalid credentials'));

      const user = userEvent.setup({ delay: null });
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      // Fail 5 times
      for (let i = 0; i < 5; i++) {
        await user.clear(emailInput);
        await user.clear(passwordInput);
        await user.type(emailInput, 'admin@example.com');
        await user.type(passwordInput, 'wrongpassword');
        await user.click(submitButton);

        await waitFor(() => {
          expect(authApi.login).toHaveBeenCalledTimes(i + 1);
        });
      }

      await waitFor(() => {
        expect(screen.getByText(/Too many failed attempts/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Account Locked/i })).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should store lockout timestamp in localStorage', async () => {
      authApi.login.mockRejectedValue(new Error('Invalid credentials'));

      const user = userEvent.setup({ delay: null });
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      // Fail 5 times
      for (let i = 0; i < 5; i++) {
        await user.clear(emailInput);
        await user.clear(passwordInput);
        await user.type(emailInput, 'admin@example.com');
        await user.type(passwordInput, 'wrongpassword');
        await user.click(submitButton);

        await waitFor(() => {
          expect(authApi.login).toHaveBeenCalledTimes(i + 1);
        });
      }

      await waitFor(() => {
        const lockout = localStorage.getItem('admin_login_lockout');
        expect(lockout).not.toBeNull();
        expect(parseInt(lockout!, 10)).toBeGreaterThan(Date.now());
      });
    });

    it('should disable form inputs when locked', async () => {
      authApi.login.mockRejectedValue(new Error('Invalid credentials'));

      const user = userEvent.setup({ delay: null });
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      // Fail 5 times
      for (let i = 0; i < 5; i++) {
        await user.clear(emailInput);
        await user.clear(passwordInput);
        await user.type(emailInput, 'admin@example.com');
        await user.type(passwordInput, 'wrongpassword');
        await user.click(submitButton);

        await waitFor(() => {
          expect(authApi.login).toHaveBeenCalledTimes(i + 1);
        });
      }

      await waitFor(() => {
        expect(emailInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
        expect(submitButton).toBeDisabled();
      });
    });

    it('should show countdown timer during lockout', async () => {
      authApi.login.mockRejectedValue(new Error('Invalid credentials'));

      const user = userEvent.setup({ delay: null });
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      // Fail 5 times
      for (let i = 0; i < 5; i++) {
        await user.clear(emailInput);
        await user.clear(passwordInput);
        await user.type(emailInput, 'admin@example.com');
        await user.type(passwordInput, 'wrongpassword');
        await user.click(submitButton);

        await waitFor(() => {
          expect(authApi.login).toHaveBeenCalledTimes(i + 1);
        });
      }

      await waitFor(() => {
        expect(screen.getByText(/Try again in/i)).toBeInTheDocument();
      });

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Countdown should update
      await waitFor(() => {
        const countdownText = screen.getByText(/Try again in/i).textContent;
        expect(countdownText).toMatch(/\d+:\d{2}/);
      });
    });

    it('should restore account access after lockout expires', async () => {
      // Set lockout that expires in 1 second
      const expiredLockout = Date.now() + 1000;
      localStorage.setItem('admin_login_lockout', String(expiredLockout));
      localStorage.setItem('admin_login_attempts', '5');

      render(<LoginPage />);

      // Initially locked
      expect(screen.getByRole('button', { name: /Account Locked/i })).toBeInTheDocument();

      // Fast-forward past lockout
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
      });

      expect(localStorage.getItem('admin_login_lockout')).toBeNull();
      expect(localStorage.getItem('admin_login_attempts')).toBeNull();
    });
  });

  describe('Lockout State Persistence', () => {
    it('should check lockout state on mount', () => {
      const futureTime = Date.now() + 10000;
      localStorage.setItem('admin_login_lockout', String(futureTime));
      localStorage.setItem('admin_login_attempts', '5');

      render(<LoginPage />);

      expect(screen.getByRole('button', { name: /Account Locked/i })).toBeInTheDocument();
    });

    it('should clear expired lockout on mount', () => {
      const pastTime = Date.now() - 10000;
      localStorage.setItem('admin_login_lockout', String(pastTime));
      localStorage.setItem('admin_login_attempts', '5');

      render(<LoginPage />);

      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
      expect(localStorage.getItem('admin_login_lockout')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
    });

    it('should have proper heading hierarchy', () => {
      render(<LoginPage />);

      const heading = screen.getByRole('heading', { name: /Admin Login/i });
      expect(heading).toBeInTheDocument();
    });

    it('should have descriptive button text', () => {
      render(<LoginPage />);

      const button = screen.getByRole('button', { name: /Sign In/i });
      expect(button).toHaveAttribute('type', 'submit');
    });
  });
});
