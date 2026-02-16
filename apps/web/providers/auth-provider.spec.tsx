import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock api
const mockAuthApi = {
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  refresh: jest.fn(),
};
const mockUsersApi = {
  getMe: jest.fn(),
};
const mockApiClient = {
  setToken: jest.fn(),
  clearToken: jest.fn(),
};
jest.mock('../lib/api', () => ({
  authApi: mockAuthApi,
  usersApi: mockUsersApi,
  apiClient: mockApiClient,
}));

// Mock utils
jest.mock('../lib/utils', () => ({
  isTokenExpired: jest.fn().mockReturnValue(false),
}));

// Mock socket
jest.mock('../lib/socket', () => ({
  disconnectAll: jest.fn(),
}));

import { AuthProvider, useAuth } from './auth-provider';
import { isTokenExpired } from '../lib/utils';
import { disconnectAll } from '../lib/socket';

const mockIsTokenExpired = isTokenExpired as jest.Mock;

const mockUser = {
  id: 'user-1',
  role: 'sugar_daddy',
  displayName: 'Test User',
  bio: 'Bio',
  verificationStatus: 'verified',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAuthResponse = {
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-123',
  expiresIn: 3600,
};

// Track login/register errors for testing
let lastError: Error | null = null;

// Helper component to consume AuthContext
function AuthConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="user">{auth.user?.displayName ?? 'null'}</span>
      <span data-testid="error">{lastError?.message ?? 'none'}</span>
      <button
        onClick={() =>
          auth.login('test@example.com', 'password123').catch((e: Error) => {
            lastError = e;
          })
        }
      >
        Login
      </button>
      <button
        onClick={() =>
          auth
            .register({
              email: 'test@example.com',
              password: 'password123',
              role: 'sugar_daddy',
              displayName: 'New User',
            })
            .catch((e: Error) => {
              lastError = e;
            })
        }
      >
        Register
      </button>
      <button onClick={auth.logout}>Logout</button>
      <button onClick={auth.refreshUser}>RefreshUser</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockIsTokenExpired.mockReturnValue(false);
    lastError = null;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial state', () => {
    it('should set isAuthenticated=false when no tokens stored', async () => {
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
    });

    it('should restore session from valid stored tokens', async () => {
      localStorage.setItem('sd_access_token', 'stored-access');
      localStorage.setItem('sd_refresh_token', 'stored-refresh');
      mockIsTokenExpired.mockReturnValue(false);
      mockUsersApi.getMe.mockResolvedValue(mockUser);

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('Test User');
      expect(mockApiClient.setToken).toHaveBeenCalledWith('stored-access');
    });

    it('should refresh token if access token is expired', async () => {
      localStorage.setItem('sd_access_token', 'expired-access');
      localStorage.setItem('sd_refresh_token', 'stored-refresh');
      mockIsTokenExpired.mockReturnValue(true);
      mockAuthApi.refresh.mockResolvedValue(mockAuthResponse);
      mockUsersApi.getMe.mockResolvedValue(mockUser);

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });
      expect(mockAuthApi.refresh).toHaveBeenCalledWith({
        refreshToken: 'stored-refresh',
      });
      expect(mockApiClient.setToken).toHaveBeenCalledWith('access-token-123');
    });

    it('should clear state if refresh fails on expired token', async () => {
      localStorage.setItem('sd_access_token', 'expired-access');
      localStorage.setItem('sd_refresh_token', 'stored-refresh');
      mockIsTokenExpired.mockReturnValue(true);
      mockAuthApi.refresh.mockRejectedValue(new Error('refresh failed'));

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(mockApiClient.clearToken).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should authenticate user on successful login', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      mockAuthApi.login.mockResolvedValue(mockAuthResponse);
      mockUsersApi.getMe.mockResolvedValue(mockUser);

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });
      expect(mockAuthApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockApiClient.setToken).toHaveBeenCalledWith('access-token-123');
      expect(localStorage.getItem('sd_access_token')).toBe('access-token-123');
      expect(localStorage.getItem('sd_refresh_token')).toBe(
        'refresh-token-123'
      );
    });

    it('should propagate login errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      mockAuthApi.login.mockRejectedValue(new Error('Invalid credentials'));

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(lastError?.message).toBe('Invalid credentials');
      });
      // Should remain unauthenticated
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
    });
  });

  describe('register', () => {
    it('should authenticate user on successful registration', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      mockAuthApi.register.mockResolvedValue(mockAuthResponse);
      mockUsersApi.getMe.mockResolvedValue(mockUser);

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await user.click(screen.getByText('Register'));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });
      expect(mockAuthApi.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        role: 'sugar_daddy',
        displayName: 'New User',
      });
    });
  });

  describe('logout', () => {
    it('should clear auth state and redirect on logout', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      localStorage.setItem('sd_access_token', 'stored-access');
      localStorage.setItem('sd_refresh_token', 'stored-refresh');
      mockUsersApi.getMe.mockResolvedValue(mockUser);
      mockAuthApi.logout.mockResolvedValue(undefined);

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      await user.click(screen.getByText('Logout'));

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(mockApiClient.clearToken).toHaveBeenCalled();
      expect(disconnectAll).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/');
      expect(localStorage.getItem('sd_access_token')).toBeNull();
      expect(localStorage.getItem('sd_refresh_token')).toBeNull();
    });
  });

  describe('refreshUser', () => {
    it('should update user data without changing tokens', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      localStorage.setItem('sd_access_token', 'stored-access');
      localStorage.setItem('sd_refresh_token', 'stored-refresh');
      mockUsersApi.getMe.mockResolvedValueOnce(mockUser);

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      const updatedUser = { ...mockUser, displayName: 'Updated Name' };
      mockUsersApi.getMe.mockResolvedValueOnce(updatedUser);

      await user.click(screen.getByText('RefreshUser'));

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('Updated Name');
      });
    });
  });

  describe('useAuth hook', () => {
    it('should throw when used outside AuthProvider', () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => render(<AuthConsumer />)).toThrow(
        'useAuth must be used inside <AuthProvider>'
      );

      consoleError.mockRestore();
    });
  });
});
