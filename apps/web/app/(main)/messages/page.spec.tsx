/**
 * Messages Page Test
 * 
 * Tests the messages page functionality including:
 * - Loading state
 * - Empty state
 * - Conversation list display
 * - Conversation interaction
 * - Real-time updates
 * - Error handling
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockUser } from '../../../src/test-utils';
import MessagesPage from './page';

// Mock the API
jest.mock('../../../lib/api', () => ({
  messagingApi: {
    getConversations: jest.fn(),
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
const mockSocket = {
  connected: false,
  connect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

jest.mock('../../../lib/socket', () => ({
  disconnectAll: jest.fn(),
  getMessagingSocket: jest.fn(() => mockSocket),
}));

// Mock utils
jest.mock('../../../lib/utils', () => ({
  timeAgo: (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes} 分鐘前`;
    return '1 小時前';
  },
}));

const { messagingApi, usersApi } = require('../../../lib/api');

const mockConversations = [
  {
    id: 'conv-1',
    participantIds: ['test-user-id', 'user-2'],
    lastMessageAt: new Date('2024-02-14T10:00:00Z'),
  },
  {
    id: 'conv-2',
    participantIds: ['test-user-id', 'user-3'],
    lastMessageAt: new Date('2024-02-14T09:00:00Z'),
  },
  {
    id: 'conv-3',
    participantIds: ['user-4', 'test-user-id'],
    lastMessageAt: new Date('2024-02-14T08:00:00Z'),
  },
];

const mockUserProfiles = {
  'user-2': {
    id: 'user-2',
    displayName: 'Alice',
  },
  'user-3': {
    id: 'user-3',
    displayName: 'Bob',
  },
  'user-4': {
    id: 'user-4',
    displayName: 'Charlie',
  },
};

describe('MessagesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usersApi.getMe.mockResolvedValue(mockUser);
    mockSocket.connected = false;
  });

  describe('Loading State', () => {
    it('should show skeleton while loading', () => {
      messagingApi.getConversations.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<MessagesPage />);

      expect(screen.getByRole('heading', { name: /訊息/i })).toBeInTheDocument();
      
      // Should show multiple skeleton cards
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no conversations', async () => {
      messagingApi.getConversations.mockResolvedValue([]);

      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText(/還沒有任何對話/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/去探索頁面找到你感興趣的人/i)).toBeInTheDocument();
    });
  });

  describe('Conversation List Display', () => {
    beforeEach(() => {
      messagingApi.getConversations.mockResolvedValue(mockConversations);

      usersApi.getProfile.mockImplementation((userId: string) => {
        return Promise.resolve(mockUserProfiles[userId as keyof typeof mockUserProfiles]);
      });
    });

    it('should display all conversations', async () => {
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('should display timestamp for each conversation', async () => {
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      // Check if timestamps are displayed (format depends on timeAgo function)
      const timestamps = screen.getAllByText(/前$/);
      expect(timestamps.length).toBeGreaterThan(0);
    });

    it('should display user initials in avatar', async () => {
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('AL')).toBeInTheDocument(); // Alice's initials
      });
    });

    it('should handle missing user profile gracefully', async () => {
      usersApi.getProfile.mockRejectedValue(new Error('User not found'));

      render(<MessagesPage />);

      await waitFor(() => {
        // Should show default "使用者" text
        const userTexts = screen.getAllByText(/使用者/i);
        expect(userTexts.length).toBe(mockConversations.length);
      });
    });
  });

  describe('Conversation Interaction', () => {
    beforeEach(() => {
      messagingApi.getConversations.mockResolvedValue(mockConversations);

      usersApi.getProfile.mockImplementation((userId: string) => {
        return Promise.resolve(mockUserProfiles[userId as keyof typeof mockUserProfiles]);
      });
    });

    it('should navigate to conversation when clicking', async () => {
      const user = userEvent.setup();
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      const aliceConversation = screen.getByText('Alice').closest('div[class*="cursor-pointer"]');
      await user.click(aliceConversation!);

      // Navigation is handled by Next.js router mock
      // Just verify the click doesn't throw
    });

    it('should show hover effect on conversation cards', async () => {
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      const conversationCards = document.querySelectorAll('[class*="hover:bg-gray-50"]');
      expect(conversationCards.length).toBe(mockConversations.length);
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(() => {
      messagingApi.getConversations.mockResolvedValue(mockConversations);

      usersApi.getProfile.mockImplementation((userId: string) => {
        return Promise.resolve(mockUserProfiles[userId as keyof typeof mockUserProfiles]);
      });
    });

    it('should connect to socket on mount', async () => {
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      expect(mockSocket.connect).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('join', { userId: mockUser.id });
    });

    it('should listen for new messages', async () => {
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      expect(mockSocket.on).toHaveBeenCalledWith('new_message', expect.any(Function));
    });

    it('should refresh conversations on new message', async () => {
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      // Get the new_message handler
      const newMessageHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'new_message'
      )?.[1];

      expect(newMessageHandler).toBeDefined();

      // Trigger new message
      const updatedConversations = [
        {
          ...mockConversations[0],
          lastMessageAt: new Date(),
        },
        ...mockConversations.slice(1),
      ];

      messagingApi.getConversations.mockResolvedValue(updatedConversations);

      await newMessageHandler();

      await waitFor(() => {
        expect(messagingApi.getConversations).toHaveBeenCalledTimes(2);
      });
    });

    it('should cleanup socket listeners on unmount', async () => {
      const { unmount } = render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith('new_message', expect.any(Function));
    });

    it('should not connect socket if already connected', async () => {
      mockSocket.connected = true;

      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      expect(mockSocket.connect).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should show error message on API failure', async () => {
      const errorMessage = '無法載入對話';
      messagingApi.getConversations.mockRejectedValue(new Error(errorMessage));

      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should handle socket errors gracefully', async () => {
      messagingApi.getConversations.mockResolvedValue(mockConversations);

      usersApi.getProfile.mockImplementation((userId: string) => {
        return Promise.resolve(mockUserProfiles[userId as keyof typeof mockUserProfiles]);
      });

      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      // Get the new_message handler
      const newMessageHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'new_message'
      )?.[1];

      // Simulate socket error
      messagingApi.getConversations.mockRejectedValue(new Error('Socket error'));

      await newMessageHandler();

      // Should not crash, error should be silent
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  describe('Name Caching', () => {
    it('should cache user names to avoid duplicate requests', async () => {
      const conversationsWithDuplicate = [
        ...mockConversations,
        {
          id: 'conv-4',
          participantIds: ['test-user-id', 'user-2'], // Same user as conv-1
          lastMessageAt: new Date('2024-02-14T07:00:00Z'),
        },
      ];

      messagingApi.getConversations.mockResolvedValue(conversationsWithDuplicate);

      usersApi.getProfile.mockImplementation((userId: string) => {
        return Promise.resolve(mockUserProfiles[userId as keyof typeof mockUserProfiles]);
      });

      render(<MessagesPage />);

      await waitFor(() => {
        const aliceTexts = screen.getAllByText('Alice');
        expect(aliceTexts.length).toBe(2); // Should appear twice
      });

      // Should only call getProfile once for user-2
      const user2Calls = usersApi.getProfile.mock.calls.filter((call) => call[0] === 'user-2');
      expect(user2Calls.length).toBe(1);
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      messagingApi.getConversations.mockResolvedValue(mockConversations);

      usersApi.getProfile.mockImplementation((userId: string) => {
        return Promise.resolve(mockUserProfiles[userId as keyof typeof mockUserProfiles]);
      });
    });

    it('should have proper heading structure', async () => {
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /訊息/i, level: 1 })).toBeInTheDocument();
      });
    });

    it('should have clickable conversation cards', async () => {
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      const clickableCards = document.querySelectorAll('[class*="cursor-pointer"]');
      expect(clickableCards.length).toBe(mockConversations.length);
    });
  });
});
