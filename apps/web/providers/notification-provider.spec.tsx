/**
 * Notification Provider Test
 * 
 * Tests for the Notification system:
 * - Provider setup
 * - Initial unread count fetch
 * - WebSocket connection
 * - Real-time notification updates
 * - Mark as read functionality
 * - Manual refresh
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationProvider, useNotifications } from './notification-provider';

// Mock dependencies
const mockSocket = {
  connected: false,
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

const mockNotificationsApi = {
  getAll: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
};

const mockUser = {
  id: 'user-123',
  userType: 'sugar_daddy' as const,
  permissionRole: 'user' as const,
  displayName: 'Test User',
  bio: 'Test bio',
  avatarUrl: null,
  verificationStatus: 'verified' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock modules
jest.mock('../lib/socket', () => ({
  getNotificationSocket: () => mockSocket,
}));

jest.mock('../lib/api', () => ({
  notificationsApi: mockNotificationsApi,
}));

jest.mock('./auth-provider', () => ({
  useAuth: jest.fn(() => ({ user: mockUser })),
}));

// Test component
function TestComponent() {
  const { unreadCount, refresh } = useNotifications();

  return (
    <div>
      <div data-testid="unread-count">{unreadCount}</div>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}

describe('NotificationProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket.connected = false;
    mockNotificationsApi.getAll.mockResolvedValue([]);
  });

  describe('Provider Setup', () => {
    it('should render children', () => {
      render(
        <NotificationProvider>
          <div>Test Content</div>
        </NotificationProvider>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should provide unreadCount', () => {
      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
    });
  });

  describe('Initial Fetch', () => {
    it('should fetch initial unread count', async () => {
      const mockNotifications = [
        { id: '1', read: false },
        { id: '2', read: false },
        { id: '3', read: true },
      ];

      mockNotificationsApi.getAll.mockResolvedValue(mockNotifications);

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(mockNotificationsApi.getAll).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId('unread-count')).toHaveTextContent('2');
      });
    });

    it('should handle fetch error gracefully', async () => {
      mockNotificationsApi.getAll.mockRejectedValue(
        new Error('Network error')
      );

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(mockNotificationsApi.getAll).toHaveBeenCalled();
      });

      // Should remain at 0 on error
      expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
    });

    it('should not fetch when user is not logged in', async () => {
      const { useAuth } = require('./auth-provider');
      useAuth.mockReturnValue({ user: null });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockNotificationsApi.getAll).not.toHaveBeenCalled();
    });
  });

  describe('WebSocket Connection', () => {
    it('should connect to WebSocket when user is logged in', async () => {
      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(mockSocket.connect).toHaveBeenCalled();
      });
    });

    it('should emit join event with user ID', async () => {
      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('join', {
          userId: 'user-123',
        });
      });
    });

    it('should register socket event listeners', async () => {
      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith(
          'notification',
          expect.any(Function)
        );
        expect(mockSocket.on).toHaveBeenCalledWith(
          'marked_read',
          expect.any(Function)
        );
        expect(mockSocket.on).toHaveBeenCalledWith(
          'all_marked_read',
          expect.any(Function)
        );
      });
    });

    it('should not connect if already connected', async () => {
      mockSocket.connected = true;

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockSocket.connect).not.toHaveBeenCalled();
    });
  });

  describe('Real-time Notifications', () => {
    it('should increment unread count on new notification', async () => {
      mockNotificationsApi.getAll.mockResolvedValue([]);
      let notificationHandler: (() => void) | undefined;

      mockSocket.on.mockImplementation((event: string, handler: () => void) => {
        if (event === 'notification') {
          notificationHandler = handler;
        }
      });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
      });

      // Simulate receiving a notification
      act(() => {
        notificationHandler?.();
      });

      expect(screen.getByTestId('unread-count')).toHaveTextContent('1');

      // Simulate receiving another notification
      act(() => {
        notificationHandler?.();
      });

      expect(screen.getByTestId('unread-count')).toHaveTextContent('2');
    });

    it('should decrement unread count on marked_read event', async () => {
      mockNotificationsApi.getAll.mockResolvedValue([
        { id: '1', read: false },
        { id: '2', read: false },
      ]);
      let markedReadHandler: (() => void) | undefined;

      mockSocket.on.mockImplementation((event: string, handler: () => void) => {
        if (event === 'marked_read') {
          markedReadHandler = handler;
        }
      });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('unread-count')).toHaveTextContent('2');
      });

      // Simulate marking one as read
      act(() => {
        markedReadHandler?.();
      });

      expect(screen.getByTestId('unread-count')).toHaveTextContent('1');
    });

    it('should not go below zero when marked_read', async () => {
      mockNotificationsApi.getAll.mockResolvedValue([]);
      let markedReadHandler: (() => void) | undefined;

      mockSocket.on.mockImplementation((event: string, handler: () => void) => {
        if (event === 'marked_read') {
          markedReadHandler = handler;
        }
      });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
      });

      // Try to decrement below zero
      act(() => {
        markedReadHandler?.();
      });

      expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
    });

    it('should reset to zero on all_marked_read event', async () => {
      mockNotificationsApi.getAll.mockResolvedValue([
        { id: '1', read: false },
        { id: '2', read: false },
        { id: '3', read: false },
      ]);
      let allMarkedReadHandler: (() => void) | undefined;

      mockSocket.on.mockImplementation((event: string, handler: () => void) => {
        if (event === 'all_marked_read') {
          allMarkedReadHandler = handler;
        }
      });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('unread-count')).toHaveTextContent('3');
      });

      // Simulate marking all as read
      act(() => {
        allMarkedReadHandler?.();
      });

      expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
    });
  });

  describe('Manual Refresh', () => {
    it('should refresh unread count when refresh is called', async () => {
      const user = userEvent.setup();

      mockNotificationsApi.getAll
        .mockResolvedValueOnce([{ id: '1', read: false }])
        .mockResolvedValueOnce([
          { id: '1', read: false },
          { id: '2', read: false },
        ]);

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('unread-count')).toHaveTextContent('1');
      });

      // Click refresh button
      await user.click(screen.getByText('Refresh'));

      await waitFor(() => {
        expect(mockNotificationsApi.getAll).toHaveBeenCalledTimes(2);
        expect(screen.getByTestId('unread-count')).toHaveTextContent('2');
      });
    });

    it('should handle refresh error gracefully', async () => {
      const user = userEvent.setup();

      mockNotificationsApi.getAll
        .mockResolvedValueOnce([{ id: '1', read: false }])
        .mockRejectedValueOnce(new Error('Network error'));

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('unread-count')).toHaveTextContent('1');
      });

      // Click refresh button
      await user.click(screen.getByText('Refresh'));

      await waitFor(() => {
        expect(mockNotificationsApi.getAll).toHaveBeenCalledTimes(2);
      });

      // Count should remain unchanged on error
      expect(screen.getByTestId('unread-count')).toHaveTextContent('1');
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', async () => {
      const { unmount } = render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalled();
      });

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith(
        'notification',
        expect.any(Function)
      );
      expect(mockSocket.off).toHaveBeenCalledWith(
        'marked_read',
        expect.any(Function)
      );
      expect(mockSocket.off).toHaveBeenCalledWith(
        'all_marked_read',
        expect.any(Function)
      );
    });
  });

  describe('Context Hook', () => {
    it('should provide notification context', () => {
      let contextValue: ReturnType<typeof useNotifications> | null = null;

      function TestHook() {
        contextValue = useNotifications();
        return null;
      }

      render(
        <NotificationProvider>
          <TestHook />
        </NotificationProvider>
      );

      expect(contextValue).toHaveProperty('unreadCount');
      expect(contextValue).toHaveProperty('refresh');
      expect(typeof contextValue?.refresh).toBe('function');
    });
  });
});
